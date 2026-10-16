<?php

/**
 * Réception des formulaires IsoRideaux (contact & devis) et envoi par e-mail.
 *
 * - Requiert PHP 8.1+ avec l'extension mbstring (standard en mutualisé).
 * - Répond en JSON si la requête le demande (envoi via fetch), sinon redirige
 *   vers la page de remerciement (envoi classique, sans JavaScript).
 * - Protections : champ piège, délai minimal de remplissage, limitation par IP,
 *   liste blanche des champs et des valeurs, en-têtes d'e-mail non injectables.
 *
 * Les libellés ci-dessous doivent rester alignés avec
 * src/scripts/data/catalogue.js et les formulaires HTML.
 */

declare(strict_types=1);

date_default_timezone_set('Europe/Paris');

const FORM_TYPES = ['contact', 'devis'];

/** Champs acceptés pour chaque formulaire, dans l'ordre d'affichage de l'e-mail. */
const FORM_FIELDS = [
    'contact' => ['profile', 'subject', 'name', 'company', 'email', 'phone', 'message', 'consent'],
    'devis' => [
        'profile', 'product',
        'width', 'height', 'quantity',
        'strip_length', 'strip_count', 'hanging_plates',
        'roll_length', 'roll_count',
        'rail_length', 'plate_count',
        'pvc_format', 'pvc_type', 'overlap', 'red_borders',
        'name', 'company', 'email', 'phone', 'postal_code', 'message', 'consent',
    ],
];

const FIELD_LABELS = [
    'profile' => 'Profil',
    'subject' => 'Objet',
    'product' => 'Produit',
    'width' => 'Largeur (mm)',
    'height' => 'Hauteur (mm)',
    'quantity' => 'Nombre de rideaux',
    'strip_length' => 'Longueur des lanières (mm)',
    'strip_count' => 'Nombre de lanières',
    'hanging_plates' => 'Plaques de suspension',
    'roll_length' => 'Longueur du rouleau',
    'roll_count' => 'Nombre de rouleaux',
    'rail_length' => 'Longueur de rail (mm)',
    'plate_count' => 'Plaques de suspension (nombre)',
    'pvc_format' => 'Format des lanières',
    'pvc_type' => 'Matière',
    'overlap' => 'Chevauchement',
    'red_borders' => 'Bordures rouges',
    'name' => 'Nom',
    'company' => 'Société',
    'email' => 'E-mail',
    'phone' => 'Téléphone',
    'postal_code' => 'Code postal',
    'message' => 'Message',
];

/** Valeurs autorisées pour les champs à choix, avec leur libellé lisible. */
const OPTION_LABELS = [
    'profile' => ['pro' => 'Professionnel', 'particulier' => 'Particulier'],
    'subject' => [
        'information' => 'Demande d’information / conseil',
        'commande' => 'Suivi de commande',
        'sav' => 'Pièce de rechange / SAV',
        'autre' => 'Autre demande',
    ],
    'product' => [
        'kit' => 'Kit rideau à lanières',
        'chambre-froide' => 'Chambre froide / meuble réfrigéré',
        'soudure' => 'Rideau de soudure',
        'lanieres' => 'Lanières de remplacement',
        'rouleaux' => 'Rouleaux PVC',
        'rail' => 'Rail & accessoires',
    ],
    'pvc_format' => ['200x2' => '200 × 2 mm', '300x2' => '300 × 2 mm', '300x3' => '300 × 3 mm', '400x4' => '400 × 4 mm'],
    'pvc_type' => [
        'standard' => 'Standard transparent',
        'antistatique' => 'Antistatique',
        'congelateur' => 'Congélateur (polaire)',
        'translucide' => 'Translucide',
        'nervure' => 'Nervuré',
        'nervure-congelateur' => 'Nervuré congélateur',
        'soudure' => 'Soudure',
        'occultant' => 'Occultant noir',
    ],
    'hanging_plates' => ['oui' => 'Avec plaques', 'non' => 'Lanières seules'],
    'roll_length' => ['25' => '25 m', '50' => '50 m'],
    'overlap' => ['maximum' => 'Maximum', 'minimum' => 'Minimum'],
    'red_borders' => ['oui' => 'Oui', 'non' => 'Non'],
];

/** Champs numériques entiers : [minimum, maximum]. */
const INTEGER_RANGES = [
    'width' => [300, 20000],
    'height' => [300, 8000],
    'quantity' => [1, 99],
    'strip_length' => [100, 8000],
    'strip_count' => [1, 500],
    'roll_count' => [1, 200],
    'rail_length' => [100, 50000],
    'plate_count' => [0, 2000],
];

/** Champs de configuration propres à chaque produit (formulaire de devis). */
const PRODUCT_FIELDS = [
    'kit' => ['width', 'height', 'quantity', 'pvc_format', 'pvc_type', 'overlap', 'red_borders'],
    'chambre-froide' => ['width', 'height', 'quantity', 'pvc_format', 'pvc_type', 'overlap', 'red_borders'],
    'soudure' => ['width', 'height', 'quantity', 'pvc_format', 'pvc_type', 'overlap', 'red_borders'],
    'lanieres' => ['strip_length', 'strip_count', 'hanging_plates', 'pvc_format', 'pvc_type'],
    'rouleaux' => ['roll_length', 'roll_count', 'pvc_format', 'pvc_type'],
    'rail' => ['rail_length', 'plate_count'],
];

/** Champs de configuration facultatifs (ils ont une valeur par défaut ou sont optionnels). */
const OPTIONAL_PRODUCT_FIELDS = ['overlap', 'red_borders', 'hanging_plates', 'plate_count'];

/** Champs communs à toutes les demandes de devis. */
const QUOTE_COMMON_FIELDS = ['profile', 'product', 'name', 'company', 'email', 'phone', 'postal_code', 'message', 'consent'];

const MAX_TEXT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 3000;

$config = require __DIR__ . '/config.php';

main($config);

/* -------------------------------------------------------------------------- */

function main(array $config): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        header('Allow: POST');
        respond(405, false, 'Méthode non autorisée.');
    }

    $formType = is_string($_POST['form_type'] ?? null) ? $_POST['form_type'] : '';
    if (!in_array($formType, FORM_TYPES, true)) {
        respond(400, false, 'Formulaire inconnu.');
    }

    // Robot probable : on simule un succès pour ne pas l'aider à s'adapter.
    if (looksLikeSpam($_POST, $config)) {
        respond(200, true, null, [], $formType, $config);
    }

    if (isRateLimited($config)) {
        respond(429, false, 'Merci de patienter quelques secondes avant un nouvel envoi.', [], $formType);
    }

    $data = collectFields($_POST, FORM_FIELDS[$formType]);
    if ($formType === 'devis') {
        $data = keepProductFields($data);
    }
    $errors = validate($data, $formType);

    if ($errors !== []) {
        respond(422, false, 'Certains champs sont à corriger.', $errors, $formType);
    }

    if (!sendMail($data, $formType, $config)) {
        respond(500, false, 'L’envoi de votre demande a échoué. Merci de réessayer ou de nous appeler.', [], $formType);
    }

    respond(200, true, null, [], $formType, $config);
}

/* -------------------------------------------------------------------------- */
/* Anti-abus                                                                  */
/* -------------------------------------------------------------------------- */

function looksLikeSpam(array $input, array $config): bool
{
    if (trim((string) ($input['website'] ?? '')) !== '') {
        return true;
    }

    $startedAt = $input['started_at'] ?? '';
    if (is_string($startedAt) && ctype_digit($startedAt)) {
        return (time() - (int) $startedAt) < (int) $config['min_fill_seconds'];
    }

    return false;
}

function isRateLimited(array $config): bool
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'inconnue';
    $file = sys_get_temp_dir() . '/isorideaux-form-' . hash('sha256', $ip . __DIR__);

    if (is_file($file) && (time() - (int) filemtime($file)) < (int) $config['rate_limit_seconds']) {
        return true;
    }

    @touch($file);
    return false;
}

/* -------------------------------------------------------------------------- */
/* Lecture & validation                                                       */
/* -------------------------------------------------------------------------- */

/** Ne conserve que les champs attendus, nettoyés. */
function collectFields(array $input, array $allowed): array
{
    $data = [];

    foreach ($allowed as $name) {
        $value = $input[$name] ?? '';
        if (!is_string($value)) {
            continue;
        }

        $value = $name === 'message' ? cleanMultiline($value) : cleanLine($value);
        if ($value !== '') {
            $data[$name] = $value;
        }
    }

    return $data;
}

/**
 * Devis : ne garde que les champs utiles au produit choisi. Sans JavaScript,
 * tous les blocs du formulaire sont envoyés ; on écarte ici les autres.
 */
function keepProductFields(array $data): array
{
    $relevant = [...QUOTE_COMMON_FIELDS, ...(PRODUCT_FIELDS[$data['product'] ?? ''] ?? [])];
    return array_intersect_key($data, array_flip($relevant));
}

/** Texte sur une ligne : sans caractères de contrôle (ni retours à la ligne). */
function cleanLine(string $value): string
{
    $value = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $value) ?? '';
    return mb_substr(trim($value), 0, MAX_TEXT_LENGTH);
}

/** Texte multiligne : retours à la ligne conservés, autres contrôles retirés. */
function cleanMultiline(string $value): string
{
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    $value = preg_replace('/[\x00-\x08\x0B-\x1F\x7F]+/u', '', $value) ?? '';
    return mb_substr(trim($value), 0, MAX_MESSAGE_LENGTH);
}

/** Renvoie les erreurs sous la forme [champ => message]. */
function validate(array $data, string $formType): array
{
    $errors = [];
    $required = ['profile', 'name', 'email', 'consent'];

    if ($formType === 'contact') {
        $required = [...$required, 'subject', 'message'];
    } else {
        $productFields = PRODUCT_FIELDS[$data['product'] ?? ''] ?? [];
        $required = [...$required, 'product', 'postal_code', ...array_diff($productFields, OPTIONAL_PRODUCT_FIELDS)];
        if (($data['profile'] ?? '') === 'pro') {
            $required[] = 'company';
        }
    }

    foreach ($required as $name) {
        if (!isset($data[$name])) {
            $errors[$name] = $name === 'consent'
                ? 'Merci de cocher cette case pour continuer.'
                : 'Ce champ est obligatoire.';
        }
    }

    foreach ($data as $name => $value) {
        if (isset($errors[$name])) {
            continue;
        }

        if (isset(OPTION_LABELS[$name]) && !isset(OPTION_LABELS[$name][$value])) {
            $errors[$name] = 'Choix invalide.';
        } elseif (isset(INTEGER_RANGES[$name])) {
            [$min, $max] = INTEGER_RANGES[$name];
            $number = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => $min, 'max_range' => $max]]);
            if ($number === false) {
                $errors[$name] = sprintf('Valeur attendue entre %d et %d.', $min, $max);
            }
        }
    }

    if (isset($data['name']) && mb_strlen($data['name']) < 2) {
        $errors['name'] = 'Merci d’indiquer votre nom.';
    }
    if (isset($data['email']) && filter_var($data['email'], FILTER_VALIDATE_EMAIL) === false) {
        $errors['email'] = 'Adresse e-mail invalide.';
    }
    if (isset($data['postal_code']) && preg_match('/^\d{5}$/', $data['postal_code']) !== 1) {
        $errors['postal_code'] = 'Indiquez un code postal à 5 chiffres.';
    }
    if (isset($data['consent']) && $data['consent'] !== 'oui') {
        $errors['consent'] = 'Merci de cocher cette case pour continuer.';
    }

    return $errors;
}

/* -------------------------------------------------------------------------- */
/* E-mail                                                                     */
/* -------------------------------------------------------------------------- */

function sendMail(array $data, string $formType, array $config): bool
{
    $lines = [];
    foreach ($data as $name => $value) {
        if ($name === 'message' || $name === 'consent') {
            continue;
        }
        $lines[] = sprintf('%s : %s', FIELD_LABELS[$name], OPTION_LABELS[$name][$value] ?? $value);
    }

    $intro = $formType === 'devis'
        ? 'Nouvelle demande de devis reçue depuis le site.'
        : 'Nouveau message reçu depuis le formulaire de contact.';

    $body = implode("\n", [
        $intro,
        '',
        ...$lines,
        '',
        'Message :',
        $data['message'] ?? '(aucun)',
        '',
        '—',
        sprintf('Envoyé le %s — consentement RGPD donné.', date('d/m/Y à H:i')),
    ]);

    $topic = $formType === 'devis'
        ? 'Demande de devis — ' . (OPTION_LABELS['product'][$data['product']] ?? '')
        : 'Contact — ' . (OPTION_LABELS['subject'][$data['subject']] ?? '');
    $profile = OPTION_LABELS['profile'][$data['profile']] ?? '';
    $subject = sprintf('[%s] %s (%s)', $config['site_name'], $topic, $profile);

    // L'adresse a été validée par filter_var : aucun retour à la ligne possible.
    $headers = [
        'From' => sprintf('%s <%s>', mb_encode_mimeheader($config['site_name'], 'UTF-8', 'B'), $config['sender']),
        'Reply-To' => $data['email'],
        'MIME-Version' => '1.0',
        'Content-Type' => 'text/plain; charset=UTF-8',
        'Content-Transfer-Encoding' => '8bit',
    ];

    return mail($config['recipient'], mb_encode_mimeheader($subject, 'UTF-8', 'B'), $body, $headers);
}

/* -------------------------------------------------------------------------- */
/* Réponse                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Termine la requête : JSON pour les envois via fetch, sinon redirection
 * (succès) ou page d'erreur minimale (échec).
 */
function respond(
    int $status,
    bool $ok,
    ?string $message = null,
    array $errors = [],
    string $formType = '',
    array $config = [],
): never {
    $wantsJson = str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');

    if ($wantsJson) {
        http_response_code($status);
        header('Content-Type: application/json; charset=UTF-8');
        header('Cache-Control: no-store');
        echo json_encode(
            array_filter(['ok' => $ok, 'message' => $message, 'errors' => $errors ?: null], static fn ($v) => $v !== null),
            JSON_UNESCAPED_UNICODE,
        );
        exit;
    }

    if ($ok) {
        $target = ($config['success_url'] ?? '/merci/') . ($formType !== '' ? '?demande=' . $formType : '');
        header('Location: ' . $target, true, 303);
        exit;
    }

    http_response_code($status);
    header('Content-Type: text/html; charset=UTF-8');
    $back = $formType === 'devis' ? '/devis/' : '/contact/';
    $details = $errors !== []
        ? '<ul>' . implode('', array_map(
            static fn ($field, $error) => sprintf('<li>%s : %s</li>', e(FIELD_LABELS[$field] ?? $field), e($error)),
            array_keys($errors),
            $errors,
        )) . '</ul>'
        : '';

    printf(
        '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<meta name="robots" content="noindex"><title>Demande non envoyée</title></head>'
        . '<body style="font-family:system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1rem;line-height:1.6">'
        . '<h1>Votre demande n’a pas pu être envoyée</h1><p>%s</p>%s<p><a href="%s">Revenir au formulaire</a></p></body></html>',
        e($message ?? 'Une erreur est survenue.'),
        $details,
        e($back),
    );
    exit;
}

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}
