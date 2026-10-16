<?php

/**
 * Liste des articles du blog : /blog/ (filtre ?categorie=…, pagination ?page=…).
 */

declare(strict_types=1);

require __DIR__ . '/../lib/bootstrap.php';

const POSTS_PER_PAGE = 9;

$category = is_string($_GET['categorie'] ?? null) && isset(BLOG_CATEGORIES[$_GET['categorie']]) ? $_GET['categorie'] : null;
$page = max(1, (int) ($_GET['page'] ?? 1));

$articles = articles_published($category);
$pageCount = max(1, (int) ceil(count($articles) / POSTS_PER_PAGE));
if ($page > $pageCount) {
    render_not_found();
}

$title = $category
    ? BLOG_CATEGORIES[$category] . ' : articles et conseils rideaux PVC | IsoRideaux'
    : 'Blog rideau PVC : conseils et guides pratiques | IsoRideaux';
if ($page > 1) {
    $title = "Page {$page} – {$title}";
}

$query = array_filter(['categorie' => $category, 'page' => $page > 1 ? $page : null]);

render_page([
    'title' => $title,
    'description' => 'Conseils, guides pratiques et actualités IsoRideaux : bien choisir, poser et entretenir vos rideaux à lanières PVC, pour les professionnels comme pour les particuliers.',
    'path' => '/blog/' . ($query ? '?' . http_build_query($query) : ''),
    'head' => '<link rel="alternate" type="application/rss+xml" title="Blog IsoRideaux" href="/blog/feed.xml" />',
    'main' => view('blog-index', [
        'articles' => array_slice($articles, ($page - 1) * POSTS_PER_PAGE, POSTS_PER_PAGE),
        'category' => $category,
        'page' => $page,
        'pageCount' => $pageCount,
    ]),
    // Les listes filtrées dupliquent la liste principale : suivies, pas indexées.
    'robots' => $category ? 'noindex,follow' : '',
]);
