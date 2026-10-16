<?php

/**
 * Page d'un article : /blog/<slug>/ (réécrit vers article.php?slug=<slug> par .htaccess).
 *
 * - Ancienne adresse d'un article renommé → redirection 301.
 * - Brouillon ou article programmé → 404 pour le public, aperçu pour l'équipe connectée.
 */

declare(strict_types=1);

require __DIR__ . '/../lib/bootstrap.php';

const RELATED_POSTS = 3;

$slug = is_string($_GET['slug'] ?? null) ? $_GET['slug'] : '';
$article = article_load($slug);

if ($article === null) {
    $renamed = $slug !== '' ? article_find_by_previous_slug($slug) : null;
    if ($renamed !== null && article_is_public($renamed)) {
        redirect_permanent(article_url($renamed));
    }
    render_not_found();
}

$isPreview = !article_is_public($article);
if ($isPreview && admin_user() === null) {
    render_not_found();
}
if ($isPreview) {
    header('Cache-Control: no-store');
}

$contentHtml = markdown_to_html($article['content']);
$cover = article_cover($article);

// Articles liés : même catégorie d'abord, puis les plus récents.
$others = array_filter(articles_published(), static fn (array $item): bool => $item['slug'] !== $article['slug']);
usort($others, static fn (array $a, array $b): int => ($b['category'] === $article['category']) <=> ($a['category'] === $article['category']));
$related = array_slice($others, 0, RELATED_POSTS);

$url = absolute_url(article_url($article));
$structuredData = [
    [
        '@context' => 'https://schema.org',
        '@type' => 'BlogPosting',
        'headline' => $article['title'],
        'description' => article_description($article),
        'mainEntityOfPage' => $url,
        'url' => $url,
        'datePublished' => $article['publishedAt'],
        'dateModified' => $article['updatedAt'] ?: $article['publishedAt'],
        'image' => $cover ? absolute_url($cover['src']) : absolute_url('/og-image.jpg'),
        'articleSection' => article_category_label($article),
        'keywords' => $article['keyword'],
        'wordCount' => str_word_count(strtr(article_plain_text($article), SLUG_TRANSLITERATION)),
        'inLanguage' => 'fr-FR',
        // Même entité que les données structurées de l'accueil (src/index.html).
        'author' => ['@type' => 'Organization', '@id' => site_url() . '/#entreprise', 'name' => 'IsoRideaux', 'url' => site_url() . '/'],
        'publisher' => [
            '@type' => 'Organization',
            '@id' => site_url() . '/#entreprise',
            'name' => 'IsoRideaux',
            'logo' => ['@type' => 'ImageObject', 'url' => absolute_url('/logo-isorideaux.png')],
        ],
    ],
    [
        '@context' => 'https://schema.org',
        '@type' => 'BreadcrumbList',
        'itemListElement' => [
            ['@type' => 'ListItem', 'position' => 1, 'name' => 'Accueil', 'item' => site_url() . '/'],
            ['@type' => 'ListItem', 'position' => 2, 'name' => 'Blog', 'item' => absolute_url('/blog/')],
            ['@type' => 'ListItem', 'position' => 3, 'name' => $article['title'], 'item' => $url],
        ],
    ],
];

$head = '<link rel="alternate" type="application/rss+xml" title="Blog IsoRideaux" href="/blog/feed.xml" />';
foreach ($structuredData as $data) {
    // JSON_HEX_TAG : aucun « </script> » possible dans le bloc.
    $head .= '<script type="application/ld+json">' . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) . '</script>';
}
if ($article['publishedAt'] !== '') {
    $head .= '<meta property="article:published_time" content="' . e($article['publishedAt']) . '" />';
}
if ($article['updatedAt'] !== '') {
    $head .= '<meta property="article:modified_time" content="' . e($article['updatedAt']) . '" />';
}

render_page([
    'title' => article_seo_title($article),
    'description' => article_description($article),
    'path' => article_url($article),
    'head' => $head,
    'main' => view('blog-article', [
        'article' => $article,
        'contentHtml' => $contentHtml,
        'headings' => markdown_headings($contentHtml),
        'related' => $related,
        'isPreview' => $isPreview,
    ]),
    // L'article a son propre encart devis : pas de second bandeau en bas de page.
    'ctaBand' => false,
    'ogType' => 'article',
    'image' => $cover['src'] ?? null,
    'robots' => $isPreview ? 'noindex,nofollow' : '',
]);
