/**
 * Stockage des articles et des images de l'espace d'édition.
 *
 * - En production (Vercel) : les fichiers sont enregistrés dans le dépôt Git
 *   via l'API GitHub. Chaque enregistrement est un commit, qui déclenche un
 *   nouveau déploiement : le blog est regénéré en pages statiques.
 *   Variables : GITHUB_CONTENT_TOKEN (jeton « fine-grained », droit Contents en
 *   lecture/écriture sur le dépôt), et facultativement GITHUB_CONTENT_REPO
 *   (« propriétaire/depot ») et GITHUB_CONTENT_BRANCH, déduits sinon du déploiement Vercel.
 * - En local (`npm run dev`, sans GITHUB_CONTENT_TOKEN) : écriture directe dans les
 *   fichiers du projet ; les pages se regénèrent aussitôt.
 *
 * Interface commune (chemins relatifs à la racine du dépôt) :
 *   list(dir)                       → [{ path, sha }]  fichiers du dossier
 *   read(path)                      → { content: Buffer, sha } | null
 *   readListed(files)               → [{ path, sha, content: Buffer }]  contenu des fichiers listés
 *   commit({ message, author, changes: [{ path, content: string | Buffer | null }] })
 *                                   → { commit: sha | null }   (content null = suppression)
 * Le « sha » d'un fichier est son empreinte Git : identique dans les deux modes.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { HttpError } from '../http.js';

const PROJECT_DIR = fileURLToPath(new URL('../../', import.meta.url));
const GITHUB_API = 'https://api.github.com';
const COMMIT_ATTEMPTS = 3;

/** Empreinte Git d'un contenu (comme `git hash-object`). */
export function gitBlobSha(content) {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return createHash('sha1').update(`blob ${buffer.length}\0`).update(buffer).digest('hex');
}

/* --------------------------------------------------------------------------
   Fichiers locaux (développement)
   -------------------------------------------------------------------------- */

class FileSystemStore {
  mode = 'local';

  constructor(root = PROJECT_DIR) {
    this.root = root;
  }

  async list(dir) {
    try {
      return readdirSync(join(this.root, dir), { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => {
          const path = `${dir}/${entry.name}`;
          return { path, sha: gitBlobSha(readFileSync(join(this.root, path))) };
        });
    } catch {
      return [];
    }
  }

  async read(path) {
    try {
      const content = readFileSync(join(this.root, path));
      return { content, sha: gitBlobSha(content) };
    } catch {
      return null;
    }
  }

  async readListed(files) {
    return files.map(({ path, sha }) => ({
      path,
      sha,
      content: readFileSync(join(this.root, path)),
    }));
  }

  async commit({ changes }) {
    for (const { path, content } of changes) {
      const target = join(this.root, path);
      if (content === null) {
        rmSync(target, { force: true });
        continue;
      }
      mkdirSync(dirname(target), { recursive: true });
      // Écriture atomique : le fichier n'est jamais lu à moitié écrit (génération du blog).
      const temporary = `${target}.${process.pid}.tmp`;
      writeFileSync(temporary, content);
      renameSync(temporary, target);
    }
    return { commit: null };
  }
}

/* --------------------------------------------------------------------------
   Dépôt GitHub (production)
   -------------------------------------------------------------------------- */

class GitHubStore {
  mode = 'github';
  /** Contenus déjà téléchargés, par empreinte (immuables). */
  #blobs = new Map();

  constructor({ token, repository, branch, fetchImpl = fetch }) {
    this.token = token;
    this.repository = repository;
    this.branch = branch;
    this.fetch = fetchImpl;
  }

  async api(method, path, body, { allowMissing = false } = {}) {
    const response = await this.fetch(`${GITHUB_API}/repos/${this.repository}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'isorideaux-espace-edition',
        ...(body && { 'Content-Type': 'application/json' }),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (allowMissing && response.status === 404) return null;
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      const error = new Error(
        `GitHub ${method} ${path} → ${response.status} ${detail.slice(0, 200)}`,
      );
      error.status = response.status;
      throw error;
    }
    return response.status === 204 ? null : response.json();
  }

  #contentsPath(path) {
    return `/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(this.branch)}`;
  }

  async list(dir) {
    const items = await this.api('GET', this.#contentsPath(dir), undefined, { allowMissing: true });
    return Array.isArray(items)
      ? items.filter((item) => item.type === 'file').map(({ path, sha }) => ({ path, sha }))
      : [];
  }

  async #blob(sha) {
    if (!this.#blobs.has(sha)) {
      const blob = await this.api('GET', `/git/blobs/${sha}`);
      this.#blobs.set(sha, Buffer.from(blob.content, 'base64'));
    }
    return this.#blobs.get(sha);
  }

  async read(path) {
    const item = await this.api('GET', this.#contentsPath(path), undefined, { allowMissing: true });
    if (!item || item.type !== 'file') return null;
    return { content: await this.#blob(item.sha), sha: item.sha };
  }

  /** Lit plusieurs fichiers listés (contenus mis en cache par empreinte). */
  async readListed(files) {
    return Promise.all(
      files.map(async ({ path, sha }) => ({ path, sha, content: await this.#blob(sha) })),
    );
  }

  async commit({ message, author, changes }) {
    const tree = await Promise.all(
      changes.map(async ({ path, content }) => {
        if (content === null) return { path, mode: '100644', type: 'blob', sha: null };
        if (Buffer.isBuffer(content)) {
          const blob = await this.api('POST', '/git/blobs', {
            content: content.toString('base64'),
            encoding: 'base64',
          });
          return { path, mode: '100644', type: 'blob', sha: blob.sha };
        }
        return { path, mode: '100644', type: 'blob', content };
      }),
    );

    // Si quelqu'un d'autre a poussé entre-temps, on repart du dernier commit.
    for (let attempt = 1; ; attempt += 1) {
      const ref = await this.api('GET', `/git/ref/heads/${encodeURIComponent(this.branch)}`);
      const head = await this.api('GET', `/git/commits/${ref.object.sha}`);
      const newTree = await this.api('POST', '/git/trees', { base_tree: head.tree.sha, tree });
      const commit = await this.api('POST', '/git/commits', {
        message,
        tree: newTree.sha,
        parents: [ref.object.sha],
        ...(author && { author: { ...author, date: new Date().toISOString() } }),
      });
      try {
        await this.api('PATCH', `/git/refs/heads/${encodeURIComponent(this.branch)}`, {
          sha: commit.sha,
        });
        return { commit: commit.sha };
      } catch (error) {
        if (error.status !== 422 || attempt >= COMMIT_ATTEMPTS) throw error;
      }
    }
  }
}

/* --------------------------------------------------------------------------
   Choix du stockage
   -------------------------------------------------------------------------- */

/** Stockage adapté à l'environnement (voir en-tête du fichier). */
export function createContentStore() {
  const token = process.env.GITHUB_CONTENT_TOKEN;
  if (token) {
    const repository =
      process.env.GITHUB_CONTENT_REPO ||
      (process.env.VERCEL_GIT_REPO_OWNER &&
        `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`);
    const branch = process.env.GITHUB_CONTENT_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || 'main';
    if (!repository)
      throw new HttpError(503, 'Dépôt GitHub inconnu : renseignez GITHUB_CONTENT_REPO.');
    return new GitHubStore({ token, repository, branch });
  }

  // Sur Vercel, le disque est en lecture seule : le dépôt GitHub est indispensable.
  if (process.env.VERCEL) {
    throw new HttpError(
      503,
      'Enregistrement impossible : la variable GITHUB_CONTENT_TOKEN n’est pas configurée sur Vercel.',
    );
  }
  return new FileSystemStore();
}

export { FileSystemStore, GitHubStore };
