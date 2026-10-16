/**
 * « Ignored Build Step » de Vercel (vercel.json → ignoreCommand).
 *
 * L'espace d'édition crée un commit à chaque enregistrement, brouillons
 * compris. Pour ne pas reconstruire le site inutilement, le déploiement est
 * sauté quand, depuis le dernier déploiement réussi, seuls ont changé :
 *   - des articles qui n'étaient et ne sont toujours pas visibles du public
 *     (brouillons, articles programmés) ;
 *   - des images envoyées (public/uploads/) ou la corbeille (content/corbeille/).
 * Dans tous les autres cas, ou au moindre doute, le site est reconstruit.
 * En particulier, un déploiement sans aucun fichier modifié (bouton « Redeploy »
 * après un changement de variables d'environnement, Deploy Hook de la tâche
 * planifiée des articles programmés) est toujours construit : il est volontaire.
 *
 * Convention Vercel : code de sortie 0 = ne pas construire, 1 = construire.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

import { isPublic, normalizeArticle } from '../lib/blog/model.js';

const ARTICLE_RE = /^content\/articles\/[^/]+\.json$/;
const IGNORED_PREFIXES = ['public/uploads/', 'content/corbeille/'];

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });

function build(reason) {
  console.log(`Construction du site : ${reason}`);
  process.exit(1);
}

/** Article visible du public dans cette version du fichier (null si absent ou illisible). */
function visible(content) {
  if (content === null) return false;
  try {
    return isPublic(normalizeArticle(JSON.parse(content)));
  } catch {
    return true; // fichier illisible : on reconstruit par prudence
  }
}

const previous = process.env.VERCEL_GIT_PREVIOUS_SHA;
if (!previous) build('premier déploiement ou commit précédent inconnu.');

let changed;
try {
  changed = git('diff', '--name-only', previous, 'HEAD').split('\n').filter(Boolean);
} catch {
  build('historique Git insuffisant pour comparer avec le dernier déploiement.');
}

if (changed.length === 0) build('redéploiement demandé (aucun fichier modifié).');

for (const path of changed) {
  if (IGNORED_PREFIXES.some((prefix) => path.startsWith(prefix))) continue;
  if (!ARTICLE_RE.test(path)) build(`${path} a changé.`);

  let before = null;
  try {
    before = git('show', `${previous}:${path}`);
  } catch {
    // Nouvel article.
  }
  const after = existsSync(path) ? readFileSync(path, 'utf-8') : null;
  if (visible(before) || visible(after)) build(`l'article en ligne ${path} a changé.`);
}

console.log(
  'Aucun changement visible (brouillons, articles programmés, images) : déploiement sauté.',
);
process.exit(0);
