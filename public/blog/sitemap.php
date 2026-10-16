<?php

/**
 * Plan du site des articles : /sitemap-blog.xml
 * Référencé par l'index /sitemap.xml généré au build (vite-plugins/sitemap.js).
 */

declare(strict_types=1);

require __DIR__ . '/../lib/bootstrap.php';

$articles = articles_published();
$xml = static fn (string $value): string => htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
$day = static fn (string $iso): string => date('Y-m-d', strtotime($iso) ?: time());

header('Content-Type: application/xml; charset=UTF-8');
header('Cache-Control: public, max-age=3600');

echo '<?xml version="1.0" encoding="UTF-8"?>', "\n";
?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc><?= $xml(absolute_url('/blog/')) ?></loc>
<?php if ($articles): ?>
    <lastmod><?= $day($articles[0]['publishedAt']) ?></lastmod>
<?php endif; ?>
  </url>
<?php foreach ($articles as $article): ?>
  <url>
    <loc><?= $xml(absolute_url(article_url($article))) ?></loc>
    <lastmod><?= $day($article['updatedAt'] ?: $article['publishedAt']) ?></lastmod>
  </url>
<?php endforeach; ?>
</urlset>
