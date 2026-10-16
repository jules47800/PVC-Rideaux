/**
 * Modèle des articles du blog, partagé par le build (génération des pages),
 * l'espace d'édition (navigateur) et les fonctions serveur (Vercel).
 * Aucune dépendance à Node ni au navigateur.
 *
 * Un article = un fichier JSON content/articles/<slug>.json (le nom du fichier
 * donne l'adresse) :
 *   title, seoTitle, description, keyword, excerpt, category,
 *   cover { src, alt }, content (Markdown), status (draft | published),
 *   publishedAt, updatedAt (ISO 8601), previousSlugs (anciennes adresses)
 *
 * Un article « published » dont la date est dans le futur est programmé :
 * il n'est mis en ligne qu'à partir de cette date (voir api/cron/publish.js).
 */

export const CATEGORIES = {
  conseils: 'Conseils',
  guides: 'Guides pratiques',
  professionnels: 'Professionnels',
  particuliers: 'Particuliers',
  actualites: 'Actualités',
};

export const STATUSES = ['draft', 'published'];

export const TIME_ZONE = 'Europe/Paris';
const WORDS_PER_MINUTE = 200;
const SLUG_MAX_LENGTH = 80;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/* --------------------------------------------------------------------------
   Texte
   -------------------------------------------------------------------------- */

/** Minuscules, sans accents ni ponctuation : « L’Été ! » → « l ete » */
export function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** « Rideau PVC : l’été ! » → « rideau-pvc-l-ete » (coupé proprement à 80 caractères). */
export function slugify(text, maxLength = SLUG_MAX_LENGTH) {
  let slug = normalizeText(text).replace(/ /g, '-');
  if (slug.length > maxLength) {
    slug = slug.slice(0, maxLength).replace(/-+$/, '');
    const lastDash = slug.lastIndexOf('-');
    if (lastDash > maxLength * 0.6) slug = slug.slice(0, lastDash);
  }
  return slug;
}

export const isValidSlug = (slug) =>
  typeof slug === 'string' && slug.length <= SLUG_MAX_LENGTH && SLUG_RE.test(slug);

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Échappement HTML (texte et attributs). */
export const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

/** Nombre de mots d'un texte brut. */
export const countWords = (text) =>
  (String(text).match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []).length;

/* --------------------------------------------------------------------------
   Dates (heure de Paris, quel que soit le fuseau du serveur)
   -------------------------------------------------------------------------- */

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: TIME_ZONE,
});

/** ISO 8601 → « 2 avril 2025 » */
export function formatDateFr(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date);
}

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** Date → composantes (année, mois…) à l'heure de Paris. */
function parisParts(date) {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Décalage de Paris par rapport à UTC (en minutes) à cet instant : 60 ou 120. */
function parisOffsetMinutes(date) {
  const p = parisParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

const pad = (number) => String(number).padStart(2, '0');

/** Date → « 2025-04-02T17:06:20+02:00 » (heure de Paris). */
export function toParisIso(date = new Date()) {
  const p = parisParts(date);
  const offset = parisOffsetMinutes(date);
  const sign = offset >= 0 ? '+' : '-';
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
}

/** ISO 8601 → valeur d'un champ datetime-local (« 2025-04-02T17:06 », heure de Paris). */
export function toDateTimeLocal(iso) {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return '';
  const p = parisParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Champ datetime-local (heure de Paris) → ISO 8601, ou null si invalide. */
export function fromDateTimeLocal(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(value ?? ''));
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  // On part de l'heure lue comme UTC, puis on corrige du décalage de Paris (deux passes : changement d'heure).
  let timestamp = Date.UTC(year, month - 1, day, hour, minute);
  for (let pass = 0; pass < 2; pass += 1) {
    timestamp =
      Date.UTC(year, month - 1, day, hour, minute) -
      parisOffsetMinutes(new Date(timestamp)) * 60000;
  }
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : toParisIso(date);
}

/* --------------------------------------------------------------------------
   Articles
   -------------------------------------------------------------------------- */

const string = (value) => (typeof value === 'string' ? value : '');

/** Valeurs par défaut et types garantis, quel que soit le contenu du fichier. */
export function normalizeArticle(data = {}) {
  return {
    slug: string(data.slug),
    title: string(data.title),
    seoTitle: string(data.seoTitle),
    description: string(data.description),
    keyword: string(data.keyword),
    excerpt: string(data.excerpt),
    category: Object.hasOwn(CATEGORIES, data.category) ? data.category : 'conseils',
    cover: { src: string(data.cover?.src), alt: string(data.cover?.alt) },
    content: string(data.content),
    status: STATUSES.includes(data.status) ? data.status : 'draft',
    publishedAt: string(data.publishedAt),
    updatedAt: string(data.updatedAt),
    previousSlugs: Array.isArray(data.previousSlugs)
      ? data.previousSlugs.filter((slug) => isValidSlug(slug))
      : [],
  };
}

/** Article visible par le public à cette date (publié, date atteinte). */
export function isPublic(article, now = new Date()) {
  if (article.status !== 'published' || !article.publishedAt) return false;
  const publishedAt = new Date(article.publishedAt);
  return !Number.isNaN(publishedAt.getTime()) && publishedAt <= now;
}

/** État lisible : draft (brouillon), scheduled (programmé), published (en ligne). */
export function articleState(article, now = new Date()) {
  if (article.status !== 'published') return 'draft';
  return isPublic(article, now) ? 'published' : 'scheduled';
}

export const STATE_LABELS = { draft: 'Brouillon', scheduled: 'Programmé', published: 'En ligne' };

/** Du plus récent au plus ancien (date de publication, sinon de modification). */
export const byDateDesc = (a, b) =>
  String(b.publishedAt || b.updatedAt).localeCompare(String(a.publishedAt || a.updatedAt));

export const articleUrl = (article) => `/blog/${article.slug}/`;
export const seoTitle = (article) => article.seoTitle || article.title;
export const categoryLabel = (article) => CATEGORIES[article.category] ?? '';

/** Texte brut du contenu (sans syntaxe Markdown). */
export function plainText(article) {
  return article.content
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[\[[a-z]+\]\]/g, ' ')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_`|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function excerpt(article, length = 160) {
  if (article.excerpt) return article.excerpt;
  const text = plainText(article);
  if (text.length <= length) return text;
  const cut = text.slice(0, length);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : length).replace(/[\s,;:]+$/, '')}…`;
}

export const description = (article) => article.description || excerpt(article, 155);

export const readingTime = (article) =>
  Math.max(1, Math.round(countWords(plainText(article)) / WORDS_PER_MINUTE));

/** Image de couverture avec texte alternatif garanti, ou null. */
export function cover(article) {
  if (!article.cover.src) return null;
  return { src: article.cover.src, alt: article.cover.alt || article.title };
}
