<?php
/**
 * Tableau de bord des articles.
 * Les scores SEO et les actions prioritaires sont calculés par assets/dashboard.js
 * (même analyse que dans l'éditeur).
 * @var array $articles
 * @var array $counts  ['published' => n, 'scheduled' => n, 'draft' => n]
 * @var array $ideas   idées d'articles disponibles (clé = numéro de l'idée)
 */
?>
<div class="page-head">
  <div>
    <h1>Articles du blog</h1>
    <p class="text-muted">Rédigez, publiez et améliorez vos articles. Chaque article reçoit une note SEO et une liste d’actions concrètes.</p>
  </div>
  <a class="btn btn--primary" href="/admin/edit.php">
    <svg class="icon" aria-hidden="true"><use href="/icons.svg#i-plus"></use></svg>
    Nouvel article
  </a>
</div>

<ul class="stats" role="list">
  <li class="stat"><span class="stat__value"><?= $counts['published'] ?></span> <span class="stat__label">en ligne</span></li>
  <li class="stat"><span class="stat__value"><?= $counts['scheduled'] ?></span> <span class="stat__label">programmé<?= $counts['scheduled'] > 1 ? 's' : '' ?></span></li>
  <li class="stat"><span class="stat__value"><?= $counts['draft'] ?></span> <span class="stat__label">brouillon<?= $counts['draft'] > 1 ? 's' : '' ?></span></li>
  <li class="stat"><span class="stat__value" data-average-score>–</span> <span class="stat__label">note SEO moyenne</span></li>
</ul>

<section class="panel" aria-labelledby="actions-titre" data-priority-actions hidden>
  <h2 id="actions-titre">Actions prioritaires</h2>
  <p class="text-muted">Les corrections qui feront le plus progresser vos articles en ligne, par ordre d’importance.</p>
  <ol class="priority-list" role="list" data-priority-list></ol>
</section>

<section class="panel" aria-labelledby="liste-titre">
  <h2 id="liste-titre">Tous les articles</h2>
  <?php if (!$articles): ?>
    <p class="empty">Aucun article pour l’instant. <a href="/admin/edit.php">Rédigez le premier</a> ou partez d’une idée ci-dessous.</p>
  <?php else: ?>
    <div class="table-scroll">
      <table class="articles-table">
        <thead>
          <tr>
            <th scope="col">Article</th>
            <th scope="col">État</th>
            <th scope="col">Date</th>
            <th scope="col">Note SEO</th>
            <th scope="col"><span class="visually-hidden">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($articles as $article): ?>
            <?php $state = admin_article_state($article); ?>
            <tr>
              <td data-label="Article">
                <a class="articles-table__title" href="/admin/edit.php?slug=<?= e(rawurlencode($article['slug'])) ?>"><?= e($article['title'] ?: 'Sans titre') ?></a>
                <span class="articles-table__meta"><?= e(article_category_label($article)) ?><?= $article['keyword'] !== '' ? ' · « ' . e($article['keyword']) . ' »' : '' ?></span>
              </td>
              <td data-label="État"><span class="badge badge--<?= $state['key'] ?>"><?= $state['label'] ?></span></td>
              <td data-label="Date"><?= e($article['publishedAt'] !== '' ? format_date_fr($article['publishedAt']) : '—') ?></td>
              <td data-label="Note SEO"><span class="score-pill" data-score-for="<?= e($article['slug']) ?>">…</span></td>
              <td class="articles-table__actions">
                <a class="btn btn--small" href="/admin/edit.php?slug=<?= e(rawurlencode($article['slug'])) ?>">Modifier</a>
                <a class="btn btn--small btn--ghost" href="<?= e(article_url($article)) ?>" target="_blank" rel="noopener"><?= $state['key'] === 'published' ? 'Voir' : 'Aperçu' ?></a>
                <form method="post" action="/admin/api.php?action=delete" data-confirm="Placer « <?= e($article['title']) ?> » dans la corbeille ? Il ne sera plus visible sur le site.">
                  <input type="hidden" name="_csrf" value="<?= e(csrf_token()) ?>" />
                  <input type="hidden" name="slug" value="<?= e($article['slug']) ?>" />
                  <button class="btn btn--small btn--danger" type="submit">Supprimer</button>
                </form>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  <?php endif; ?>
</section>

<?php if ($ideas): ?>
  <section class="panel" aria-labelledby="idees-titre">
    <h2 id="idees-titre">Idées d’articles</h2>
    <p class="text-muted">
      Des sujets recherchés par vos clients, avec leur expression clé et un plan prêt à remplir.
      Pensez à vérifier le volume de recherche de l’expression (Search Console, Keyword Planner) avant de rédiger.
    </p>
    <ul class="ideas" role="list">
      <?php foreach ($ideas as $index => $idea): ?>
        <li class="idea">
          <span class="idea__category"><?= e(BLOG_CATEGORIES[$idea['category']]) ?></span>
          <h3><?= e($idea['title']) ?></h3>
          <p class="idea__keyword">Expression clé : <strong>« <?= e($idea['keyword']) ?> »</strong></p>
          <p class="text-muted"><?= e($idea['why']) ?></p>
          <a class="btn btn--small" href="/admin/edit.php?idee=<?= (int) $index ?>">Rédiger cet article</a>
        </li>
      <?php endforeach; ?>
    </ul>
  </section>
<?php endif; ?>

<details class="panel tips">
  <summary><h2>Les bons réflexes pour un article bien référencé</h2></summary>
  <ol>
    <li><strong>Une expression clé par article</strong>, celle que tape votre client dans Google (« rideau lanière chambre froide »), et jamais la même que celle d’un autre article.</li>
    <li><strong>Titre et description</strong> : l’expression clé au début, un bénéfice concret, une longueur adaptée (l’aperçu Google vous guide).</li>
    <li><strong>Au moins 700 mots</strong> découpés en intertitres (H2) clairs, dont une ou deux questions que se posent vos clients.</li>
    <li><strong>Des liens</strong> vers 2 ou 3 pages du site (produits, guide de pose) et vers le devis : c’est ce qui transforme un lecteur en client.</li>
    <li><strong>Des images</strong> légères avec une description (texte alternatif) : l’éditeur les compresse automatiquement.</li>
    <li><strong>Mettez à jour</strong> vos meilleurs articles chaque année : Google privilégie les contenus récents.</li>
  </ol>
</details>
