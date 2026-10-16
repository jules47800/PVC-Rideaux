/**
 * Audit SEO des pages statiques générées (dist/), à lancer après un build :
 *
 *   npm run build && npm run seo
 *
 * Vérifie pour chaque page indexable (articles du blog compris) : titre et
 * description (présence, longueur, unicité), un seul H1, balise canonical,
 * image de partage, textes alternatifs des images, données structurées JSON-LD
 * valides et liens internes vers des pages existantes.
 * Affiche ensuite la note SEO de chaque article (même analyse que l'espace d'édition).
 * Sortie : liste des problèmes par page ; code de sortie 1 s'il y a des erreurs.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadArticles } from '../lib/blog/generate.js';
import { isPublic } from '../lib/blog/model.js';
import { analyzeArticle, prioritizedActions } from '../lib/blog/seo-checker.js';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const CONTENT_DIR = fileURLToPath(new URL('../content/articles/', import.meta.url));
/** Adresses servies par les fonctions Vercel ou les images envoyées : valides sans fichier HTML. */
const DYNAMIC_PATHS = [/^\/api\//, /^\/uploads\//];

const LIMITS = { titleMin: 30, titleMax: 65, descriptionMin: 110, descriptionMax: 160 };

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (text) =>
  text
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (match, code) => {
      if (code[0] !== '#') return ENTITIES[code] ?? match;
      return String.fromCodePoint(
        code[1] === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1)),
      );
    })
    .replace(/\s+/g, ' ')
    .trim();

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name.endsWith('.html') ? [path] : [];
  });
}

const toUrlPath = (file) => {
  const rel = relative(DIST, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  return rel.endsWith('/index.html') ? `/${rel.slice(0, -'index.html'.length)}` : `/${rel}`;
};

function linkTargetExists(href) {
  const path = decodeURI(href.split(/[?#]/)[0]);
  if (path === '' || DYNAMIC_PATHS.some((pattern) => pattern.test(path))) return true;
  const target = join(DIST, path);
  return (
    existsSync(target) && (statSync(target).isFile() || existsSync(join(target, 'index.html')))
  );
}

if (!existsSync(DIST)) {
  console.error('Dossier dist/ introuvable : lancez d’abord « npm run build ».');
  process.exit(1);
}

const pages = htmlFiles(DIST).map((file) => {
  const html = readFileSync(file, 'utf-8');
  return {
    path: toUrlPath(file),
    html,
    title: decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ''),
    description: decode(html.match(/<meta\s+name="description"\s+content="([^"]*)"/)?.[1] ?? ''),
    noindex: /<meta\s+name="robots"\s+content="[^"]*noindex/.test(html),
  };
});

const duplicates = (key) => {
  const seen = new Map();
  pages
    .filter((page) => !page.noindex && page[key])
    .forEach((page) => seen.set(page[key], [...(seen.get(page[key]) ?? []), page.path]));
  return seen;
};
const titleOwners = duplicates('title');
const descriptionOwners = duplicates('description');

let errorCount = 0;
let warningCount = 0;

for (const page of pages.sort((a, b) => a.path.localeCompare(b.path))) {
  const errors = [];
  const warnings = [];
  const { html, title, description } = page;

  if (!title) errors.push('titre manquant');
  else if (!page.noindex && (title.length < LIMITS.titleMin || title.length > LIMITS.titleMax))
    warnings.push(
      `titre de ${title.length} caractères (${LIMITS.titleMin}–${LIMITS.titleMax} conseillés) : « ${title} »`,
    );

  if (!page.noindex) {
    if (!description) errors.push('description manquante');
    else if (
      description.length < LIMITS.descriptionMin ||
      description.length > LIMITS.descriptionMax
    )
      warnings.push(
        `description de ${description.length} caractères (${LIMITS.descriptionMin}–${LIMITS.descriptionMax} conseillés)`,
      );

    if ((titleOwners.get(title) ?? []).length > 1)
      errors.push(
        `titre identique à ${titleOwners
          .get(title)
          .filter((p) => p !== page.path)
          .join(', ')}`,
      );
    if ((descriptionOwners.get(description) ?? []).length > 1)
      errors.push(
        `description identique à ${descriptionOwners
          .get(description)
          .filter((p) => p !== page.path)
          .join(', ')}`,
      );

    const h1Count = (html.match(/<h1[\s>]/g) ?? []).length;
    if (h1Count !== 1) errors.push(`${h1Count} titres H1 (un seul attendu)`);

    if (!/<link\s+rel="canonical"\s+href="https:\/\/[^"]+"/.test(html))
      errors.push('balise canonical manquante');
    if (!/<meta property="og:image"/.test(html))
      warnings.push('image de partage (og:image) manquante');
  }

  const imagesWithoutAlt = (html.match(/<img\b(?![^>]*\balt=)[^>]*>/g) ?? []).length;
  if (imagesWithoutAlt) errors.push(`${imagesWithoutAlt} image(s) sans attribut alt`);

  for (const [, json] of html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  )) {
    try {
      JSON.parse(json);
    } catch {
      errors.push('données structurées JSON-LD invalides');
    }
  }

  const brokenLinks = [
    ...new Set([...html.matchAll(/<a\b[^>]*\bhref="(\/[^"]*)"/g)].map((match) => match[1])),
  ].filter((href) => !linkTargetExists(href));
  if (brokenLinks.length) errors.push(`liens internes cassés : ${brokenLinks.join(', ')}`);

  errorCount += errors.length;
  warningCount += warnings.length;
  if (errors.length || warnings.length) {
    console.log(`\n${page.path}${page.noindex ? ' (noindex)' : ''}`);
    errors.forEach((message) => console.log(`  ✗ ${message}`));
    warnings.forEach((message) => console.log(`  ! ${message}`));
  }
}

console.log(
  `\n${pages.length} pages analysées : ${errorCount} erreur(s), ${warningCount} avertissement(s).`,
);

// Notes SEO des articles en ligne, de la plus basse à la plus haute.
const articles = loadArticles(CONTENT_DIR);
const scored = articles
  .filter((article) => isPublic(article))
  .map((article) => ({ article, result: analyzeArticle(article, { otherArticles: articles }) }))
  .sort((a, b) => a.result.score - b.result.score);

if (scored.length) {
  console.log('\nNotes SEO des articles (détail dans l’espace d’édition) :');
  for (const { article, result } of scored) {
    const next = prioritizedActions(result.checks)[0];
    console.log(
      `  ${String(result.score).padStart(3)}/100  ${article.slug}${next ? `  → ${next.title}` : ''}`,
    );
  }
}

process.exit(errorCount ? 1 : 0);
