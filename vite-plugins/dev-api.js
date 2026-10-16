import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';

import { loadEnv } from 'vite';

/**
 * Exécute les fonctions Vercel de api/ dans `npm run dev` et `npm run preview`,
 * pour tester formulaires et espace d'édition sans compte Vercel.
 *
 *   /api/send          → api/send.js          (export async function POST(request))
 *   /api/admin/login   → api/admin/login.js
 *
 * Les fonctions utilisent l'API web standard (Request / Response), comme sur
 * Vercel. Les variables d'environnement sont lues dans .env, .env.local…
 * (voir .env.example) ; sans GITHUB_CONTENT_TOKEN, les articles sont enregistrés
 * directement dans content/ (lib/admin/content-store.js).
 *
 * `npm run preview` applique en plus les en-têtes communs de vercel.json
 * (dont la Content-Security-Policy), pour tester dans les conditions de la production.
 *
 * @param {{ projectDir: string }} options
 * @returns {import('vite').Plugin}
 */
export function devApi({ projectDir }) {
  const apiDir = join(projectDir, 'api');

  /** Fichier de la fonction pour une URL, ou null. */
  const resolveFunction = (pathname) => {
    const name = pathname.replace(/^\/api\//, '').replace(/\/$/, '');
    if (!/^[a-z0-9/-]+$/.test(name)) return null;
    const file = join(apiDir, `${name}.js`);
    return existsSync(file) ? file : null;
  };

  const toRequest = (req) => {
    const headers = new Headers();
    Object.entries(req.headers).forEach(([name, value]) => {
      (Array.isArray(value) ? value : [value]).forEach((item) => headers.append(name, item));
    });
    const hasBody = !['GET', 'HEAD'].includes(req.method);
    return new Request(new URL(req.originalUrl ?? req.url, `http://${req.headers.host}`), {
      method: req.method,
      headers,
      body: hasBody ? Readable.toWeb(req) : undefined,
      duplex: hasBody ? 'half' : undefined,
    });
  };

  const sendResponse = async (res, response) => {
    res.statusCode = response.status;
    response.headers.forEach((value, name) => {
      if (name !== 'set-cookie') res.setHeader(name, value);
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader('set-cookie', cookies);
    res.end(Buffer.from(await response.arrayBuffer()));
  };

  const middleware = (loadModule) => async (req, res, next) => {
    const { pathname } = new URL(req.originalUrl ?? req.url, 'http://localhost');
    if (!pathname.startsWith('/api/')) return next();

    const file = resolveFunction(pathname);
    if (!file) {
      res.statusCode = 404;
      res.end('Fonction introuvable');
      return;
    }

    try {
      const module = await loadModule(file);
      const handler = module[req.method];
      if (typeof handler !== 'function') {
        res.statusCode = 405;
        res.end('Méthode non autorisée');
        return;
      }
      await sendResponse(res, await handler(toRequest(req)));
    } catch (error) {
      console.error(`[api] ${pathname}`, error);
      res.statusCode = 500;
      res.end('Erreur de la fonction (voir le terminal)');
    }
  };

  const loadEnvironment = (mode) => {
    const env = loadEnv(mode, projectDir, '');
    Object.entries(env).forEach(([key, value]) => {
      process.env[key] ??= value;
    });
  };

  return {
    name: 'isorideaux:dev-api',

    configureServer(server) {
      loadEnvironment(server.config.mode);
      server.middlewares.use(middleware((file) => server.ssrLoadModule(file)));
    },

    configurePreviewServer(server) {
      loadEnvironment('production');
      const vercel = JSON.parse(readFileSync(join(projectDir, 'vercel.json'), 'utf-8'));
      const globalHeaders = vercel.headers.find((rule) => rule.source === '/(.*)')?.headers ?? [];
      server.middlewares.use((req, res, next) => {
        globalHeaders.forEach(({ key, value }) => res.setHeader(key, value));
        next();
      });
      server.middlewares.use(middleware((file) => import(pathToFileURL(file).href)));
    },
  };
}
