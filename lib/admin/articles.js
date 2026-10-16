/**
 * Opérations de l'espace d'édition sur les articles et les images :
 * lecture, validation du formulaire, enregistrement, corbeille, envoi d'image.
 * Le stockage (dépôt GitHub ou fichiers locaux) est fourni par content-store.js.
 */
import { randomBytes } from 'node:crypto';

import { HttpError } from '../http.js';
import {
  CATEGORIES,
  STATUSES,
  articleState,
  articleUrl,
  byDateDesc,
  formatDateFr,
  fromDateTimeLocal,
  isPublic,
  isValidSlug,
  normalizeArticle,
  slugify,
  toDateTimeLocal,
  toParisIso,
} from '../blog/model.js';
import { gitBlobSha } from './content-store.js';

export const ARTICLES_DIR = 'content/articles';
const TRASH_DIR = 'content/corbeille';
const UPLOADS_DIR = 'public/uploads/blog';

/** Adresses réservées par les pages de liste du blog. */
const RESERVED_SLUGS = ['categorie', 'page', 'feed', 'images'];
const MAX_CONTENT_LENGTH = 200_000;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

const articlePath = (slug) => `${ARTICLES_DIR}/${slug}.json`;
const serialize = (article) => `${JSON.stringify(article, null, 2)}\n`;

/** Données d'un article transmises à l'espace d'édition. */
const payload = (article, sha) => ({
  ...article,
  sha,
  url: articleUrl(article),
  state: articleState(article),
});

/** Tous les articles (brouillons compris), du plus récent au plus ancien. */
export async function listArticles(store) {
  const files = (await store.list(ARTICLES_DIR)).filter(({ path }) => path.endsWith('.json'));
  const contents = await store.readListed(files);
  return contents
    .map(({ path, sha, content }) => {
      const slug = path.slice(ARTICLES_DIR.length + 1, -'.json'.length);
      return payload({ ...normalizeArticle(JSON.parse(content.toString('utf-8'))), slug }, sha);
    })
    .sort(byDateDesc);
}

/* --------------------------------------------------------------------------
   Formulaire d'article
   -------------------------------------------------------------------------- */

/** Texte sur une ligne, espaces normalisés, longueur bornée. */
const line = (value, maxLength) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

/**
 * Construit un article à partir des champs envoyés par l'éditeur et le valide.
 * @returns {{ article: object, errors: Record<string, string> }}
 */
export function articleFromInput(input, existing, articles) {
  const errors = {};

  const title = line(input.title, 200);
  if (!title) errors.title = 'Le titre est obligatoire.';

  const slug = line(input.slug, 100) || slugify(title);
  if (!isValidSlug(slug)) {
    errors.slug =
      'Adresse invalide : lettres minuscules, chiffres et tirets uniquement (80 caractères max.).';
  } else if (RESERVED_SLUGS.includes(slug)) {
    errors.slug = `L’adresse « ${slug} » est réservée : choisissez-en une autre.`;
  } else if (slug !== existing?.slug && articles.some((article) => article.slug === slug)) {
    errors.slug = 'Un autre article utilise déjà cette adresse.';
  }

  const coverSrc = line(input.cover?.src, 300);
  if (coverSrc && !/^\/(?!\/)[A-Za-z0-9/_.-]+$/.test(coverSrc)) {
    errors.coverSrc = 'L’image doit être envoyée sur le site avec le bouton « Choisir une image ».';
  }

  // Une date inchangée à la minute près garde sa valeur d'origine (secondes comprises).
  let publishedAt = '';
  const dateInput = line(input.publishedAt, 30);
  if (existing && dateInput === toDateTimeLocal(existing.publishedAt)) {
    publishedAt = existing.publishedAt;
  } else if (dateInput) {
    publishedAt = fromDateTimeLocal(dateInput) ?? '';
    if (!publishedAt) errors.publishedAt = 'Date de publication invalide.';
  }

  const content = String(input.content ?? '').replace(/\r\n?/g, '\n');
  if (content.length > MAX_CONTENT_LENGTH) errors.content = 'Article trop long.';

  const article = normalizeArticle({
    slug,
    title,
    seoTitle: line(input.seoTitle, 200),
    description: line(input.description, 400),
    keyword: line(input.keyword, 100).toLowerCase(),
    excerpt: line(input.excerpt, 400),
    category: Object.hasOwn(CATEGORIES, input.category) ? input.category : 'conseils',
    cover: { src: coverSrc, alt: line(input.cover?.alt, 250) },
    content: `${content.trimEnd()}\n`,
    status: STATUSES.includes(input.status) ? input.status : 'draft',
    publishedAt,
    updatedAt: existing?.updatedAt ?? '',
    previousSlugs: existing?.previousSlugs ?? [],
  });

  return { article, errors };
}

/** Message de confirmation selon l'état de l'article. */
function savedMessage(article) {
  const state = articleState(article);
  if (state === 'draft') return 'Brouillon enregistré : il n’est pas visible sur le site.';
  if (state === 'scheduled') {
    return `Article programmé : il sera mis en ligne le ${formatDateFr(article.publishedAt)}.`;
  }
  return 'Article enregistré.';
}

/* --------------------------------------------------------------------------
   Enregistrement, corbeille
   -------------------------------------------------------------------------- */

const COMMIT_STATE_LABELS = { published: 'en ligne', scheduled: 'programmé', draft: 'brouillon' };

const commitAuthor = (user) => ({
  name: `${user} (espace d’édition)`,
  email: 'blog@isorideaux.fr',
});

/**
 * Enregistre un article (création, modification, changement d'adresse) en un seul commit.
 * @param {{ input: object, originalSlug?: string, baseSha?: string, user: string }} options
 *   baseSha : empreinte de l'article au moment de son ouverture, pour détecter
 *   une modification faite entre-temps ailleurs.
 */
export async function saveArticle(store, { input, originalSlug, baseSha, user }) {
  const articles = await listArticles(store);
  const existing = originalSlug ? articles.find((article) => article.slug === originalSlug) : null;
  if (originalSlug && !existing)
    throw new HttpError(404, 'Article introuvable : il a peut-être été supprimé.');
  if (existing && baseSha !== existing.sha) {
    throw new HttpError(
      409,
      'Cet article a été modifié entre-temps (autre onglet ou autre personne). Copiez votre texte, rechargez la page, puis reportez vos changements.',
    );
  }

  const { article, errors } = articleFromInput(input, existing, articles);
  if (Object.keys(errors).length) {
    throw new HttpError(422, errors.form ?? 'Certains champs sont à corriger.', { errors });
  }

  const now = toParisIso();
  if (existing && existing.slug !== article.slug) {
    article.previousSlugs = [...new Set([...existing.previousSlugs, existing.slug])];
  }
  article.previousSlugs = article.previousSlugs.filter((slug) => slug !== article.slug);
  if (article.status === 'published' && !article.publishedAt) article.publishedAt = now;
  article.updatedAt = now;

  const { slug, ...stored } = article;
  const json = serialize(stored);
  const changes = [{ path: articlePath(slug), content: json }];
  if (existing && existing.slug !== slug)
    changes.push({ path: articlePath(existing.slug), content: null });

  // Mise en ligne nécessaire si l'article était ou devient visible du public.
  const goesLive = isPublic(article) || (existing ? isPublic(existing) : false);
  const { commit } = await store.commit({
    message: `Blog : « ${article.title} » (${COMMIT_STATE_LABELS[articleState(article)]})`,
    author: commitAuthor(user),
    changes,
  });

  return {
    article: payload(article, gitBlobSha(json)),
    commit,
    goesLive,
    message: savedMessage(article),
  };
}

/** Suppression « douce » : l'article part dans content/corbeille/ (restaurable). */
export async function trashArticle(store, { slug, user }) {
  const file = isValidSlug(slug) ? await store.read(articlePath(slug)) : null;
  if (!file) throw new HttpError(404, 'Article introuvable.');

  const article = normalizeArticle(JSON.parse(file.content.toString('utf-8')));
  const stamp = toParisIso().slice(0, 19).replace(/[-:T]/g, '');
  const { commit } = await store.commit({
    message: `Blog : « ${article.title} » placé dans la corbeille`,
    author: commitAuthor(user),
    changes: [
      { path: `${TRASH_DIR}/${slug}-${stamp}.json`, content: file.content.toString('utf-8') },
      { path: articlePath(slug), content: null },
    ],
  });
  return { commit, goesLive: isPublic(article) };
}

/* --------------------------------------------------------------------------
   Images
   -------------------------------------------------------------------------- */

/** Type d'image d'après ses premiers octets (jamais d'après le nom du fichier). */
function imageExtension(buffer) {
  if (
    buffer.length > 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  )
    return 'webp';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.toString('ascii', 1, 4) === 'PNG') return 'png';
  return null;
}

/**
 * Enregistre une image déjà redimensionnée par le navigateur (src/admin/scripts/image.js).
 * @param {{ name: string, data: string, user: string }} options  data : contenu en base64
 * @returns {Promise<{ url: string, commit: string | null }>}
 */
export async function saveImage(store, { name, data, user }) {
  const buffer = Buffer.from(String(data ?? ''), 'base64');
  if (buffer.length === 0) throw new HttpError(400, 'Image vide.');
  if (buffer.length > MAX_IMAGE_BYTES)
    throw new HttpError(413, 'Image trop lourde, même après compression (3 Mo maximum).');

  const extension = imageExtension(buffer);
  if (!extension)
    throw new HttpError(415, 'Format non reconnu : utilisez une image JPEG, PNG ou WebP.');

  const [year, month] = toParisIso().split('-');
  const baseName = slugify(String(name ?? '').replace(/\.[a-z0-9]+$/i, ''), 50) || 'image';
  const path = `${UPLOADS_DIR}/${year}/${month}/${baseName}-${randomBytes(3).toString('hex')}.${extension}`;

  const { commit } = await store.commit({
    message: `Blog : image ${path.split('/').pop()}`,
    author: commitAuthor(user),
    changes: [{ path, content: buffer }],
  });
  return { url: path.slice('public'.length), commit };
}
