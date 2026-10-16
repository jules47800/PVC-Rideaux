<?php

/**
 * Habillage des pages du blog avec le gabarit généré par Vite (blog/_layout.html).
 *
 * Le gabarit contient l'en-tête, le pied de page, les styles et scripts du
 * site, ainsi que des marqueurs remplacés ici :
 *   %%TITLE%%  %%DESCRIPTION%%  <!--BLOG:HEAD-->  <!--BLOG:MAIN-->
 * et le bandeau devis de bas de page, entre <!--BLOG:CTA--> et <!--/BLOG:CTA-->.
 * L'adresse du site est lue dans la balise canonical du gabarit : aucune
 * configuration à dupliquer côté PHP.
 */

declare(strict_types=1);

const LAYOUT_PATH = '/blog/_layout.html';

function layout_template(): string
{
    static $template = null;
    if ($template === null) {
        $template = is_file(LAYOUT_FILE) ? (string) file_get_contents(LAYOUT_FILE) : '';
        if ($template === '') {
            throw new RuntimeException('Gabarit du blog introuvable : lancez « npm run build » et envoyez dist/.');
        }
    }
    return $template;
}

/** Adresse publique du site, sans slash final (ex. https://www.isorideaux.fr). */
function site_url(): string
{
    static $url = null;
    if ($url === null) {
        preg_match('#<link rel="canonical" href="([^"]+?)' . preg_quote(LAYOUT_PATH, '#') . '"#', layout_template(), $match);
        $url = $match[1] ?? ((is_https() ? 'https://' : 'http://') . ($_SERVER['HTTP_HOST'] ?? 'localhost'));
    }
    return $url;
}

function absolute_url(string $path): string
{
    return preg_match('#^https?://#', $path) ? $path : site_url() . $path;
}

/**
 * Affiche une page complète puis termine le script.
 *
 * @param array{title: string, description: string, path: string, main: string,
 *              head?: string, ogType?: string, image?: ?string, robots?: string,
 *              ctaBand?: bool, status?: int} $page
 *   ctaBand : false retire le bandeau devis (page qui a déjà le sien).
 */
function render_page(array $page): never
{
    $head = $page['head'] ?? '';
    if (!empty($page['robots'])) {
        $head .= '<meta name="robots" content="' . e($page['robots']) . '" />';
    }

    $html = strtr(layout_template(), [
        '%%TITLE%%' => e(french_spacing($page['title'])),
        '%%DESCRIPTION%%' => e($page['description']),
        site_url() . LAYOUT_PATH => e(absolute_url($page['path'])),
        '<!--BLOG:HEAD-->' => $head,
        '<!--BLOG:MAIN-->' => french_spacing_html($page['main']),
    ]);

    if (($page['ctaBand'] ?? true) === false) {
        $html = preg_replace('#\s*<!--BLOG:CTA-->.*?<!--/BLOG:CTA-->#s', '', $html) ?? $html;
    }
    if (!empty($page['ogType'])) {
        $html = str_replace('<meta property="og:type" content="website" />', '<meta property="og:type" content="' . e($page['ogType']) . '" />', $html);
    }
    if (!empty($page['image'])) {
        $html = preg_replace(
            '#<meta property="og:image" content="[^"]*" />\s*<meta property="og:image:width" content="\d+" />\s*<meta property="og:image:height" content="\d+" />#',
            '<meta property="og:image" content="' . e(absolute_url($page['image'])) . '" />',
            $html,
        ) ?? $html;
    }

    http_response_code($page['status'] ?? 200);
    header('Content-Type: text/html; charset=UTF-8');
    if (!preg_grep('/^Cache-Control:/i', headers_list())) {
        // Pages générées à la volée : toujours revalidées, comme les pages HTML statiques.
        header('Cache-Control: no-cache');
    }
    echo $html;
    exit;
}

/** Page 404 du site (générée par Vite), avec le bon code HTTP. */
function render_not_found(): never
{
    http_response_code(404);
    header('Content-Type: text/html; charset=UTF-8');
    readfile(NOT_FOUND_FILE);
    exit;
}

function redirect_permanent(string $path): never
{
    header('Location: ' . $path, true, 301);
    exit;
}
