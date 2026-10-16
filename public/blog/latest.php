<?php

/**
 * Derniers articles en JSON, pour le bloc « Nos derniers conseils » des pages
 * statiques (src/scripts/modules/latest-posts.js).
 *
 *   /blog/latest.php?limit=3&categorie=particuliers
 *
 * Si la catégorie demandée n'a pas assez d'articles, la liste est complétée
 * par les plus récents des autres catégories.
 */

declare(strict_types=1);

require __DIR__ . '/../lib/bootstrap.php';

const LATEST_MAX = 6;

$limit = min(LATEST_MAX, max(1, (int) ($_GET['limit'] ?? 3)));
$category = is_string($_GET['categorie'] ?? null) && isset(BLOG_CATEGORIES[$_GET['categorie']]) ? $_GET['categorie'] : null;

$articles = articles_published();
if ($category !== null) {
    // Tri stable : la catégorie demandée d'abord, chaque groupe restant du plus récent au plus ancien.
    usort($articles, static fn (array $a, array $b): int => ($b['category'] === $category) <=> ($a['category'] === $category));
}

header('Cache-Control: public, max-age=600');
header('Content-Type: application/json; charset=UTF-8');
echo json_encode(
    ['articles' => array_map('article_summary', array_slice($articles, 0, $limit))],
    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
);
