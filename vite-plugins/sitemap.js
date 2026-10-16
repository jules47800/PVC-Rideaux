import { toPagePath } from './pages.js';

/**
 * Génère `sitemap.xml` et `robots.txt` au moment du build, à partir de la
 * liste des pages HTML. Aucune maintenance manuelle : ajouter une page suffit.
 *
 * @param {{ root: string, pages: string[], siteUrl: string, exclude?: string[] }} options
 *   `exclude` : chemins publics à ne pas référencer (pages techniques).
 * @returns {import('vite').Plugin}
 */
export function sitemap({ root, pages, siteUrl, exclude = [] }) {
  return {
    name: 'isorideaux:sitemap',
    apply: 'build',

    generateBundle() {
      const lastmod = new Date().toISOString().slice(0, 10);
      const urls = pages
        .map((file) => toPagePath(file, root))
        .filter((path) => !exclude.includes(path))
        .map((path) => {
          const priority = path === '/' ? '1.0' : path.split('/').length > 3 ? '0.7' : '0.8';
          return [
            '  <url>',
            `    <loc>${siteUrl}${path}</loc>`,
            `    <lastmod>${lastmod}</lastmod>`,
            `    <priority>${priority}</priority>`,
            '  </url>',
          ].join('\n');
        });

      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls,
          '</urlset>',
          '',
        ].join('\n'),
      });

      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: [
          'User-agent: *',
          'Disallow: /api/',
          '',
          `Sitemap: ${siteUrl}/sitemap.xml`,
          '',
        ].join('\n'),
      });
    },
  };
}
