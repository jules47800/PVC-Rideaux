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
      exclude: ['/404.html', '/merci/'],
    }),
  ],
});
