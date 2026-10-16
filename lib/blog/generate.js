/**
 * Génération des pages du blog à partir de content/articles/*.json.
 *
 * Appelée au chargement de la configuration Vite (dev et build), avant la
 * découverte des pages : les fichiers produits dans src/blog/ et
 * src/partials/blog/ sont ensuite traités comme n'importe quelle page du site.
 * Ces deux dossiers sont générés : ils ne sont pas versionnés.
 *
 * Produit :
 *   src/blog/index.html, src/blog/page/<n>/              liste (9 articles par page)
 *   src/blog/categorie/<categorie>/                       listes par catégorie (noindex)
 *   src/blog/<slug>/index.html                            articles publiés
 *   src/blog/<ancien-slug>/index.html                     redirections des articles renommés
 *   src/partials/blog/latest-posts[-pro|-particulier].html  bloc « Nos derniers conseils »
 * et renvoie le flux RSS, émis au build par vite-plugins/blog.js.
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { imageSize } from './image-size.js';
import { extractHeadings, renderMarkdown } from './markdown.js';
import {
  CATEGORIES,
  articleUrl,
  byDateDesc,
  categoryLabel,
  countWords,
  description,
  escapeHtml,
  isPublic,
  normalizeArticle,
  plainText,
} from './model.js';
import {
  articlePage,
  blogIndexPage,
  latestPostsPartial,
  listUrl,
  redirectPage,
} from './templates.js';

const POSTS_PER_PAGE = 9;
const RELATED_POSTS = 3;
const LATEST_POSTS = 3;
const FEED_SIZE = 20;

/** Lit tous les articles (brouillons compris), du plus récent au plus ancien. */
export function loadArticles(contentDir) {
  let files = [];
  try {
    files = readdirSync(contentDir).filter((name) => name.endsWith('.json'));
  } catch {
    return [];
  }

  return files
    .map((name) => {
      const article = normalizeArticle(JSON.parse(readFileSync(join(contentDir, name), 'utf-8')));
      // Le nom du fichier fait foi pour l'adresse.
      return { ...article, slug: name.slice(0, -'.json'.length) };
    })
    .sort(byDateDesc);
}

function writePage(path, html) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, html);
}

/** Articles d'une catégorie d'abord, puis les autres, chacun du plus récent au plus ancien. */
const preferCategory = (articles, category) => [
  ...articles.filter((article) => article.category === category),
  ...articles.filter((article) => article.category !== category),
];

function writeListPages(dir, articles, category) {
  const pageCount = Math.max(1, Math.ceil(articles.length / POSTS_PER_PAGE));
  for (let page = 1; page <= pageCount; page += 1) {
    const html = blogIndexPage({
      articles: articles.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE),
      category,
      page,
      pageCount,
    });
    writePage(join(dir, listUrl(category, page).replace(/^\/blog\//, ''), 'index.html'), html);
  }
}

function feedXml(articles, siteUrl) {
  const xml = (value) => escapeHtml(value);
  const rfc822 = (iso) => new Date(iso).toUTCString();
  const items = articles.slice(0, FEED_SIZE).map(
    (article) => `    <item>
      <title>${xml(article.title)}</title>
      <link>${xml(siteUrl + articleUrl(article))}</link>
      <guid isPermaLink="true">${xml(siteUrl + articleUrl(article))}</guid>
      <pubDate>${rfc822(article.publishedAt)}</pubDate>
      <category>${xml(categoryLabel(article))}</category>
      <description>${xml(description(article))}</description>
    </item>`,
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Blog IsoRideaux</title>
    <link>${siteUrl}/blog/</link>
    <atom:link href="${siteUrl}/blog/feed.xml" rel="self" type="application/rss+xml" />
    <description>Conseils et guides pour choisir, poser et entretenir vos rideaux à lanières PVC.</description>
    <language>fr-FR</language>
${articles.length ? `    <lastBuildDate>${rfc822(articles[0].updatedAt || articles[0].publishedAt)}</lastBuildDate>\n` : ''}${items.join('\n')}
  </channel>
</rss>
`;
}

/**
 * @param {{ contentDir: string, pagesDir: string, partialsDir: string, publicDir: string,
 *           siteUrl: string, now?: Date }} options
 * @returns {{ published: object[], feed: string }}
 */
export function generateBlog({
  contentDir,
  pagesDir,
  partialsDir,
  publicDir,
  siteUrl,
  now = new Date(),
}) {
  const published = loadArticles(contentDir).filter((article) => isPublic(article, now));
  const sizeOf = (src) =>
    src.startsWith('/') && !src.includes('..') ? imageSize(join(publicDir, src)) : null;

  rmSync(pagesDir, { recursive: true, force: true });
  rmSync(partialsDir, { recursive: true, force: true });

  writeListPages(pagesDir, published, null);
  Object.keys(CATEGORIES).forEach((category) =>
    writeListPages(
      pagesDir,
      published.filter((article) => article.category === category),
      category,
    ),
  );

  const slugs = new Set(published.map((article) => article.slug));
  for (const article of published) {
    const contentHtml = renderMarkdown(article.content, { imageSize: sizeOf });
    const related = preferCategory(
      published.filter((other) => other.slug !== article.slug),
      article.category,
    ).slice(0, RELATED_POSTS);

    writePage(
      join(pagesDir, article.slug, 'index.html'),
      articlePage({
        article,
        contentHtml,
        headings: extractHeadings(contentHtml),
        related,
        siteUrl,
        coverSize: article.cover.src ? sizeOf(article.cover.src) : null,
        wordCount: countWords(plainText(article)),
      }),
    );

    for (const previousSlug of article.previousSlugs) {
      if (!slugs.has(previousSlug)) {
        writePage(
          join(pagesDir, previousSlug, 'index.html'),
          redirectPage(articleUrl(article), siteUrl),
        );
      }
    }
  }

  writePage(
    join(partialsDir, 'latest-posts.html'),
    latestPostsPartial(published.slice(0, LATEST_POSTS)),
  );
  writePage(
    join(partialsDir, 'latest-posts-pro.html'),
    latestPostsPartial(preferCategory(published, 'professionnels').slice(0, LATEST_POSTS)),
  );
  writePage(
    join(partialsDir, 'latest-posts-particulier.html'),
    latestPostsPartial(preferCategory(published, 'particuliers').slice(0, LATEST_POSTS)),
  );

  return { published, feed: feedXml(published, siteUrl) };
}
