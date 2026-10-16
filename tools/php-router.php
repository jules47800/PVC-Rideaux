<?php

/**
 * Routeur du serveur PHP intégré, pour tester le site complet en local
 * (blog, espace d'édition, formulaires) sans Apache :
 *
 *   npm run build && npm run serve:php   →   http://localhost:8000
 *
 * Il reproduit les règles de public/.htaccess utiles en local : dossiers
 * interdits, adresses du blog, redirections 301 (RedirectMatch), page 404 et
 * Content-Security-Policy. Sur l'hébergement, c'est .htaccess qui s'applique :
 * ce fichier n'est jamais envoyé sur le serveur.
 */

declare(strict_types=1);

$root = rtrim($_SERVER['DOCUMENT_ROOT'], '/');
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');
$htaccess = (string) @file_get_contents($root . '/.htaccess');

// Même politique de sécurité qu'en production : un script ou un style en
// ligne interdit se voit tout de suite en local.
if (preg_match('/Content-Security-Policy "([^"]+)"/', $htaccess, $csp)) {
    header('Content-Security-Policy: ' . str_replace('; upgrade-insecure-requests', '', $csp[1]));
}

$deny = static function (): bool {
    http_response_code(403);
    echo '403 – accès interdit';
    return true;
};

$run = static function (string $script, array $query = []) use ($root): bool {
    $_GET = $query + $_GET;
    $_SERVER['SCRIPT_NAME'] = $script;
    $_SERVER['SCRIPT_FILENAME'] = $root . $script;
    chdir(dirname($root . $script));
    require $root . $script;
    return true;
};

// Dossiers et fichiers jamais servis
if (preg_match('#^/(lib|content|content-initial)(/|$)|^/blog/_layout\.html$|^/admin/config\.php$|^/uploads/.*\.(php\d?|phtml|phar)$|/\.ht#', $path)) {
    return $deny();
}

// Blog
if ($path === '/blog/feed.xml') {
    return $run('/blog/feed.php');
}
if ($path === '/sitemap-blog.xml') {
    return $run('/blog/sitemap.php');
}
if (preg_match('#^/blog/([a-z0-9]+(?:-[a-z0-9]+)*)(/?)$#', $path, $match) && !is_dir($root . $path)) {
    if ($match[2] === '') {
        header('Location: ' . $path . '/', true, 301);
        return true;
    }
    return $run('/blog/article.php', ['slug' => $match[1]]);
}

// Redirections 301 des anciennes adresses (lignes RedirectMatch de .htaccess)
preg_match_all('/^\s*RedirectMatch\s+301\s+(\S+)\s+(\S+)/m', $htaccess, $redirects, PREG_SET_ORDER);
foreach ($redirects as [, $pattern, $target]) {
    if (preg_match('#' . str_replace('#', '\#', $pattern) . '#', $path)) {
        header('Location: ' . $target, true, 301);
        return true;
    }
}

// Fichiers et dossiers existants : servis normalement par le serveur intégré
$file = $root . $path;
if (is_file($file) || (is_dir($file) && (is_file("{$file}/index.html") || is_file("{$file}/index.php")))) {
    return false;
}

http_response_code(404);
readfile($root . '/404.html');
return true;
