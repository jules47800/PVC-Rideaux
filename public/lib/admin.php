<?php

/**
 * Fonctions propres à l'espace d'édition : rendu des pages, messages,
 * lecture et validation du formulaire d'article.
 */

declare(strict_types=1);

require_once __DIR__ . '/images.php';
require_once __DIR__ . '/ideas.php';

const ADMIN_MAX_CONTENT_LENGTH = 200000;

/** Affiche une page de l'espace d'édition (lib/views/admin/<view>.php) puis termine le script. */
function admin_render(string $title, string $view, array $variables = [], int $status = 200): never
{
    $body = view("admin/{$view}", $variables);

    http_response_code($status);
    header('Content-Type: text/html; charset=UTF-8');
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex, nofollow');
    echo view('admin/layout', [
        'title' => $title,
        'user' => admin_user(),
        'body' => $body,
        'flash' => admin_flash_take(),
        'pageScript' => $variables['pageScript'] ?? null,
    ]);
    exit;
}

/** Requête envoyée par le JavaScript de l'espace d'édition (réponse JSON attendue). */
function admin_wants_json(): bool
{
    return str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');
}

function admin_redirect(string $path): never
{
    header('Location: ' . $path, true, 303);
    exit;
}

/* --- Messages affichés une fois, après une redirection --- */

function admin_flash(string $type, string $message): void
{
    admin_session_start();
    $_SESSION['flash'] = ['type' => $type, 'message' => $message];
}

function admin_flash_take(): ?array
{
    if (session_status() !== PHP_SESSION_ACTIVE || empty($_SESSION['flash'])) {
        return null;
    }
    $flash = $_SESSION['flash'];
    unset($_SESSION['flash']);
    return $flash;
}

/* --- Dates : champ datetime-local (heure de Paris) <-> ISO 8601 --- */

function admin_datetime_local(string $iso): string
{
    $timestamp = $iso !== '' ? strtotime($iso) : false;
    return $timestamp !== false ? date('Y-m-d\TH:i', $timestamp) : '';
}

/* --- Formulaire d'article --- */

/**
 * Construit un article à partir du formulaire d'édition et le valide.
 *
 * @param array      $input    données du formulaire ($_POST)
 * @param array|null $existing article enregistré (modification) ou null (création)
 * @return array{0: array, 1: array<string, string>} [article, messages d'erreur par champ]
 */
function admin_article_from_input(array $input, ?array $existing): array
{
    $line = static function (string $key, int $maxLength) use ($input): string {
        $value = preg_replace('/\s+/u', ' ', (string) ($input[$key] ?? '')) ?? '';
        return mb_substr(trim($value), 0, $maxLength);
    };

    $errors = [];

    $title = $line('title', 200);
    if ($title === '') {
        $errors['title'] = 'Le titre est obligatoire.';
    }

    $slug = $line('slug', 100);
    if ($slug === '') {
        $slug = slugify($title);
    }
    if (!is_valid_slug($slug) || $slug === '') {
        $errors['slug'] = 'Adresse invalide : lettres minuscules, chiffres et tirets uniquement (80 caractères max.).';
    } elseif ($slug !== ($existing['slug'] ?? null) && article_load($slug) !== null) {
        $errors['slug'] = 'Un autre article utilise déjà cette adresse.';
    }

    $coverSrc = $line('coverSrc', 300);
    if ($coverSrc !== '' && !preg_match('#^/(?!/)[A-Za-z0-9/_.-]+$#', $coverSrc)) {
        $errors['coverSrc'] = 'L’image doit être envoyée sur le site avec le bouton « Choisir une image ».';
    }

    // Une date inchangée à la minute près garde sa valeur d'origine (secondes comprises).
    $publishedAt = '';
    $dateInput = $line('publishedAt', 30);
    if ($existing && $dateInput === admin_datetime_local($existing['publishedAt'])) {
        $publishedAt = $existing['publishedAt'];
    } elseif ($dateInput !== '') {
        $date = DateTimeImmutable::createFromFormat('!Y-m-d\TH:i', $dateInput);
        if ($date === false) {
            $errors['publishedAt'] = 'Date de publication invalide.';
        } else {
            $publishedAt = $date->format(DATE_ATOM);
        }
    }

    $content = str_replace(["\r\n", "\r"], "\n", (string) ($input['content'] ?? ''));
    if (mb_strlen($content) > ADMIN_MAX_CONTENT_LENGTH) {
        $errors['content'] = 'Article trop long.';
    }

    if ($existing && ($input['baseUpdatedAt'] ?? '') !== $existing['updatedAt']) {
        $errors['form'] = 'Cet article a été modifié entre-temps (autre onglet ou autre personne). '
            . 'Copiez votre texte, rechargez la page, puis reportez vos changements.';
    }

    $article = article_normalize([
        'slug' => $slug,
        'title' => $title,
        'seoTitle' => $line('seoTitle', 200),
        'description' => $line('description', 400),
        'keyword' => mb_strtolower($line('keyword', 100)),
        'excerpt' => $line('excerpt', 400),
        'category' => $input['category'] ?? '',
        'cover' => ['src' => $coverSrc, 'alt' => $line('coverAlt', 250)],
        'content' => rtrim($content) . "\n",
        'status' => $input['status'] ?? 'draft',
        'publishedAt' => $publishedAt,
        'updatedAt' => $existing['updatedAt'] ?? '',
        'previousSlugs' => $existing['previousSlugs'] ?? [],
    ]);

    return [$article, $errors];
}

/** Message de confirmation après enregistrement, selon l'état de l'article. */
function admin_saved_message(array $article): string
{
    if ($article['status'] !== 'published') {
        return 'Brouillon enregistré : il n’est pas visible sur le site.';
    }
    if (!article_is_public($article)) {
        return 'Article programmé : il sera en ligne le ' . format_date_fr($article['publishedAt'])
            . ' à ' . date('H:i', (int) strtotime($article['publishedAt'])) . '.';
    }
    return 'Article enregistré et en ligne.';
}

/** État lisible d'un article (tableau de bord). */
function admin_article_state(array $article): array
{
    if ($article['status'] !== 'published') {
        return ['key' => 'draft', 'label' => 'Brouillon'];
    }
    return article_is_public($article)
        ? ['key' => 'published', 'label' => 'En ligne']
        : ['key' => 'scheduled', 'label' => 'Programmé'];
}

/** Données d'un article transmises au JavaScript (vérification SEO, liens internes). */
function admin_article_payload(array $article): array
{
    return $article + [
        'url' => article_url($article),
        'state' => admin_article_state($article)['key'],
    ];
}
