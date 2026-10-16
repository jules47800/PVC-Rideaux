import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import site from './site.config.js';
import { htmlTemplates } from './vite-plugins/html-templates.js';
import { findHtmlPages, toBuildInput } from './vite-plugins/pages.js';
import { sitemap } from './vite-plugins/sitemap.js';

const projectDir = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(projectDir, 'src');
const partialsDir = resolve(rootDir, 'partials');

// Chaque fichier .html de src/ (hors partials) devient une page du site.
const pages = findHtmlPages(rootDir, { ignore: [partialsDir] });

// En dev, les adresses gérées par PHP (blog, espace d'édition, formulaires)
// sont transmises au serveur lancé par `npm run serve:php` (après un build).
const phpServer = process.env.PHP_SERVER ?? 'http://localhost:8000';
const phpPaths = ['/blog', '/admin', '/api', '/uploads', '/sitemap-blog.xml'];

export default defineConfig({
  root: rootDir,
  publicDir: resolve(projectDir, 'public'),
  // Site multi-pages : pas de redirection SPA, une vraie 404 en dev.
  appType: 'mpa',

  resolve: {
    alias: {
      '@fonts': resolve(projectDir, 'node_modules/@fontsource-variable'),
    },
  },

  server: {
    proxy: Object.fromEntries(phpPaths.map((path) => [path, phpServer])),
  },

  build: {
    outDir: resolve(projectDir, 'dist'),
    emptyOutDir: true,
    rolldownOptions: {
      input: toBuildInput(pages, rootDir),
    },
  },

  plugins: [
    htmlTemplates({ root: rootDir, partialsDir, site }),
    sitemap({
      root: rootDir,
      pages,
      siteUrl: site.url,
      // Pages techniques, et gabarit du blog (lu uniquement par PHP)
      exclude: ['/404.html', '/merci/', '/blog/_layout.html'],
      // Plan des articles, généré à la volée par public/blog/sitemap.php
      extraSitemaps: ['/sitemap-blog.xml'],
      disallow: ['/admin/', '/api/'],
    }),
  ],
});
