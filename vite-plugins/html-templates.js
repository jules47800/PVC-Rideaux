import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { toPagePath } from './pages.js';

/** `<!-- @include header.html -->` : insère le contenu de src/partials/header.html */
const INCLUDE_RE = /<!--\s*@include\s+([\w./-]+)\s*-->/g;
/** `{{ site.phone }}`, `{{ page.url }}` : remplacés par la valeur correspondante */
const TOKEN_RE = /\{\{\s*([\w.]+)\s*\}\}/g;
/** Balise d'ouverture d'un lien interne */
const LINK_RE = /<a\b[^>]*?\bhref="(\/[^"]*)"[^>]*>/g;
/** `<!-- @page {"ogType":"article"} -->` : variables propres à la page (JSON) */
const PAGE_VARS_RE = /<!--\s*@page\s+(\{[\s\S]*?\})\s*-->\s*/;

/** Valeurs par défaut des variables de page modifiables par `@page`. */
const PAGE_DEFAULTS = {
  ogType: 'website',
  ogImage: '/og-image.jpg',
  ogImageWidth: 1200,
  ogImageHeight: 630,
};

const MAX_INCLUDE_DEPTH = 10;

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (char) => HTML_ESCAPES[char]);

/**
 * Mini moteur de gabarits HTML exécuté par Vite, en dev comme au build.
 *
 * 1. Inclusions de fragments (header, footer…) depuis le dossier des partials.
 * 2. Remplacement des variables `{{ site.* }}` (site.config.js) et `{{ page.* }}`
 *    (`page.path` = URL relative, `page.url` = URL absolue canonique, `page.ogType`,
 *    `page.ogImage`… modifiables par un commentaire `<!-- @page {…} -->` en tête de page,
 *    utilisé par les pages générées du blog).
 * 3. Ajout automatique de `aria-current` sur les liens pointant vers la page
 *    courante (`page`) ou vers une de ses sections parentes (`true`).
 * 4. Espaces insécables de la typographie française (avant : ; ? ! etc.).
 * 5. Balises Open Graph og:title / og:description déduites de la page.
 *
 * Une variable inconnue fait échouer le build : pas de `{{ … }}` oublié en prod.
 *
 * @param {{ root: string, partialsDir: string, site: object }} options
 * @returns {import('vite').Plugin}
 */
export function htmlTemplates({ root, partialsDir, site }) {
  const resolveIncludes = (html, depth = 0) => {
    if (depth > MAX_INCLUDE_DEPTH) {
      throw new Error('[html-templates] Profondeur d’inclusion maximale atteinte (boucle ?)');
    }

    return html.replace(INCLUDE_RE, (_, name) => {
      const file = resolve(partialsDir, name);
      if (!file.startsWith(partialsDir + sep)) {
        throw new Error(`[html-templates] Inclusion hors du dossier partials : ${name}`);
      }
      return resolveIncludes(readFileSync(file, 'utf-8'), depth + 1);
    });
  };

  const replaceTokens = (html, context, filename) =>
    html.replace(TOKEN_RE, (match, path) => {
      const value = path.split('.').reduce((obj, key) => obj?.[key], context);
      if (value === undefined || value === null || typeof value === 'object') {
        throw new Error(`[html-templates] Variable inconnue ${match} dans ${filename}`);
      }
      return escapeHtml(value);
    });

  const markCurrentLinks = (html, pagePath) =>
    html.replace(LINK_RE, (tag, href) => {
      if (tag.includes('aria-current')) return tag;

      const target = href.split(/[?#]/)[0];
      let current = null;
      if (target === pagePath && href === target) current = 'page';
      else if (target !== '/' && target.endsWith('/') && pagePath.startsWith(target))
        current = 'true';

      return current ? tag.replace(/^<a\b/, `<a aria-current="${current}"`) : tag;
    });

  // Typographie française : espace insécable avant « : » et fine insécable
  // avant « ; ? ! » et à l'intérieur des guillemets, pour éviter qu'une
  // ponctuation ne se retrouve seule en début de ligne. Seuls les nœuds texte
  // sont modifiés (ni les balises, ni les <script> / <style>).
  const applyFrenchSpacing = (html) =>
    html.replace(
      /(<(script|style)\b[\s\S]*?<\/\2>)|>([^<]+)(?=<)/g,
      (match, rawBlock, _tag, text) =>
        rawBlock ??
        `>${text
          .replace(/ :/g, '\u00A0:')
          .replace(/ ([;?!»])/g, '\u202F$1')
          .replace(/« /g, '«\u202F')}`,
    );

  // Reprend <title> et la meta description pour les aperçus réseaux sociaux,
  // afin de ne pas avoir à les écrire deux fois dans chaque page.
  const addOpenGraphText = (html) => {
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
    // Attributs éventuellement répartis sur plusieurs lignes (mise en forme du HTML source).
    const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/)?.[1];
    const tags = [
      title &&
        !html.includes('property="og:title"') &&
        `<meta property="og:title" content="${title}" />`,
      description &&
        !html.includes('property="og:description"') &&
        `<meta property="og:description" content="${description}" />`,
    ].filter(Boolean);

    return tags.length ? html.replace('</head>', `    ${tags.join('\n    ')}\n  </head>`) : html;
  };

  return {
    name: 'isorideaux:html-templates',

    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const pagePath = toPagePath(ctx.filename, root);
        const declared = JSON.parse(html.match(PAGE_VARS_RE)?.[1] ?? '{}');
        const page = {
          ...PAGE_DEFAULTS,
          ...declared,
          path: pagePath,
          url: `${site.url}${pagePath}`,
        };
        if (page.ogImage.startsWith('/')) page.ogImage = `${site.url}${page.ogImage}`;
        const context = { site, page };

        const withIncludes = resolveIncludes(html.replace(PAGE_VARS_RE, ''));
        const withTokens = replaceTokens(withIncludes, context, ctx.filename);
        return addOpenGraphText(applyFrenchSpacing(markCurrentLinks(withTokens, pagePath)));
      },
    },

    // Les partials ne font pas partie du graphe de modules : on force un
    // rechargement complet de la page quand l'un d'eux est modifié.
    // (Sauf les partials générés du blog, regénérés à chaque enregistrement
    // d'article : ils rechargeraient aussi l'espace d'édition en cours d'utilisation.)
    hotUpdate({ file }) {
      if (this.environment.name !== 'client' || !file.startsWith(partialsDir + sep)) return;
      if (file.startsWith(`${partialsDir}${sep}blog${sep}`)) return [];
      this.environment.hot.send({ type: 'full-reload' });
      return [];
    },
  };
}
