<?php
/**
 * Page d'un article.
 * @var array  $article
 * @var string $contentHtml
 * @var array  $headings   intertitres H2 pour le sommaire
 * @var array  $related    articles liés
 * @var bool   $isPreview  aperçu d'un brouillon (connecté à l'espace d'édition)
 */
$cover = article_cover($article);
$updated = $article['updatedAt'] !== '' && substr($article['updatedAt'], 0, 10) > substr($article['publishedAt'], 0, 10);
?>
<?php if ($isPreview): ?>
  <div class="post-preview-banner" role="status">
    Aperçu : cet article n’est pas encore visible du public.
    <a href="/admin/edit.php?slug=<?= e($article['slug']) ?>">Revenir à l’édition</a>
  </div>
<?php endif; ?>

<article class="post">
  <header class="page-hero post-header">
    <div class="container">
      <nav class="breadcrumb" aria-label="Fil d’Ariane">
        <ol>
          <li><a href="/">Accueil</a></li>
          <li><a href="/blog/">Blog</a></li>
          <li><a href="/blog/?categorie=<?= e($article['category']) ?>"><?= e(article_category_label($article)) ?></a></li>
        </ol>
      </nav>
      <h1 class="post-title"><?= e($article['title']) ?></h1>
      <p class="post-meta">
        <span class="post-chip"><?= e(article_category_label($article)) ?></span>
        <span>Publié le <time datetime="<?= e($article['publishedAt']) ?>"><?= e(format_date_fr($article['publishedAt'] ?: date(DATE_ATOM))) ?></time></span>
        <?php if ($updated): ?>
          <span aria-hidden="true">·</span>
          <span>Mis à jour le <time datetime="<?= e($article['updatedAt']) ?>"><?= e(format_date_fr($article['updatedAt'])) ?></time></span>
        <?php endif; ?>
        <span aria-hidden="true">·</span>
        <span><?= article_reading_time($article) ?> min de lecture</span>
      </p>
    </div>
  </header>

  <div class="container post-layout">
    <div class="post-main">
      <?php if ($cover): ?>
        <figure class="post-cover">
          <img src="<?= e($cover['src']) ?>" alt="<?= e($cover['alt']) ?>" width="1200" height="630" fetchpriority="high" />
        </figure>
      <?php endif; ?>

      <div class="post-content">
        <?= $contentHtml ?>
      </div>

      <aside class="post-cta" aria-labelledby="post-cta-titre">
        <div>
          <h2 id="post-cta-titre">Un projet de rideau à lanières ?</h2>
          <p>Indiquez la taille de votre ouverture : devis gratuit et sans engagement sous 24 h.</p>
        </div>
        <form class="cta-quote" action="/devis/" method="get" aria-label="Estimer mon rideau">
          <div class="cta-quote__fields">
            <label>
              <span class="visually-hidden">Largeur en millimètres</span>
              <span class="input-unit">
                <input class="input" name="largeur" type="number" inputmode="numeric" min="300" max="20000" placeholder="Largeur" />
                <span class="input-unit__suffix" aria-hidden="true">mm</span>
              </span>
            </label>
            <label>
              <span class="visually-hidden">Hauteur en millimètres</span>
              <span class="input-unit">
                <input class="input" name="hauteur" type="number" inputmode="numeric" min="300" max="8000" placeholder="Hauteur" />
                <span class="input-unit__suffix" aria-hidden="true">mm</span>
              </span>
            </label>
          </div>
          <?php if (in_array($article['category'], ['professionnels', 'particuliers'], true)): ?>
            <input type="hidden" name="profil" value="<?= $article['category'] === 'professionnels' ? 'pro' : 'particulier' ?>" />
          <?php endif; ?>
          <button class="btn btn--primary btn--lg" type="submit">
            Mon devis
            <svg class="icon icon-arrow" aria-hidden="true"><use href="/icons.svg#i-arrow-right"></use></svg>
          </button>
        </form>
      </aside>
    </div>

    <?php if (count($headings) >= 3): ?>
      <aside class="post-aside">
        <nav class="post-toc" aria-labelledby="sommaire-titre">
          <p class="post-toc__title" id="sommaire-titre">Sommaire</p>
          <ol role="list">
            <?php foreach ($headings as $heading): ?>
              <li><a href="#<?= e($heading['id']) ?>"><?= e($heading['text']) ?></a></li>
            <?php endforeach; ?>
          </ol>
        </nav>
      </aside>
    <?php endif; ?>
  </div>
</article>

<?php if ($related): ?>
  <section class="section section--alt" aria-labelledby="lies-titre">
    <div class="container">
      <div class="section-head section-head--split">
        <div>
          <p class="eyebrow">À lire aussi</p>
          <h2 id="lies-titre">Articles liés</h2>
        </div>
        <a class="btn btn--secondary" href="/blog/">Tous les articles</a>
      </div>
      <div class="post-grid">
        <?php foreach ($related as $item): ?>
          <?= view('post-card', ['article' => $item, 'headingTag' => 'h3']) ?>
        <?php endforeach; ?>
      </div>
    </div>
  </section>
<?php endif; ?>
