import { generateBlog } from '../lib/blog/generate.js';

/**
 * Blog : régénère les pages quand un article change (en dev) et ajoute au
 * build le flux RSS et `build-info.json`.
 *
 * La génération elle-même a lieu dans vite.config.js, avant la découverte des
 * pages (voir lib/blog/generate.js).
 *
 * `build-info.json` indique le commit déployé et les articles en ligne : l'espace
 * d'édition s'en sert pour savoir quand une publication est visible, et la
 * tâche planifiée (api/cron/publish.js) pour mettre en ligne les articles programmés.
 *
 * @param {Parameters<typeof generateBlog>[0] & { initial: ReturnType<typeof generateBlog> }} options
 * @returns {import('vite').Plugin}
 */
export function blog({ initial, ...options }) {
  let result = initial;

  return {
    name: 'isorideaux:blog',

    // En dev, un article modifié (fichier ou espace d'édition) regénère les pages ;
    // Vite recharge ensuite les pages du blog ouvertes qui ont changé.
    configureServer(server) {
      server.watcher.add(options.contentDir);
      const regenerate = (file) => {
        if (file.startsWith(options.contentDir)) result = generateBlog(options);
      };
      server.watcher.on('add', regenerate);
      server.watcher.on('change', regenerate);
      server.watcher.on('unlink', regenerate);
    },

    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'blog/feed.xml', source: result.feed });
      this.emitFile({
        type: 'asset',
        fileName: 'build-info.json',
        source: `${JSON.stringify(
          {
            commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
            builtAt: new Date().toISOString(),
            published: result.published.map((article) => article.slug),
          },
          null,
          2,
        )}\n`,
      });
    },
  };
}
