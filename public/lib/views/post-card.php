<?php
/**
 * Carte d'article (liste du blog, articles liés).
 * @var array  $article
 * @var string $headingTag  h2 ou h3 selon le contexte
 */
$cover = article_cover($article);
?>
<article class="post-card">
  <?php if ($cover): ?>
    <div class="post-card__media">
      <img src="<?= e($cover['src']) ?>" alt="" width="1200" height="630" loading="lazy" decoding="async" />
    </div>
  <?php endif; ?>
  <div class="post-card__body">
    <p class="post-meta">
      <span class="post-chip"><?= e(article_category_label($article)) ?></span>
      <time datetime="<?= e($article['publishedAt']) ?>"><?= e(format_date_fr($article['publishedAt'])) ?></time>
      <span aria-hidden="true">·</span>
      <span><?= article_reading_time($article) ?> min de lecture</span>
    </p>
    <<?= $headingTag ?> class="post-card__title"><a href="<?= e(article_url($article)) ?>"><?= e($article['title']) ?></a></<?= $headingTag ?>>
    <p class="post-card__excerpt"><?= e(article_excerpt($article, 150)) ?></p>
    <span class="link-arrow">Lire l’article <svg class="icon" aria-hidden="true"><use href="/icons.svg#i-arrow-right"></use></svg></span>
  </div>
</article>
