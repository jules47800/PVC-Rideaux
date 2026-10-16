<?php
/**
 * Liste des articles.
 * @var array       $articles     articles de la page courante
 * @var string|null $category     catégorie filtrée
 * @var int         $page
 * @var int         $pageCount
 */
$pageUrl = static function (int $number) use ($category): string {
    $query = array_filter(['categorie' => $category, 'page' => $number > 1 ? $number : null]);
    return '/blog/' . ($query ? '?' . http_build_query($query) : '');
};
?>
<section class="page-hero blog-hero" aria-labelledby="titre-principal">
  <div class="container page-hero__inner">
    <div class="page-hero__content">
      <nav class="breadcrumb" aria-label="Fil d’Ariane">
        <ol itemscope itemtype="https://schema.org/BreadcrumbList">
          <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
            <a itemprop="item" href="/"><span itemprop="name">Accueil</span></a>
            <meta itemprop="position" content="1" />
          </li>
          <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
            <span itemprop="name" aria-current="page">Blog</span>
            <meta itemprop="position" content="2" />
          </li>
        </ol>
      </nav>
      <p class="eyebrow">Conseils &amp; actualités</p>
      <h1 id="titre-principal"><?= $category ? e(BLOG_CATEGORIES[$category]) . ' : nos articles' : 'Le blog IsoRideaux' ?></h1>
      <p class="lead">Choisir, poser et entretenir vos rideaux à lanières PVC : les conseils de notre équipe, pour les professionnels comme pour les particuliers.</p>
      <nav class="blog-filters" aria-label="Catégories d’articles">
        <a class="blog-filter" href="/blog/"<?= $category === null ? ' aria-current="page"' : '' ?>>Tous les articles</a>
        <?php foreach (BLOG_CATEGORIES as $slug => $label): ?>
          <a class="blog-filter" href="/blog/?categorie=<?= e($slug) ?>"<?= $category === $slug ? ' aria-current="page"' : '' ?>><?= e($label) ?></a>
        <?php endforeach; ?>
      </nav>
    </div>
  </div>
</section>

<section class="section section--flush-top" aria-label="Articles">
  <div class="container">
    <?php if (!$articles): ?>
      <p class="blog-empty">Aucun article dans cette catégorie pour le moment. <a href="/blog/">Voir tous les articles</a>.</p>
    <?php else: ?>
      <div class="post-grid">
        <?php foreach ($articles as $article): ?>
          <?= view('post-card', ['article' => $article, 'headingTag' => 'h2']) ?>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>

    <?php if ($pageCount > 1): ?>
      <nav class="pagination" aria-label="Pages d’articles">
        <?php if ($page > 1): ?>
          <a class="btn btn--secondary" href="<?= e($pageUrl($page - 1)) ?>" rel="prev">← Articles plus récents</a>
        <?php endif; ?>
        <span class="pagination__status">Page <?= $page ?> sur <?= $pageCount ?></span>
        <?php if ($page < $pageCount): ?>
          <a class="btn btn--secondary" href="<?= e($pageUrl($page + 1)) ?>" rel="next">Articles plus anciens →</a>
        <?php endif; ?>
      </nav>
    <?php endif; ?>
  </div>
</section>
