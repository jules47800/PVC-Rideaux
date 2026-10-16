/**
 * Gabarits HTML des pages du blog, générées au build (lib/blog/generate.js)
 * dans src/blog/. Elles passent ensuite par le même traitement que les autres
 * pages (vite-plugins/html-templates.js) : partials, variables, typographie
 * française, Open Graph.
 *
 * Tout texte venant d'un article est échappé ; les « {{ » sont neutralisés pour
 * ne jamais être pris pour une variable du gabarit.
 */
import {
  CATEGORIES,
  articleUrl,
  categoryLabel,
  cover,
  description,
  escapeHtml,
  excerpt,
  formatDateFr,
  readingTime,
  seoTitle,
} from './model.js';

/** Échappement HTML + neutralisation des variables de gabarit. */
const esc = (value) => escapeHtml(value).replace(/\{/g, '&#123;');
const neutralize = (html) => html.replace(/\{\{/g, '&#123;&#123;');
const jsonLd = (data) =>
  `<script type="application/ld+json">${JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\{\{/g, '{\\u007b')}</script>`;

const ARROW_ICON =
  '<svg class="icon" aria-hidden="true"><use href="/icons.svg#i-arrow-right"></use></svg>';
const RSS_LINK =
  '<link rel="alternate" type="application/rss+xml" title="Blog IsoRideaux" href="/blog/feed.xml" />';

/**
 * Page complète : en-tête et pied de page du site, variables de page (Open Graph).
 * @param {{ title: string, description: string, main: string, head?: string,
 *           pageVars?: object, robots?: string, footerCta?: boolean }} page
 */
function layout({ title, description: text, main, head = '', pageVars, robots, footerCta = true }) {
  return `<!doctype html>
<html lang="fr">
  <head>
    <!-- Page générée par lib/blog/generate.js : ne pas modifier à la main. -->
    ${pageVars ? `<!-- @page ${JSON.stringify(pageVars)} -->` : ''}
    <!-- @include head.html -->
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(text)}" />
    ${robots ? `<meta name="robots" content="${robots}" />` : ''}
    ${head}
  </head>
  <body>
    <!-- @include header.html -->

    <main id="contenu">
${main}
      ${footerCta ? '<!-- @include cta-devis.html -->' : ''}
    </main>

    <!-- @include footer.html -->
  </body>
</html>
`;
}

/* --------------------------------------------------------------------------
   Carte d'article (liste, articles liés, bloc « derniers conseils »)
   -------------------------------------------------------------------------- */

export function postCard(article, headingTag = 'h2') {
  const image = cover(article);
  const media = image
    ? `<div class="post-card__media">
          <img src="${esc(image.src)}" alt="" width="1200" height="630" loading="lazy" decoding="async" />
        </div>`
    : '';

  return `<article class="post-card">
        ${media}
        <div class="post-card__body">
          <p class="post-meta">
            <span class="post-chip">${esc(categoryLabel(article))}</span>
            <time datetime="${esc(article.publishedAt)}">${esc(formatDateFr(article.publishedAt))}</time>
            <span aria-hidden="true">·</span>
            <span>${readingTime(article)} min de lecture</span>
          </p>
          <${headingTag} class="post-card__title"><a href="${esc(articleUrl(article))}">${esc(article.title)}</a></${headingTag}>
          <p class="post-card__excerpt">${esc(excerpt(article, 150))}</p>
          <span class="link-arrow">Lire l’article ${ARROW_ICON}</span>
        </div>
      </article>`;
}

/* --------------------------------------------------------------------------
   Liste des articles : /blog/, /blog/page/2/, /blog/categorie/<categorie>/
   -------------------------------------------------------------------------- */

/** Adresse d'une page de liste. */
export function listUrl(category, page = 1) {
  const base = category ? `/blog/categorie/${category}/` : '/blog/';
  return page > 1 ? `${base}page/${page}/` : base;
}

export function blogIndexPage({ articles, category, page, pageCount }) {
  const label = category ? CATEGORIES[category] : null;
  const filters = [
    `<a class="blog-filter" href="/blog/"${category ? '' : ' aria-current="page"'}>Tous les articles</a>`,
    ...Object.entries(CATEGORIES).map(
      ([slug, name]) =>
        `<a class="blog-filter" href="${listUrl(slug)}"${slug === category ? ' aria-current="page"' : ''}>${esc(name)}</a>`,
    ),
  ].join('\n          ');

  const list = articles.length
    ? `<div class="post-grid">
      ${articles.map((article) => postCard(article, 'h2')).join('\n      ')}
    </div>`
    : '<p class="blog-empty">Aucun article dans cette catégorie pour le moment. <a href="/blog/">Voir tous les articles</a>.</p>';

  const pagination =
    pageCount > 1
      ? `<nav class="pagination" aria-label="Pages d’articles">
      ${page > 1 ? `<a class="btn btn--secondary" href="${listUrl(category, page - 1)}" rel="prev">← Articles plus récents</a>` : ''}
      <span class="pagination__status">Page ${page} sur ${pageCount}</span>
      ${page < pageCount ? `<a class="btn btn--secondary" href="${listUrl(category, page + 1)}" rel="next">Articles plus anciens →</a>` : ''}
    </nav>`
      : '';

  const main = `      <section class="page-hero blog-hero" aria-labelledby="titre-principal">
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
            <h1 id="titre-principal">${label ? `${esc(label)} : nos articles` : 'Le blog IsoRideaux'}</h1>
            <p class="lead">Choisir, poser et entretenir vos rideaux à lanières PVC : les conseils de notre équipe, pour les professionnels comme pour les particuliers.</p>
            <nav class="blog-filters" aria-label="Catégories d’articles">
          ${filters}
            </nav>
          </div>
        </div>
      </section>

      <section class="section section--flush-top" aria-label="Articles">
        <div class="container">
    ${list}
    ${pagination}
        </div>
      </section>`;

  const title = label
    ? `${label} : articles et conseils rideaux PVC | IsoRideaux`
    : 'Blog rideau PVC : conseils et guides pratiques | IsoRideaux';

  return layout({
    title: page > 1 ? `Page ${page} – ${title}` : title,
    description:
      'Conseils et guides IsoRideaux pour bien choisir, poser et entretenir vos rideaux à lanières PVC, pour les professionnels comme pour les particuliers.',
    head: RSS_LINK,
    main,
    // Les listes filtrées reprennent la liste principale : suivies, pas indexées.
    robots: category ? 'noindex,follow' : undefined,
  });
}

/* --------------------------------------------------------------------------
   Article : /blog/<slug>/
   -------------------------------------------------------------------------- */

/**
 * @param {{ article: object, contentHtml: string, headings: {id: string, text: string}[],
 *           related: object[], siteUrl: string, coverSize: {width: number, height: number} | null,
 *           wordCount: number }} data
 */
export function articlePage({
  article,
  contentHtml,
  headings,
  related,
  siteUrl,
  coverSize,
  wordCount,
}) {
  const image = cover(article);
  const url = `${siteUrl}${articleUrl(article)}`;
  const updated =
    article.updatedAt && article.updatedAt.slice(0, 10) > article.publishedAt.slice(0, 10);
  const profile = { professionnels: 'pro', particuliers: 'particulier' }[article.category];
  const organization = {
    '@type': 'Organization',
    '@id': `${siteUrl}/#entreprise`,
    name: 'IsoRideaux',
    url: `${siteUrl}/`,
  };

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: article.title,
      description: description(article),
      mainEntityOfPage: url,
      url,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt || article.publishedAt,
      image: `${siteUrl}${image ? image.src : '/og-image.jpg'}`,
      articleSection: categoryLabel(article),
      keywords: article.keyword,
      wordCount,
      inLanguage: 'fr-FR',
      // Même entité que les données structurées de l'accueil (src/index.html).
      author: organization,
      publisher: {
        ...organization,
        logo: { '@type': 'ImageObject', url: `${siteUrl}/logo-isorideaux.png` },
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteUrl}/blog/` },
        { '@type': 'ListItem', position: 3, name: article.title, item: url },
      ],
    },
  ];

  const head = [
    RSS_LINK,
    ...structuredData.map(jsonLd),
    `<meta property="article:published_time" content="${esc(article.publishedAt)}" />`,
    article.updatedAt
      ? `<meta property="article:modified_time" content="${esc(article.updatedAt)}" />`
      : '',
  ].join('\n    ');

  const toc =
    headings.length >= 3
      ? `<aside class="post-aside">
            <nav class="post-toc" aria-labelledby="sommaire-titre">
              <p class="post-toc__title" id="sommaire-titre">Sommaire</p>
              <ol role="list">
                ${headings.map((heading) => `<li><a href="#${esc(heading.id)}">${esc(heading.text)}</a></li>`).join('\n                ')}
              </ol>
            </nav>
          </aside>`
      : '';

  const relatedSection = related.length
    ? `
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
      ${related.map((item) => postCard(item, 'h3')).join('\n      ')}
          </div>
        </div>
      </section>`
    : '';

  const main = `      <article class="post">
        <header class="page-hero post-header">
          <div class="container">
            <nav class="breadcrumb" aria-label="Fil d’Ariane">
              <ol>
                <li><a href="/">Accueil</a></li>
                <li><a href="/blog/">Blog</a></li>
                <li><a href="${listUrl(article.category)}">${esc(categoryLabel(article))}</a></li>
              </ol>
            </nav>
            <h1 class="post-title">${esc(article.title)}</h1>
            <p class="post-meta">
              <span class="post-chip">${esc(categoryLabel(article))}</span>
              <span>Publié le <time datetime="${esc(article.publishedAt)}">${esc(formatDateFr(article.publishedAt))}</time></span>
              ${updated ? `<span aria-hidden="true">·</span>\n              <span>Mis à jour le <time datetime="${esc(article.updatedAt)}">${esc(formatDateFr(article.updatedAt))}</time></span>` : ''}
              <span aria-hidden="true">·</span>
              <span>${readingTime(article)} min de lecture</span>
            </p>
          </div>
        </header>

        <div class="container post-layout">
          <div class="post-main">
            ${image ? `<figure class="post-cover">\n              <img src="${esc(image.src)}" alt="${esc(image.alt)}" width="${coverSize?.width ?? 1200}" height="${coverSize?.height ?? 630}" fetchpriority="high" />\n            </figure>` : ''}

            <div class="post-content">
${neutralize(contentHtml)}
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
                ${profile ? `<input type="hidden" name="profil" value="${profile}" />` : ''}
                <button class="btn btn--primary btn--lg" type="submit">
                  Mon devis
                  <svg class="icon icon-arrow" aria-hidden="true"><use href="/icons.svg#i-arrow-right"></use></svg>
                </button>
              </form>
            </aside>
          </div>

          ${toc}
        </div>
      </article>
${relatedSection}`;

  return layout({
    title: seoTitle(article),
    description: description(article),
    head,
    main,
    pageVars: {
      ogType: 'article',
      ...(image && {
        ogImage: image.src,
        ogImageWidth: coverSize?.width,
        ogImageHeight: coverSize?.height,
      }),
    },
    // L'article a son propre encart devis : pas de second bandeau en bas de page.
    footerCta: false,
  });
}

/** Ancienne adresse d'un article renommé : redirection immédiate (traitée comme permanente par Google). */
export function redirectPage(target, siteUrl) {
  return `<!doctype html>
<html lang="fr">
  <head>
    <!-- Page générée par lib/blog/generate.js : ancienne adresse d'un article renommé. -->
    <meta charset="UTF-8" />
    <meta name="robots" content="noindex" />
    <meta http-equiv="refresh" content="0; url=${esc(target)}" />
    <link rel="canonical" href="${esc(siteUrl + target)}" />
    <title>Article déplacé</title>
  </head>
  <body>
    <p>Cet article a changé d’adresse : <a href="${esc(target)}">${esc(siteUrl + target)}</a></p>
  </body>
</html>
`;
}

/**
 * Bloc « Nos derniers conseils » des pages statiques (src/partials/blog/latest-posts*.html).
 * Vide s'il n'y a aucun article publié.
 */
export function latestPostsPartial(articles) {
  if (!articles.length)
    return '<!-- Aucun article publié : bloc « derniers conseils » masqué. -->\n';
  return `      <!-- Partial généré par lib/blog/generate.js (derniers articles du blog). -->
      <section class="section latest-posts" aria-labelledby="derniers-articles-titre">
        <div class="container">
          <div class="section-head section-head--split">
            <div>
              <p class="eyebrow">Blog &amp; conseils</p>
              <h2 id="derniers-articles-titre">Nos derniers conseils</h2>
            </div>
            <a class="btn btn--secondary" href="/blog/">Tous les articles</a>
          </div>
          <div class="post-grid">
      ${articles.map((article) => postCard(article, 'h3')).join('\n      ')}
          </div>
        </div>
      </section>
`;
}
