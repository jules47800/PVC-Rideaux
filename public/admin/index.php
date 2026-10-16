<?php

/**
 * Tableau de bord : liste des articles, score SEO de chacun (calculé par
 * assets/dashboard.js), actions prioritaires et idées d'articles.
 */

declare(strict_types=1);

require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/admin.php';

admin_require_login();

$articles = articles_all();
$counts = ['published' => 0, 'scheduled' => 0, 'draft' => 0];
foreach ($articles as $article) {
    $counts[admin_article_state($article)['key']]++;
}

admin_render('Articles', 'dashboard', [
    'articles' => $articles,
    'counts' => $counts,
    'ideas' => article_ideas_available($articles),
    'pageScript' => 'dashboard.js',
]);
