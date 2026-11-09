/**
 * Éditeur d'article (/admin/article/).
 *
 * - Contenu en blocs visuels (blocks.js), enregistré en Markdown ;
 *   raccourcis clavier (Ctrl B / I / K, Ctrl S pour enregistrer).
 * - Onglets Écrire / Aperçu (même rendu que le site : lib/blog/markdown.js).
 * - Adresse (slug) générée d'après le titre tant qu'elle n'a pas été modifiée à la main.
 * - Aperçu du résultat Google et compteurs de caractères.
 * - Vérification SEO en direct (lib/blog/seo-checker.js).
 * - Images (couverture et illustrations) préparées dans le navigateur puis envoyées.
 * - Enregistrement sans recharger la page, suivi de la mise en ligne,
 *   avertissement en cas de modifications non enregistrées.
 */
import { locale } from './i18n.js';
import { ARTICLE_IDEAS, articleFromIdea } from '../../../lib/blog/ideas.js';
import { renderMarkdown } from '../../../lib/blog/markdown.js';
import {
  CATEGORIES,
  STATE_LABELS,
  fromDateTimeLocal,
  normalizeArticle,
  slugify,
  toDateTimeLocal,
} from '../../../lib/blog/model.js';
import { SITE_PAGES, analyzeArticle } from '../../../lib/blog/seo-checker.js';
import { fetchArticles, saveArticle, uploadImage } from './api.js';
import { recordCommit, waitForDeployment } from './deploy.js';
import { createBlockEditor } from './blocks.js';
import { prepareImage } from './image.js';
import { renderSeoPanel } from './seo-panel.js';
import { requireSession } from './session.js';

const ANALYSIS_DELAY = 250;
const SERP_TITLE_MAX = 60;
const SERP_DESCRIPTION_MAX = 158;
const COUNTER_LIMITS = {
  seoTitle: { min: 30, max: 60 },
  description: { min: 120, max: 158 },
};

const form = document.querySelector('[data-editor]');
const field = (name) => form.elements.namedItem(name);
const content = field('content');
const statusText = form.querySelector('[data-save-status]');
const saveButton = form.querySelector('[data-save-button]');
const formError = form.querySelector('[data-form-error]');
const seoPanel = form.querySelector('[data-seo-panel]');
const viewLink = form.querySelector('[data-view-link]');
const slugInput = field('slug');

/** Article tel qu'enregistré (null pour un nouvel article) : adresse, empreinte, état. */
let saved = null;
let otherArticles = [];
let dirty = false;
let saving = false;
let slugIsAuto = false;
let analysisTimer;

/** Images envoyées pendant la session : adresse définitive → aperçu local (avant mise en ligne). */
const localPreviews = new Map();
const previewSrc = (url) => localPreviews.get(url) ?? url;

/* --------------------------------------------------------------------------
   Données du formulaire
   -------------------------------------------------------------------------- */

function fillForm(article) {
  field('title').value = article.title;
  content.value = article.content;
  editor.setMarkdown(article.content);
  field('keyword').value = article.keyword;
  field('seoTitle').value = article.seoTitle;
  field('description').value = article.description;
  field('excerpt').value = article.excerpt;
  slugInput.value = article.slug;
  field('category').value = article.category;
  field('publishedAt').value = toDateTimeLocal(article.publishedAt);
  form.querySelector(`[name="status"][value="${article.status}"]`).checked = true;
  field('coverAlt').value = article.cover.alt;
  setCover(article.cover.src, { silent: true });
}

/** Champs envoyés à l'enregistrement. */
const formValues = () => ({
  title: field('title').value,
  slug: slugInput.value,
  seoTitle: field('seoTitle').value,
  description: field('description').value,
  keyword: field('keyword').value,
  excerpt: field('excerpt').value,
  category: field('category').value,
  status: form.querySelector('[name="status"]:checked').value,
  publishedAt: field('publishedAt').value,
  cover: { src: field('coverSrc').value, alt: field('coverAlt').value },
  content: content.value,
});

/** Article analysé par la vérification SEO. */
const currentArticle = () => ({
  ...formValues(),
  slug: slugInput.value || slugify(field('title').value),
  updatedAt: saved?.updatedAt ?? '',
});

/* --------------------------------------------------------------------------
   Titre et adresse
   -------------------------------------------------------------------------- */

const titleField = field('title');
const autosizeTitle = () => {
  titleField.style.height = 'auto';
  titleField.style.height = `${titleField.scrollHeight}px`;
};
titleField.addEventListener('input', () => {
  if (slugIsAuto) slugInput.value = slugify(titleField.value);
  autosizeTitle();
});
// Titre sur plusieurs lignes si besoin, mais sans retour à la ligne saisi.
titleField.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') event.preventDefault();
});
window.addEventListener('resize', autosizeTitle);

slugInput.addEventListener('input', () => {
  slugIsAuto = slugInput.value === '';
});
slugInput.addEventListener('change', () => {
  slugInput.value = slugify(slugInput.value);
});

/* --------------------------------------------------------------------------
   Aperçu Google, compteurs, vérification SEO
   -------------------------------------------------------------------------- */

const truncate = (text, max) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

function updateSerp(article) {
  const serp = form.querySelector('[data-serp]');
  const title = article.seoTitle || article.title || 'Titre de l’article';
  const fallback =
    article.excerpt ||
    article.content
      .replace(/[#*_>[\]()!`-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  serp.querySelector('[data-serp-title]').textContent = truncate(title, SERP_TITLE_MAX);
  serp.querySelector('[data-serp-description]').textContent = truncate(
    article.description || fallback || 'Description de l’article…',
    SERP_DESCRIPTION_MAX,
  );
  serp.querySelector('[data-serp-url]').textContent = ` › blog › ${article.slug || '…'}`;
  serp.classList.toggle('serp--placeholder-description', !article.description);
}

function updateCounters(article) {
  Object.entries(COUNTER_LIMITS).forEach(([name, { min, max }]) => {
    const counter = form.querySelector(`[data-counter-for="${name}"]`);
    const length = (name === 'seoTitle' ? article.seoTitle || article.title : article[name]).trim()
      .length;
    counter.textContent = `${length} / ${max}`;
    counter.dataset.state =
      length === 0 ? 'empty' : length < min ? 'short' : length > max ? 'long' : 'ok';
  });
}

function refresh() {
  const article = currentArticle();
  const result = analyzeArticle(article, { otherArticles });
  renderSeoPanel(seoPanel, result);

  const barScore = form.querySelector('[data-bar-score]');
  barScore.dataset.level = result.level.key;
  barScore.querySelector('[data-bar-score-value]').textContent = `${result.score}/100`;
  form.querySelector('[data-word-count]').textContent =
    `${result.wordCount} mot${result.wordCount > 1 ? 's' : ''}`;
  updateSerp(article);
  updateCounters(article);
  updateSaveLabel();
  if (dirty) writeBackup();
}

/** Le bouton dit ce qui va se passer : brouillon, publication, programmation, mise à jour. */
function updateSaveLabel() {
  const published = form.querySelector('[name="status"]:checked').value === 'published';
  const date = fromDateTimeLocal(field('publishedAt').value);
  const label = !published
    ? 'Enregistrer le brouillon'
    : date && new Date(date) > new Date()
      ? 'Programmer'
      : saved?.state === 'published'
        ? 'Mettre à jour'
        : 'Publier';
  form.querySelector('[data-save-label]').textContent = label;
}

/* — Copie de secours dans le navigateur (onglet fermé, coupure…) — */

const backupKey = () => `isorideaux-admin:${saved?.slug ?? 'nouvel-article'}`;

function writeBackup() {
  try {
    localStorage.setItem(backupKey(), JSON.stringify({ at: Date.now(), values: formValues() }));
  } catch {
    // Stockage indisponible (navigation privée…) : pas de copie de secours.
  }
}

function readBackup() {
  try {
    return JSON.parse(localStorage.getItem(backupKey()) ?? 'null');
  } catch {
    return null;
  }
}

function clearBackup(key = backupKey()) {
  try {
    localStorage.removeItem(key);
  } catch {
    // idem
  }
}

function offerBackup(article) {
  const backup = readBackup();
  const notice = form.querySelector('[data-backup]');
  if (!backup?.values) return;
  const { values } = backup;
  if (values.content === article.content && values.title === article.title) return clearBackup();

  notice.querySelector('[data-backup-date]').textContent = new Date(backup.at).toLocaleString(
    locale,
    {
      dateStyle: 'long',
      timeStyle: 'short',
    },
  );
  notice.hidden = false;
  notice.querySelector('[data-backup-restore]').onclick = () => {
    fillForm({ ...article, ...values, publishedAt: fromDateTimeLocal(values.publishedAt) ?? '' });
    notice.hidden = true;
    dirty = true;
    refresh();
  };
  notice.querySelector('[data-backup-dismiss]').onclick = () => {
    clearBackup();
    notice.hidden = true;
  };
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

/* --------------------------------------------------------------------------
   Barre d'outils et raccourcis
   -------------------------------------------------------------------------- */

const linkDialog = document.querySelector('[data-link-dialog]');
const blocksRoot = form.querySelector('[data-blocks]');

/** Prépare, envoie et mémorise l'aperçu local d'une image ; renvoie son adresse. */
async function sendImage(file, options) {
  const image = await prepareImage(file, options);
  const { url, commit } = await uploadImage(image.blob, image.name);
  recordCommit(commit);
  localPreviews.set(url, URL.createObjectURL(image.blob));
  return url;
}

const editor = createBlockEditor(blocksRoot, {
  onChange: () => {
    content.value = editor.getMarkdown();
    dirty = true;
    scheduleRefresh();
  },
  sendImage: (file) => sendImage(file),
  previewSrc,
  onError: (message) => showStatus(message, 'error'),
});

// Les boutons de mise en forme ne doivent pas faire perdre la sélection du texte.
const toolbar = form.querySelector('[data-toolbar]');
toolbar.addEventListener('mousedown', (event) => event.preventDefault());
toolbar.addEventListener('click', (event) => {
  const action = event.target.closest('[data-format]')?.dataset.format;
  if (action === 'link') openLinkDialog();
  else if (action) editor.format(action);
});

form.querySelector('[data-block-adder]').addEventListener('click', (event) => {
  const type = event.target.closest('[data-add]')?.dataset.add;
  if (type) editor.add(type);
});

blocksRoot.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openLinkDialog();
  }
});

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    save();
  }
});

/* — Fenêtre « Insérer un lien » — */

function openLinkDialog({ url = '', label = '' } = {}) {
  const selected = editor.rememberSelection();
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
  ].map(({ url, label }) => Object.assign(document.createElement('option'), { value: url, label }));
  linkDialog.querySelector('[data-link-suggestions]').replaceChildren(...options);
}

linkDialog.addEventListener('close', () => {
  if (linkDialog.returnValue !== 'ok') return;
  const url = linkDialog.querySelector('[data-link-url]').value.trim();
  if (!url) return;
  editor.insertLink({ text: linkDialog.querySelector('[data-link-text]').value.trim(), url });
});

// Liens suggérés par la vérification SEO
seoPanel.addEventListener('click', (event) => {
  const button = event.target.closest('[data-insert-link]');
  if (button) openLinkDialog({ url: button.dataset.insertLink, label: button.dataset.linkLabel });
});

/* --------------------------------------------------------------------------
   Onglets Écrire / Aperçu
   -------------------------------------------------------------------------- */

const tabs = [...form.querySelectorAll('[data-tab]')];
const panels = Object.fromEntries(
  [...form.querySelectorAll('[data-tab-panel]')].map((panel) => [panel.dataset.tabPanel, panel]),
);

function selectTab(name) {
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
    // Rendu Markdown sûr (HTML saisi échappé), identique à celui du site.
    panels.preview.innerHTML =
      renderMarkdown(content.value) || '<p class="text-muted">Rien à afficher pour l’instant.</p>';
    panels.preview.querySelectorAll('img').forEach((image) => {
      image.src = previewSrc(image.getAttribute('src'));
    });
  }
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab.dataset.tab));
  tab.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    next.focus();
    selectTab(next.dataset.tab);
  });
});

/* --------------------------------------------------------------------------
   Image de couverture
   -------------------------------------------------------------------------- */

const cover = form.querySelector('[data-cover]');
const coverInput = cover.querySelector('[data-cover-input]');
const coverLabel = cover.querySelector('[data-cover-button-label]');

function setCover(src, { silent = false } = {}) {
  field('coverSrc').value = src;
  const image = cover.querySelector('[data-cover-image]');
  if (src) image.src = previewSrc(src);
  image.hidden = !src;
  cover.querySelector('[data-cover-empty]').hidden = Boolean(src);
  cover.querySelector('[data-cover-remove]').hidden = !src;
  coverLabel.textContent = src ? 'Remplacer' : 'Choisir une image';
  if (!silent) {
    dirty = true;
    scheduleRefresh();
  }
}

coverInput.addEventListener('change', async () => {
  const file = coverInput.files[0];
  if (!file) return;
  coverLabel.textContent = 'Envoi en cours…';
  cover.setAttribute('aria-busy', 'true');
  try {
    setCover(await sendImage(file, { cover: true }));
    if (!field('coverAlt').value) field('coverAlt').focus();
  } catch (error) {
    showStatus(error.message, 'error');
    coverLabel.textContent = field('coverSrc').value ? 'Remplacer' : 'Choisir une image';
  } finally {
    cover.removeAttribute('aria-busy');
    coverInput.value = '';
  }
});

cover.querySelector('[data-cover-remove]').addEventListener('click', () => setCover(''));

/* --------------------------------------------------------------------------
   Enregistrement et mise en ligne
   -------------------------------------------------------------------------- */

function showStatus(message, type = 'info') {
  statusText.replaceChildren(
    Object.assign(document.createElement('span'), {
      className: `save-status save-status--${type}`,
      textContent: message,
    }),
  );
}

function showStateBadge(state) {
  statusText.replaceChildren(
    Object.assign(document.createElement('span'), {
      className: `badge badge--${state}`,
      textContent: STATE_LABELS[state],
    }),
  );
}

function clearErrors() {
  form.querySelectorAll('.field-error').forEach((node) => node.remove());
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
    input
      .closest('.field, .cover-picker, [data-tab-panel]')
      ?.append(
        Object.assign(document.createElement('p'), { className: 'field-error', textContent: text }),
      );
  });
  formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/** Met à jour la page après un enregistrement ou au chargement d'un article existant. */
function applySaved(article) {
  saved = article;
  slugInput.value = article.slug;
  slugIsAuto = false;
  viewLink.href = article.url;
  viewLink.hidden = article.state !== 'published';
  form.querySelector('[data-slug-hint]').textContent =
    article.state === 'published'
      ? 'Courte, en minuscules, avec l’expression clé. Si vous la changez, l’ancienne adresse redirigera vers la nouvelle.'
      : 'Courte, en minuscules, avec l’expression clé.';

  const editUrl = `/admin/article/?slug=${encodeURIComponent(article.slug)}`;
  if (window.location.pathname + window.location.search !== editUrl) {
    window.history.replaceState(null, '', editUrl);
  }
  // Article existant : « Nouvel article » n'est pas la page courante.
  document.querySelector('[data-nav-new]')?.removeAttribute('aria-current');
}

async function followDeployment(commit, message) {
  showStatus(`${message} Mise en ligne en cours (environ une minute)…`, 'info');
  viewLink.hidden = true;
  const outcome = await waitForDeployment(commit);
  if (saved && commit) {
    if (outcome === 'live') {
      showStatus(`${message} C’est en ligne.`, 'success');
      viewLink.hidden = saved.state !== 'published';
    } else {
      showStatus(
        `${message} La mise en ligne prend plus de temps que prévu : vérifiez dans quelques minutes.`,
        'info',
      );
    }
  }
}

async function save() {
  if (saving) return;
  saving = true;
  clearErrors();
  saveButton.disabled = true;
  showStatus('Enregistrement…');

  const previousBackupKey = backupKey();
  try {
    const result = await saveArticle({
      article: formValues(),
      originalSlug: saved?.slug,
      baseSha: saved?.sha,
    });
    applySaved(result.article);
    dirty = false;
    clearBackup(previousBackupKey);
    clearBackup();
    otherArticles = otherArticles.filter((article) => article.slug !== result.article.slug);
    refresh();
    recordCommit(result.commit);

    if (result.commit && result.goesLive) {
      followDeployment(result.commit, result.message);
    } else {
      const local = result.commit ? '' : ' (site local mis à jour)';
      showStatus(`${result.message}${local}`, 'success');
    }
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

/* --------------------------------------------------------------------------
   Démarrage
   -------------------------------------------------------------------------- */

field('category').replaceChildren(
  ...Object.entries(CATEGORIES).map(([value, label]) =>
    Object.assign(document.createElement('option'), { value, textContent: label }),
  ),
);

await requireSession();
const articles = await fetchArticles();
const params = new URLSearchParams(window.location.search);
const existing = articles.find((article) => article.slug === params.get('slug'));

if (params.has('slug') && !existing) {
  document.querySelector('[data-editor-loading]').textContent =
    'Article introuvable : il a peut-être été supprimé ou renommé.';
} else {
  const idea = params.has('idee') ? ARTICLE_IDEAS[Number(params.get('idee'))] : undefined;
  const article =
    existing ?? (idea ? articleFromIdea(idea) : normalizeArticle({ status: 'draft' }));

  fillForm(article);
  otherArticles = articles.filter((other) => other.slug !== article.slug);
  if (existing) {
    applySaved(existing);
    showStateBadge(existing.state);
  } else {
    slugIsAuto = true;
    slugInput.value = slugify(article.title);
  }

  document.querySelector('[data-editor-loading]').hidden = true;
  form.hidden = false;
  autosizeTitle();
  fillLinkSuggestions();
  refresh();
  offerBackup(article);
}
