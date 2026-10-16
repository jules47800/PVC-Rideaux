<?php
/**
 * Éditeur d'article : contenu en Markdown (barre d'outils), réglages de
 * publication, image de couverture, référencement et vérification SEO en direct.
 * Le formulaire fonctionne sans JavaScript ; assets/editor.js l'enrichit.
 * @var array      $article
 * @var array|null $existing  article enregistré (null pour un nouvel article)
 * @var array      $errors    messages d'erreur par champ
 */
$error = static fn (string $field): string => isset($errors[$field])
    ? '<p class="field-error" id="erreur-' . $field . '">' . e($errors[$field]) . '</p>'
    : '';
$describedBy = static fn (string $field, string $hint = ''): string => trim(($hint !== '' ? $hint : '') . (isset($errors[$field]) ? " erreur-{$field}" : ''));
$state = $existing ? admin_article_state($existing) : null;
$cover = $article['cover'];
?>
<form class="editor" method="post" action="/admin/edit.php" data-editor novalidate>
  <input type="hidden" name="_csrf" value="<?= e(csrf_token()) ?>" />
  <input type="hidden" name="originalSlug" value="<?= e($existing['slug'] ?? '') ?>" data-original-slug />
  <input type="hidden" name="baseUpdatedAt" value="<?= e($existing['updatedAt'] ?? '') ?>" data-base-updated-at />

  <div class="editor-bar">
    <a class="editor-bar__back" href="/admin/">
      <svg class="icon" aria-hidden="true"><use href="/icons.svg#i-arrow-left"></use></svg>
      <span>Articles</span>
    </a>
    <a class="score-pill score-pill--link" href="#seo-titre" data-bar-score title="Note SEO : voir les actions à mener">
      <span class="visually-hidden">Note SEO :</span> <span data-bar-score-value>–</span>
    </a>
    <p class="editor-bar__status" data-save-status role="status">
      <?php if ($state): ?><span class="badge badge--<?= $state['key'] ?>"><?= $state['label'] ?></span><?php endif; ?>
    </p>
    <a class="btn btn--ghost" href="<?= e($existing ? article_url($existing) : '#') ?>" target="_blank" rel="noopener" data-view-link<?= $existing ? '' : ' hidden' ?>>
      <svg class="icon" aria-hidden="true"><use href="/icons.svg#i-eye"></use></svg>
      <span data-view-label><?= $state && $state['key'] === 'published' ? 'Voir sur le site' : 'Aperçu sur le site' ?></span>
    </a>
    <button class="btn btn--primary" type="submit" data-save-button>
      Enregistrer <kbd class="kbd" aria-hidden="true">Ctrl S</kbd>
    </button>
  </div>

  <?php if ($errors): ?>
    <div class="notice notice--error" role="alert" data-form-error>
      <?= e($errors['form'] ?? 'Certains champs sont à corriger :') ?>
      <?php if (!isset($errors['form'])): ?>
        <ul><?php foreach ($errors as $message): ?><li><?= e($message) ?></li><?php endforeach; ?></ul>
      <?php endif; ?>
    </div>
  <?php else: ?>
    <div class="notice notice--error" role="alert" data-form-error hidden></div>
  <?php endif; ?>

  <div class="editor__layout">
    <div class="editor__main">
      <div class="field">
        <label class="visually-hidden" for="title">Titre de l’article</label>
        <textarea class="input input--title" id="title" name="title" rows="1" required maxlength="200"
          placeholder="Titre de l’article" aria-describedby="<?= e($describedBy('title')) ?>"
          data-field="title" data-autosize><?= e($article['title']) ?></textarea>
        <?= $error('title') ?>
      </div>

      <div class="panel md-editor" data-md-editor>
        <div class="md-editor__head">
          <div class="tabs" role="tablist" aria-label="Mode d’édition">
            <button class="tab" type="button" role="tab" id="onglet-ecrire" aria-controls="panneau-ecrire" aria-selected="true" data-tab="write">Écrire</button>
            <button class="tab" type="button" role="tab" id="onglet-apercu" aria-controls="panneau-apercu" aria-selected="false" tabindex="-1" data-tab="preview">Aperçu</button>
          </div>
          <div class="toolbar" role="toolbar" aria-label="Mise en forme" aria-controls="content" data-toolbar>
            <button type="button" class="toolbar__btn" data-md="h2" title="Intertitre (H2)">H2</button>
            <button type="button" class="toolbar__btn" data-md="h3" title="Sous-intertitre (H3)">H3</button>
            <span class="toolbar__sep" aria-hidden="true"></span>
            <button type="button" class="toolbar__btn" data-md="bold" title="Gras (Ctrl B)"><b>G</b><span class="visually-hidden"> Gras</span></button>
            <button type="button" class="toolbar__btn" data-md="italic" title="Italique (Ctrl I)"><i>I</i><span class="visually-hidden"> Italique</span></button>
            <span class="toolbar__sep" aria-hidden="true"></span>
            <button type="button" class="toolbar__btn" data-md="ul" title="Liste à puces">• Liste</button>
            <button type="button" class="toolbar__btn" data-md="ol" title="Liste numérotée">1. Liste</button>
            <button type="button" class="toolbar__btn" data-md="quote" title="Citation ou encadré">« »<span class="visually-hidden"> Citation</span></button>
            <span class="toolbar__sep" aria-hidden="true"></span>
            <button type="button" class="toolbar__btn" data-md="link" title="Lien (Ctrl K)">Lien</button>
            <button type="button" class="toolbar__btn" data-md="image" title="Insérer une image">Image</button>
            <button type="button" class="toolbar__btn toolbar__btn--accent" data-md="devis" title="Encart « Demander un devis »">+ Encart devis</button>
          </div>
        </div>

        <div id="panneau-ecrire" role="tabpanel" aria-labelledby="onglet-ecrire" data-tab-panel="write">
          <label class="visually-hidden" for="content">Contenu de l’article</label>
          <textarea class="md-editor__input" id="content" name="content" rows="24"
            aria-describedby="aide-markdown <?= e($describedBy('content')) ?>" data-field="content"><?= e($article['content']) ?></textarea>
          <?= $error('content') ?>
        </div>
        <div class="md-editor__preview post-content" id="panneau-apercu" role="tabpanel" aria-labelledby="onglet-apercu" tabindex="0" data-tab-panel="preview" hidden></div>

        <p class="md-editor__help" id="aide-markdown">
          <span data-word-count>0 mot</span> ·
          <code>## Intertitre</code> · <code>**gras**</code> · <code>- liste</code> · <code>[texte](/adresse/)</code> ·
          <code>[[devis]]</code> pour un encart devis
        </p>
      </div>

      <section class="panel" aria-labelledby="google-titre">
        <h2 id="google-titre">Apparence dans Google</h2>

        <div class="field">
          <label for="keyword">Expression clé principale</label>
          <input class="input" id="keyword" name="keyword" type="text" maxlength="100"
            placeholder="ex. rideau lanière chambre froide" value="<?= e($article['keyword']) ?>"
            aria-describedby="aide-keyword" data-field="keyword" />
          <p class="field-hint" id="aide-keyword">La recherche Google que cet article doit gagner : 2 à 4 mots, différente pour chaque article.</p>
        </div>

        <div class="serp" aria-label="Aperçu du résultat Google" data-serp>
          <p class="serp__site">
            <img src="/favicon-32.png" width="32" height="32" alt="" />
            <span><strong>IsoRideaux</strong><span class="serp__url" data-serp-url>isorideaux.fr › blog</span></span>
          </p>
          <p class="serp__title" data-serp-title></p>
          <p class="serp__description" data-serp-description></p>
        </div>

        <div class="field">
          <div class="field__label-row">
            <label for="seoTitle">Titre pour Google <span class="text-muted">(facultatif)</span></label>
            <span class="counter" data-counter-for="seoTitle" aria-live="polite"></span>
          </div>
          <input class="input" id="seoTitle" name="seoTitle" type="text" maxlength="200"
            placeholder="Par défaut, le titre de l’article" value="<?= e($article['seoTitle']) ?>"
            aria-describedby="aide-seo-title" data-field="seoTitle" />
          <p class="field-hint" id="aide-seo-title">Idéalement 50 à 60 caractères, l’expression clé au début. « | IsoRideaux » n’est pas ajouté automatiquement.</p>
        </div>

        <div class="field">
          <div class="field__label-row">
            <label for="description">Description pour Google</label>
            <span class="counter" data-counter-for="description" aria-live="polite"></span>
          </div>
          <textarea class="input" id="description" name="description" rows="3" maxlength="400"
            aria-describedby="aide-description" data-field="description"><?= e($article['description']) ?></textarea>
          <p class="field-hint" id="aide-description">120 à 155 caractères : ce que le lecteur va apprendre, avec l’expression clé, et une incitation à cliquer.</p>
        </div>

        <div class="field">
          <label for="slug">Adresse de la page</label>
          <div class="input-prefix">
            <span aria-hidden="true">/blog/</span>
            <input class="input" id="slug" name="slug" type="text" maxlength="80" pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value="<?= e($article['slug']) ?>" aria-describedby="<?= e($describedBy('slug', 'aide-slug')) ?>" data-field="slug" />
          </div>
          <p class="field-hint" id="aide-slug">
            Courte, en minuscules, avec l’expression clé.
            <?php if ($existing && article_is_public($existing)): ?>
              Si vous la changez, l’ancienne adresse redirigera automatiquement vers la nouvelle.
            <?php else: ?>
              Remplie automatiquement d’après le titre.
            <?php endif; ?>
          </p>
          <?= $error('slug') ?>
        </div>
      </section>

      <section class="panel" aria-labelledby="resume-titre">
        <h2 id="resume-titre">Résumé <span class="text-muted">(facultatif)</span></h2>
        <div class="field">
          <label class="visually-hidden" for="excerpt">Résumé</label>
          <textarea class="input" id="excerpt" name="excerpt" rows="3" maxlength="400"
            aria-describedby="aide-excerpt" data-field="excerpt"><?= e($article['excerpt']) ?></textarea>
          <p class="field-hint" id="aide-excerpt">Affiché sur les cartes d’articles. Sinon, le début de l’article est utilisé.</p>
        </div>
      </section>
    </div>

    <aside class="editor__side">
      <section class="panel" aria-labelledby="publication-titre">
        <h2 id="publication-titre">Publication</h2>
        <fieldset class="segmented">
          <legend class="visually-hidden">État</legend>
          <label><input type="radio" name="status" value="draft"<?= $article['status'] === 'draft' ? ' checked' : '' ?> data-field="status" /> <span>Brouillon</span></label>
          <label><input type="radio" name="status" value="published"<?= $article['status'] === 'published' ? ' checked' : '' ?> data-field="status" /> <span>Publié</span></label>
        </fieldset>

        <div class="field">
          <label for="publishedAt">Date de publication</label>
          <input class="input" id="publishedAt" name="publishedAt" type="datetime-local"
            value="<?= e(admin_datetime_local($article['publishedAt'])) ?>"
            aria-describedby="<?= e($describedBy('publishedAt', 'aide-date')) ?>" data-field="publishedAt" />
          <p class="field-hint" id="aide-date">Vide : date du jour à la publication. Une date future programme l’article.</p>
          <?= $error('publishedAt') ?>
        </div>

        <div class="field">
          <label for="category">Catégorie</label>
          <select class="input" id="category" name="category" data-field="category">
            <?php foreach (BLOG_CATEGORIES as $value => $label): ?>
              <option value="<?= e($value) ?>"<?= $article['category'] === $value ? ' selected' : '' ?>><?= e($label) ?></option>
            <?php endforeach; ?>
          </select>
        </div>
      </section>

      <section class="panel" aria-labelledby="couverture-titre">
        <h2 id="couverture-titre">Image de couverture</h2>
        <div class="cover-picker" data-cover>
          <img class="cover-picker__image" src="<?= e($cover['src']) ?>" alt="" data-cover-image<?= $cover['src'] === '' ? ' hidden' : '' ?> />
          <p class="cover-picker__empty" data-cover-empty<?= $cover['src'] !== '' ? ' hidden' : '' ?>>Aucune image</p>
          <input type="hidden" name="coverSrc" value="<?= e($cover['src']) ?>" data-field="coverSrc" />
          <div class="cluster">
            <label class="btn btn--small file-button">
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-cover-input />
              <span data-cover-button-label><?= $cover['src'] === '' ? 'Choisir une image' : 'Remplacer' ?></span>
            </label>
            <button class="btn btn--small btn--ghost" type="button" data-cover-remove<?= $cover['src'] === '' ? ' hidden' : '' ?>>Retirer</button>
          </div>
          <p class="field-hint">Format paysage conseillé (1200 × 630 px). Compressée automatiquement.</p>
          <?= $error('coverSrc') ?>
        </div>
        <div class="field">
          <label for="coverAlt">Description de l’image</label>
          <input class="input" id="coverAlt" name="coverAlt" type="text" maxlength="250"
            placeholder="ex. Rideau à lanières dans un entrepôt" value="<?= e($cover['alt']) ?>"
            aria-describedby="aide-alt" data-field="coverAlt" />
          <p class="field-hint" id="aide-alt">Pour les malvoyants et Google : décrivez ce que montre l’image.</p>
        </div>
      </section>

      <section class="panel seo-panel" aria-labelledby="seo-titre" data-seo-panel>
        <div class="seo-panel__head">
          <div class="score-ring" data-score-ring>
            <svg viewBox="0 0 36 36" aria-hidden="true">
              <circle class="score-ring__track" cx="18" cy="18" r="15.9" />
              <circle class="score-ring__value" cx="18" cy="18" r="15.9" pathLength="100" data-score-arc />
            </svg>
            <span class="score-ring__number" data-score-number>–</span>
          </div>
          <div>
            <h2 id="seo-titre">Note SEO</h2>
            <p class="text-muted" data-score-summary>Analyse en cours…</p>
          </div>
        </div>
        <div data-seo-checks aria-live="polite"></div>
        <noscript><p class="text-muted">La vérification SEO nécessite JavaScript.</p></noscript>
      </section>
    </aside>
  </div>
</form>

<dialog class="dialog" data-link-dialog aria-labelledby="lien-titre">
  <form method="dialog" class="stack">
    <h2 id="lien-titre">Insérer un lien</h2>
    <div class="field">
      <label for="link-text">Texte du lien</label>
      <input class="input" id="link-text" type="text" data-link-text />
    </div>
    <div class="field">
      <label for="link-url">Adresse</label>
      <input class="input" id="link-url" type="text" list="link-suggestions" placeholder="/professionnels/… ou https://…" required data-link-url />
      <datalist id="link-suggestions" data-link-suggestions></datalist>
      <p class="field-hint">Commencez à taper pour voir les pages du site et vos articles.</p>
    </div>
    <div class="dialog__actions">
      <button class="btn btn--ghost" type="submit" value="cancel" formnovalidate>Annuler</button>
      <button class="btn btn--primary" type="submit" value="ok">Insérer le lien</button>
    </div>
  </form>
</dialog>

<dialog class="dialog" data-image-dialog aria-labelledby="image-titre">
  <form method="dialog" class="stack">
    <h2 id="image-titre">Insérer une image</h2>
    <div class="field">
      <label for="image-file">Image</label>
      <input class="input" id="image-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required data-image-file />
    </div>
    <div class="field">
      <label for="image-alt">Description de l’image</label>
      <input class="input" id="image-alt" type="text" required placeholder="ex. Lanières PVC nervurées en rouleau" data-image-alt />
    </div>
    <p class="notice notice--error" role="alert" data-image-error hidden></p>
    <div class="dialog__actions">
      <button class="btn btn--ghost" type="submit" value="cancel" formnovalidate>Annuler</button>
      <button class="btn btn--primary" type="submit" value="ok" data-image-submit>Envoyer et insérer</button>
    </div>
  </form>
</dialog>
