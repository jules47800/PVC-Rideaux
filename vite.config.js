import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { generateBlog } from './lib/blog/generate.js';
import site from './site.config.js';
import { blog } from './vite-plugins/blog.js';
import { devApi } from './vite-plugins/dev-api.js';
import { htmlTemplates } from './vite-plugins/html-templates.js';
import { findHtmlPages, toBuildInput } from './vite-plugins/pages.js';
import { sitemap } from './vite-plugins/sitemap.js';

const projectDir = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(projectDir, 'src');
const partialsDir = resolve(rootDir, 'partials');
const publicDir = resolve(projectDir, 'public');

// Pages du blog générées depuis content/articles/ (dossiers src/blog/ et
// src/partials/blog/, non versionnés), avant la découverte des pages.
const blogOptions = {
  contentDir: resolve(projectDir, 'content/articles'),
  pagesDir: resolve(rootDir, 'blog'),
  partialsDir: resolve(partialsDir, 'blog'),
  publicDir,
  siteUrl: site.url,
};
const blogResult = generateBlog(blogOptions);

// Chaque fichier .html de src/ (hors partials) devient une page du site.
const pages = findHtmlPages(rootDir, { ignore: [partialsDir] });

export default defineConfig({
  root: rootDir,
  publicDir,
  // Site multi-pages : pas de redirection SPA, une vraie 404 en dev.
  appType: 'mpa',

  resolve: {
    alias: {
      '@fonts': resolve(projectDir, 'node_modules/@fontsource-variable'),
    },
  },

  server: {
    // Les modules partagés de lib/ (blog, vérification SEO) sont hors de src/.
    fs: { allow: [projectDir] },
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
    blog({ ...blogOptions, initial: blogResult }),
    devApi({ projectDir }),
    sitemap({
      root: rootDir,
      pages,
      siteUrl: site.url,
      // Pages techniques (les pages « noindex » sont écartées automatiquement)
      exclude: ['/404.html', '/merci/'],
      disallow: ['/admin/', '/api/'],
    }),
  ],
});
