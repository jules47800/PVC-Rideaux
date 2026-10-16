import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Liste récursivement les fichiers HTML d'un dossier (les pages du site).
 *
 * @param {string} dir Dossier racine à parcourir (racine Vite).
 * @param {{ ignore?: string[] }} [options] Dossiers absolus à exclure (ex. partials).
 * @returns {string[]} Chemins absolus des pages, triés.
 */
export function findHtmlPages(dir, { ignore = [] } = {}) {
  const pages = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (ignore.includes(fullPath)) continue;

    if (entry.isDirectory()) {
      pages.push(...findHtmlPages(fullPath, { ignore }));
    } else if (entry.name.endsWith('.html')) {
      pages.push(fullPath);
    }
  }

  return pages.sort();
}

/**
 * Convertit le chemin d'un fichier HTML en URL publique.
 *   src/index.html                 → /
 *   src/professionnels/index.html  → /professionnels/
 *   src/404.html                   → /404.html
 *
 * @param {string} file Chemin absolu du fichier HTML.
 * @param {string} root Racine Vite.
 * @returns {string}
 */
export function toPagePath(file, root) {
  const rel = relative(root, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

/**
 * Construit l'objet `input` attendu par Vite/Rolldown pour un build multi-pages.
 *
 * @param {string[]} pages Chemins absolus des pages.
 * @param {string} root Racine Vite.
 * @returns {Record<string, string>}
 */
export function toBuildInput(pages, root) {
  return Object.fromEntries(
    pages.map((file) => {
      const name = relative(root, file)
        .split(sep)
        .join('/')
        .replace(/\.html$/, '');
      return [name, file];
    }),
  );
}
