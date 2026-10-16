<?php

/**
 * Petites fonctions utilitaires partagées.
 */

declare(strict_types=1);

const FRENCH_MONTHS = [
    1 => 'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

const SLUG_TRANSLITERATION = [
    'à' => 'a', 'â' => 'a', 'ä' => 'a', 'á' => 'a', 'ã' => 'a', 'å' => 'a',
    'ç' => 'c', 'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
    'î' => 'i', 'ï' => 'i', 'í' => 'i', 'ì' => 'i', 'ñ' => 'n',
    'ô' => 'o', 'ö' => 'o', 'ó' => 'o', 'ò' => 'o', 'õ' => 'o',
    'ù' => 'u', 'û' => 'u', 'ü' => 'u', 'ú' => 'u', 'ÿ' => 'y', 'ý' => 'y',
    'œ' => 'oe', 'æ' => 'ae',
];

/** Échappement HTML (texte et attributs). */
function e(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

/** « Rideau PVC : l'été ! » → « rideau-pvc-l-ete » */
function slugify(string $text, int $maxLength = 80): string
{
    $slug = strtr(mb_strtolower($text), SLUG_TRANSLITERATION);
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '';
    $slug = trim($slug, '-');

    if (strlen($slug) > $maxLength) {
        $slug = rtrim(substr($slug, 0, $maxLength), '-');
        $lastDash = strrpos($slug, '-');
        if ($lastDash !== false && $lastDash > $maxLength * 0.6) {
            $slug = substr($slug, 0, $lastDash);
        }
    }

    return $slug;
}

function is_valid_slug(string $slug): bool
{
    return strlen($slug) <= 80 && preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug) === 1;
}

/**
 * Typographie française : espace insécable avant « : », fine insécable avant
 * « ; ? ! » et à l'intérieur des guillemets. Mêmes règles que pour les pages
 * statiques (vite-plugins/html-templates.js).
 */
function french_spacing(string $text): string
{
    $text = str_replace(' :', "\u{00A0}:", $text);
    $text = preg_replace('/ ([;?!»])/u', "\u{202F}$1", $text) ?? $text;
    return str_replace('« ', "«\u{202F}", $text);
}

/** french_spacing() sur les seuls nœuds texte d'un fragment HTML (hors pre, code, script, style). */
function french_spacing_html(string $html): string
{
    return preg_replace_callback(
        '#(<(pre|code|script|style)\b.*?</\2>)|>([^<]+)(?=<)#s',
        static fn (array $match): string => $match[1] !== '' ? $match[1] : '>' . french_spacing($match[3]),
        $html,
    ) ?? $html;
}

/** Date ISO 8601 → « 2 avril 2025 » (sans dépendre de l'extension intl). */
function format_date_fr(string $iso): string
{
    $timestamp = strtotime($iso);
    if ($timestamp === false) {
        return '';
    }
    return sprintf('%d %s %d', (int) date('j', $timestamp), FRENCH_MONTHS[(int) date('n', $timestamp)], (int) date('Y', $timestamp));
}

/** Écriture atomique : le fichier n'est jamais lu à moitié écrit. */
function write_file_atomic(string $path, string $content): void
{
    $directory = dirname($path);
    if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
        throw new RuntimeException("Impossible de créer le dossier {$directory}.");
    }

    $temporary = $path . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (file_put_contents($temporary, $content, LOCK_EX) === false || !rename($temporary, $path)) {
        @unlink($temporary);
        throw new RuntimeException("Impossible d'écrire {$path}.");
    }
}

/** Interdit l'accès web à un dossier de données (Apache / LiteSpeed). */
function protect_directory(string $directory): void
{
    $htaccess = $directory . '/.htaccess';
    if (!is_file($htaccess)) {
        write_file_atomic($htaccess, "# Données de l'espace d'édition : jamais servies directement.\nRequire all denied\n");
    }
}

/** Réponse JSON puis fin du script. */
function json_response(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Rend une vue de lib/views/ avec ses variables et renvoie le HTML. */
function view(string $name, array $variables = []): string
{
    extract($variables, EXTR_SKIP);
    ob_start();
    require __DIR__ . "/views/{$name}.php";
    return (string) ob_get_clean();
}

function is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
}
