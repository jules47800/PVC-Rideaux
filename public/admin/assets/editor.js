/**
 * Éditeur d'article (admin/edit.php).
 *
 * - Barre d'outils Markdown, raccourcis clavier (Ctrl B / I / K, Ctrl S pour enregistrer).
 * - Onglets Écrire / Aperçu (aperçu rendu par le serveur, identique au site).
 * - Adresse (slug) générée d'après le titre tant qu'elle n'a pas été modifiée à la main.
 * - Aperçu du résultat Google et compteurs de caractères.
 * - Vérification SEO en direct (seo-checker.js).
 * - Envoi des images (couverture et illustrations), compressées par le serveur.
 * - Enregistrement sans recharger la page, avertissement en cas de modifications non enregistrées.
 */
import { fetchArticles, renderPreview, request, uploadImage } from './api.js';
import { FORMATS, insertBlock, insertLink } from './markdown-toolbar.js';
import { SITE_PAGES, analyzeArticle, slugify } from './seo-checker.js';
import { renderSeoPanel } from './seo-panel.js';

const ANALYSIS_DELAY = 250;
const SERP_TITLE_MAX = 60;
const SERP_DESCRIPTION_MAX = 158;
const COUNTER_LIMITS = {
  seoTitle: { min: 30, max: 60 },
  description: { min: 120, max: 158 },
};

const form = document.querySelector('[data-editor]');
if (form) initEditor(form);

function initEditor(form) {
  const field = (name) => form.elements.namedItem(name);
  const content = field('content');
  const statusText = form.querySelector('[data-save-status]');
  const saveButton = form.querySelector('[data-save-button]');
  const formError = form.querySelector('[data-form-error]');
  const seoPanel = form.querySelector('[data-seo-panel]');

  let otherArticles = [];
  let dirty = false;
  let saving = false;
  let analysisTimer;

  /* ------------------------------------------------------------------
     Données du formulaire
     ------------------------------------------------------------------ */

  const readArticle = () => ({
    title: field('title').value,
    slug: field('slug').value || slugify(field('title').value),
    seoTitle: field('seoTitle').value,
    description: field('description').value,
    keyword: field('keyword').value,
    excerpt: field('excerpt').value,
    content: content.value,
    status: form.querySelector('[name="status"]:checked')?.value ?? 'draft',
    updatedAt: form.querySelector('[data-base-updated-at]').value,
    cover: { src: field('coverSrc').value, alt: field('coverAlt').value },
  });

  /* ------------------------------------------------------------------
     Adresse automatique d'après le titre
     ------------------------------------------------------------------ */

  const slugInput = field('slug');
  const isNewArticle = form.querySelector('[data-original-slug]').value === '';
  let slugIsAuto =
    isNewArticle && (slugInput.value === '' || slugInput.value === slugify(field('title').value));
  const syncSlug = () => {
    if (slugIsAuto) slugInput.value = slugify(field('title').value);
  };

  field('title').addEventListener('input', syncSlug);
  syncSlug(); // article créé depuis une idée : titre déjà rempli

  // Titre sur plusieurs lignes si besoin, mais sans retour à la ligne saisi.
  const titleField = field('title');
  const autosizeTitle = () => {
    titleField.style.height = 'auto';
    titleField.style.height = `${titleField.scrollHeight}px`;
  };
  titleField.addEventListener('input', autosizeTitle);
  titleField.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') event.preventDefault();
  });
  window.addEventListener('resize', autosizeTitle);
  autosizeTitle();
  slugInput.addEventListener('input', () => {
    slugIsAuto = slugInput.value === '';
  });
  slugInput.addEventListener('change', () => {
    slugInput.value = slugify(slugInput.value);
  });

  /* ------------------------------------------------------------------
     Aperçu Google, compteurs, nombre de mots
     ------------------------------------------------------------------ */

  const truncate = (text, max) =>
    text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

  function updateSerp(article) {
    const serp = form.querySelector('[data-serp]');
    const title = article.seoTitle || article.title || 'Titre de l’article';
    const fallback =
      article.excerpt ||
      article.content
        .replace(/[#*_>[\]()!`-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const description = article.description || fallback || 'Description de l’article…';
    serp.querySelector('[data-serp-title]').textContent = truncate(title, SERP_TITLE_MAX);
    serp.querySelector('[data-serp-description]').textContent = truncate(
      description,
      SERP_DESCRIPTION_MAX,
    );
    serp.querySelector('[data-serp-url]').textContent = ` › blog › ${article.slug || '…'}`;
    serp.classList.toggle('serp--placeholder-description', !article.description);
  }

  function updateCounters(article) {
    Object.entries(COUNTER_LIMITS).forEach(([name, { min, max }]) => {
      const counter = form.querySelector(`[data-counter-for="${name}"]`);
      const length = (
        name === 'seoTitle' ? article.seoTitle || article.title : article[name]
      ).trim().length;
      counter.textContent = `${length} / ${max}`;
      counter.dataset.state =
        length === 0 ? 'empty' : length < min ? 'short' : length > max ? 'long' : 'ok';
    });
  }

  function updateWordCount(wordCount) {
    form.querySelector('[data-word-count]').textContent =
      `${wordCount} mot${wordCount > 1 ? 's' : ''}`;
  }

  /* ------------------------------------------------------------------
     Vérification SEO
     ------------------------------------------------------------------ */

  function refresh() {
    const article = readArticle();
    const result = analyzeArticle(article, { otherArticles });
    renderSeoPanel(seoPanel, result);
    const barScore = form.querySelector('[data-bar-score]');
    barScore.dataset.level = result.level.key;
    barScore.querySelector('[data-bar-score-value]').textContent = `${result.score}/100`;
    updateSerp(article);
    updateCounters(article);
    updateWordCount(result.wordCount);
  }

  const scheduleRefresh = () => {
    clearTimeout(analysisTimer);
    analysisTimer = setTimeout(refresh, ANALYSIS_DELAY);
  };

  form.addEventListener('input', () => {
    dirty = true;
    scheduleRefresh();
  });
  form.addEventListener('change', scheduleRefresh);

  /* ------------------------------------------------------------------
     Barre d'outils et raccourcis
     ------------------------------------------------------------------ */

  const linkDialog = document.querySelector('[data-link-dialog]');
  const imageDialog = document.querySelector('[data-image-dialog]');

  form.querySelector('[data-toolbar]').addEventListener('click', (event) => {
    const button = event.target.closest('[data-md]');
    if (!button) return;
    const action = button.dataset.md;
    if (action === 'link') openLinkDialog();
    else if (action === 'image') openImageDialog();
    else FORMATS[action]?.(content);
  });

  content.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const shortcuts = {
      b: () => FORMATS.bold(content),
      i: () => FORMATS.italic(content),
      k: () => openLinkDialog(),
    };
    const shortcut = shortcuts[event.key.toLowerCase()];
    if (shortcut) {
      event.preventDefault();
      shortcut();
    }
  });

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      save();
    }
  });

  /* — Fenêtre « Insérer un lien » — */

  let linkRange = { start: 0, end: 0 };

  function openLinkDialog({ url = '', label = '' } = {}) {
    linkRange = { start: content.selectionStart, end: content.selectionEnd };
    const selected = content.value.slice(linkRange.start, linkRange.end);
    linkDialog.querySelector('[data-link-text]').value = selected || label;
    linkDialog.querySelector('[data-link-url]').value = url;
    linkDialog.returnValue = '';
    linkDialog.showModal();
    linkDialog.querySelector(selected || label ? '[data-link-url]' : '[data-link-text]').focus();
  }

  function fillLinkSuggestions() {
    const options = [
      ...SITE_PAGES.map((page) => ({ url: page.url, label: page.label })),
      ...otherArticles
        .filter((article) => article.state === 'published')
        .map((article) => ({ url: article.url, label: `Article : ${article.title}` })),
    ].map(({ url, label }) =>
      Object.assign(document.createElement('option'), { value: url, label }),
    );
    linkDialog.querySelector('[data-link-suggestions]').replaceChildren(...options);
  }

  linkDialog.addEventListener('close', () => {
    if (linkDialog.returnValue !== 'ok') return;
    const url = linkDialog.querySelector('[data-link-url]').value.trim();
    if (!url) return;
    insertLink(content, {
      text: linkDialog.querySelector('[data-link-text]').value.trim(),
      url,
      ...linkRange,
    });
  });

  // Liens suggérés par la vérification SEO
  seoPanel.addEventListener('click', (event) => {
    const button = event.target.closest('[data-insert-link]');
    if (button) openLinkDialog({ url: button.dataset.insertLink, label: button.dataset.linkLabel });
  });

  /* — Fenêtre « Insérer une image » — */

  let imageRange = { start: 0, end: 0 };
  const imageForm = imageDialog.querySelector('form');
  const imageError = imageDialog.querySelector('[data-image-error]');

  function openImageDialog() {
    imageRange = { start: content.selectionStart, end: content.selectionEnd };
    imageForm.reset();
    imageError.hidden = true;
    imageDialog.showModal();
  }

  imageForm.addEventListener('submit', async (event) => {
    if (event.submitter?.value !== 'ok') return;
    event.preventDefault();
    if (!imageForm.reportValidity()) return;

    const submit = imageDialog.querySelector('[data-image-submit]');
    const file = imageDialog.querySelector('[data-image-file]').files[0];
    const alt = imageDialog.querySelector('[data-image-alt]').value.trim().replace(/[[\]]/g, '');
    submit.disabled = true;
    submit.textContent = 'Envoi en cours…';
    try {
      const { url } = await uploadImage(file);
      imageDialog.close();
      insertBlock(content, `![${alt}](${url})`, imageRange);
    } catch (error) {
      imageError.textContent = error.message;
      imageError.hidden = false;
    } finally {
      submit.disabled = false;
      submit.textContent = 'Envoyer et insérer';
    }
  });

  /* ------------------------------------------------------------------
     Onglets Écrire / Aperçu
     ------------------------------------------------------------------ */

  const tabs = [...form.querySelectorAll('[data-tab]')];
  const panels = Object.fromEntries(
    [...form.querySelectorAll('[data-tab-panel]')].map((panel) => [panel.dataset.tabPanel, panel]),
  );

  async function selectTab(name) {
    tabs.forEach((tab) => {
      const selected = tab.dataset.tab === name;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    Object.entries(panels).forEach(([key, panel]) => {
      panel.hidden = key !== name;
    });
    form.querySelector('[data-toolbar]').hidden = name !== 'write';

    if (name === 'preview') {
      const preview = panels.preview;
      preview.replaceChildren(
        Object.assign(document.createElement('p'), {
          className: 'text-muted',
          textContent: 'Chargement de l’aperçu…',
        }),
      );
      try {
        preview.innerHTML =
          (await renderPreview(content.value)) ||
          '<p class="text-muted">Rien à afficher pour l’instant.</p>';
      } catch (error) {
        preview.replaceChildren(
          Object.assign(document.createElement('p'), {
            className: 'field-error',
            textContent: error.message,
          }),
        );
      }
    }
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab.dataset.tab));
    tab.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      const next =
        tabs[(index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      next.focus();
      selectTab(next.dataset.tab);
    });
  });

  /* ------------------------------------------------------------------
     Image de couverture
     ------------------------------------------------------------------ */

  const cover = form.querySelector('[data-cover]');
  const coverInput = cover.querySelector('[data-cover-input]');

  function setCover(src) {
    field('coverSrc').value = src;
    const image = cover.querySelector('[data-cover-image]');
    image.src = src;
    image.hidden = !src;
    cover.querySelector('[data-cover-empty]').hidden = Boolean(src);
    cover.querySelector('[data-cover-remove]').hidden = !src;
    cover.querySelector('[data-cover-button-label]').textContent = src
      ? 'Remplacer'
      : 'Choisir une image';
    dirty = true;
    scheduleRefresh();
  }

  coverInput.addEventListener('change', async () => {
    const file = coverInput.files[0];
    if (!file) return;
    const label = cover.querySelector('[data-cover-button-label]');
    label.textContent = 'Envoi en cours…';
    cover.setAttribute('aria-busy', 'true');
    try {
      const { url } = await uploadImage(file);
      setCover(url);
      if (!field('coverAlt').value) field('coverAlt').focus();
    } catch (error) {
      showStatus(error.message, 'error');
      label.textContent = field('coverSrc').value ? 'Remplacer' : 'Choisir une image';
    } finally {
      cover.removeAttribute('aria-busy');
      coverInput.value = '';
    }
  });

  cover.querySelector('[data-cover-remove]').addEventListener('click', () => setCover(''));

  /* ------------------------------------------------------------------
     Enregistrement
     ------------------------------------------------------------------ */

  function showStatus(message, type = 'info') {
    statusText.replaceChildren(
      Object.assign(document.createElement('span'), {
        className: `save-status save-status--${type}`,
        textContent: message,
      }),
    );
  }

  function clearErrors() {
    form.querySelectorAll('.field-error[data-client]').forEach((node) => node.remove());
    form.querySelectorAll('[aria-invalid]').forEach((node) => node.removeAttribute('aria-invalid'));
    formError.hidden = true;
  }

  function showErrors(errors, message) {
    formError.textContent = message;
    formError.hidden = false;
    Object.entries(errors).forEach(([name, text]) => {
      const input = field(name);
      if (!(input instanceof HTMLElement)) return;
      input.setAttribute('aria-invalid', 'true');
      const error = Object.assign(document.createElement('p'), {
        className: 'field-error',
        textContent: text,
      });
      error.dataset.client = '';
      input.closest('.field, .cover-picker, [data-tab-panel]')?.append(error);
    });
    formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function applySavedArticle(article) {
    form.querySelector('[data-original-slug]').value = article.slug;
    form.querySelector('[data-base-updated-at]').value = article.updatedAt;
    slugInput.value = article.slug;
    slugIsAuto = false;

    const viewLink = form.querySelector('[data-view-link]');
    viewLink.href = article.url;
    viewLink.hidden = false;
    viewLink.querySelector('[data-view-label]').textContent =
      article.state === 'published' ? 'Voir sur le site' : 'Aperçu sur le site';

    const editUrl = `/admin/edit.php?slug=${encodeURIComponent(article.slug)}`;
    if (window.location.pathname + window.location.search !== editUrl) {
      window.history.replaceState(null, '', editUrl);
      // Le nouvel article existe désormais : « Nouvel article » n'est plus la page courante.
      document.querySelector('.admin-nav [aria-current]')?.removeAttribute('aria-current');
    }
  }

  async function save() {
    if (saving) return;
    saving = true;
    clearErrors();
    saveButton.disabled = true;
    showStatus('Enregistrement…');

    try {
      const data = await request(form.action, { method: 'POST', body: new FormData(form) });
      applySavedArticle(data.article);
      dirty = false;
      const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      showStatus(`${data.message} (${time})`, 'success');
      refresh();
    } catch (error) {
      showStatus('Non enregistré', 'error');
      showErrors(error.data?.errors ?? {}, error.message);
    } finally {
      saving = false;
      saveButton.disabled = false;
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    save();
  });

  window.addEventListener('beforeunload', (event) => {
    if (dirty) event.preventDefault();
  });

  /* ------------------------------------------------------------------
     Démarrage
     ------------------------------------------------------------------ */

  refresh();
  fetchArticles()
    .then((articles) => {
      const originalSlug = form.querySelector('[data-original-slug]').value;
      otherArticles = articles.filter((article) => article.slug !== originalSlug);
      fillLinkSuggestions();
      refresh();
    })
    .catch((error) => showStatus(error.message, 'error'));
}
