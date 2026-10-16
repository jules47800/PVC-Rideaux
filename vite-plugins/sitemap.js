import { toPagePath } from './pages.js';

/**
 * Génère au moment du build :
 * - `sitemap-pages.xml` : les pages HTML statiques (ajouter une page suffit) ;
 * - `sitemap.xml` : l'index qui référence ce fichier et les plans générés
 *   côté serveur (`extraSitemaps`, ex. les articles du blog rendus par PHP) ;
 * - `robots.txt`.
 *
 * @param {{
 *   root: string,
 *   pages: string[],
 *   siteUrl: string,
 *   exclude?: string[],
 *   extraSitemaps?: string[],
 *   disallow?: string[],
 * }} options
 *   `exclude` : chemins publics à ne pas référencer (pages techniques) ;
 *   `extraSitemaps` : chemins de plans de site dynamiques à ajouter à l'index ;
 *   `disallow` : chemins interdits aux robots.
 * @returns {import('vite').Plugin}
 */
export function sitemap({ root, pages, siteUrl, exclude = [], extraSitemaps = [], disallow = [] }) {
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
        fileName: 'sitemap-pages.xml',
        source: [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls,
          '</urlset>',
          '',
        ].join('\n'),
      });

      const sitemaps = ['/sitemap-pages.xml', ...extraSitemaps].map((path) =>
        ['  <sitemap>', `    <loc>${siteUrl}${path}</loc>`, '  </sitemap>'].join('\n'),
      );

      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...sitemaps,
          '</sitemapindex>',
          '',
        ].join('\n'),
      });

      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: [
          'User-agent: *',
          ...disallow.map((path) => `Disallow: ${path}`),
          '',
          `Sitemap: ${siteUrl}/sitemap.xml`,
          '',
        ].join('\n'),
      });
    },
  };
}
