import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { toPagePath } from './pages.js';

const NOINDEX_RE = /<meta\s+name="robots"\s+content="[^"]*noindex/;
const MODIFIED_RE = /<meta\s+property="article:modified_time"\s+content="([^"]+)"/;

/** Fichier généré pour une adresse : « /blog/ » → « blog/index.html » */
const outputFile = (path) => (path.endsWith('/') ? `${path.slice(1)}index.html` : path.slice(1));

/**
 * Écrit `sitemap.xml` et `robots.txt` à la fin du build, à partir des pages
 * générées (articles du blog compris). Aucune maintenance manuelle : ajouter
 * une page suffit. Les pages finales marquées `noindex` (listes filtrées,
 * redirections, espace d'édition…) sont écartées automatiquement.
 *
 * @param {{ root: string, pages: string[], siteUrl: string, exclude?: string[], disallow?: string[] }} options
 *   `exclude` : chemins publics à ne pas référencer ; `disallow` : chemins interdits aux robots.
 * @returns {import('vite').Plugin}
 */
export function sitemap({ root, pages, siteUrl, exclude = [], disallow = [] }) {
  let outDir;

  return {
    name: 'isorideaux:sitemap',
    apply: 'build',

    configResolved(config) {
      outDir = config.build.outDir;
    },

    closeBundle() {
      const today = new Date().toISOString().slice(0, 10);
      const urls = pages
        .map((file) => toPagePath(file, root))
        .filter((path) => !exclude.includes(path))
        .map((path) => ({ path, html: readFileSync(join(outDir, outputFile(path)), 'utf-8') }))
        .filter(({ html }) => !NOINDEX_RE.test(html))
        .map(({ path, html }) => {
          const priority = path === '/' ? '1.0' : path.split('/').length > 3 ? '0.7' : '0.8';
          // Articles : date de leur dernière modification ; autres pages : date du build.
          const lastmod = html.match(MODIFIED_RE)?.[1].slice(0, 10) ?? today;
          return [
            '  <url>',
            `    <loc>${siteUrl}${path}</loc>`,
            `    <lastmod>${lastmod}</lastmod>`,
            `    <priority>${priority}</priority>`,
            '  </url>',
          ].join('\n');
        });

      writeFileSync(
        join(outDir, 'sitemap.xml'),
        [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls,
          '</urlset>',
          '',
        ].join('\n'),
      );

      writeFileSync(
        join(outDir, 'robots.txt'),
        [
          'User-agent: *',
          ...disallow.map((path) => `Disallow: ${path}`),
          '',
          `Sitemap: ${siteUrl}/sitemap.xml`,
          '',
        ].join('\n'),
      );
    },
  };
}
