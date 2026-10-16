<?php

/**
 * Flux RSS 2.0 des 20 derniers articles : /blog/feed.xml
 */

declare(strict_types=1);

require __DIR__ . '/../lib/bootstrap.php';

const FEED_SIZE = 20;

$articles = array_slice(articles_published(), 0, FEED_SIZE);
$xml = static fn (string $value): string => htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
$rfc822 = static fn (string $iso): string => date(DATE_RSS, strtotime($iso) ?: time());

header('Content-Type: application/rss+xml; charset=UTF-8');
header('Cache-Control: public, max-age=900');

echo '<?xml version="1.0" encoding="UTF-8"?>', "\n";
?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Blog IsoRideaux</title>
    <link><?= $xml(absolute_url('/blog/')) ?></link>
    <atom:link href="<?= $xml(absolute_url('/blog/feed.xml')) ?>" rel="self" type="application/rss+xml" />
    <description>Conseils et guides pour choisir, poser et entretenir vos rideaux à lanières PVC.</description>
    <language>fr-FR</language>
<?php if ($articles): ?>
    <lastBuildDate><?= $rfc822($articles[0]['updatedAt'] ?: $articles[0]['publishedAt']) ?></lastBuildDate>
<?php endif; ?>
<?php foreach ($articles as $article): ?>
    <item>
      <title><?= $xml($article['title']) ?></title>
      <link><?= $xml(absolute_url(article_url($article))) ?></link>
      <guid isPermaLink="true"><?= $xml(absolute_url(article_url($article))) ?></guid>
      <pubDate><?= $rfc822($article['publishedAt']) ?></pubDate>
      <category><?= $xml(article_category_label($article)) ?></category>
      <description><?= $xml(article_description($article)) ?></description>
    </item>
<?php endforeach; ?>
  </channel>
</rss>
