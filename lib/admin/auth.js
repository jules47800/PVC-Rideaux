/**
 * Authentification de l'espace d'édition (fonctions api/admin/*).
 *
 * Variables d'environnement (voir .env.example et le README) :
 *   ADMIN_USERS   comptes « identifiant:empreinte », séparés par des virgules.
 *                 L'empreinte (PBKDF2-SHA256, 600 000 itérations) se calcule sur la
 *                 page de connexion (mise en service) ou avec `npm run admin:password`.
 *   ADMIN_SECRET  clé secrète (32 caractères ou plus) qui signe le cookie de session.
 *
 * Session : cookie signé (HMAC-SHA256), HttpOnly, SameSite=Strict, Secure en
 * HTTPS, limité à /api/admin ; expire après 2 h d'inactivité et 12 h au plus.
 * Les requêtes qui modifient quelque chose doivent venir du site lui-même
 * (en-têtes Origin / Sec-Fetch-Site) et être en JSON.
 */
import { createHmac, pbkdf2 as pbkdf2Callback, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import { HttpError, json } from '../http.js';

const pbkdf2 = promisify(pbkdf2Callback);

const COOKIE_NAME = 'isorideaux_admin';
const COOKIE_PATH = '/api/admin';
const IDLE_SECONDS = 2 * 3600;
const MAX_SESSION_SECONDS = 12 * 3600;
const HASH_ALGORITHM = 'pbkdf2_sha256';
const HASH_ITERATIONS = 600_000;
const HASH_BYTES = 32;
const MIN_SECRET_LENGTH = 32;

/** Empreinte factice (mot de passe aléatoire) : même temps de réponse pour un identifiant inconnu. */
const DUMMY_HASH = `${HASH_ALGORITHM}:${HASH_ITERATIONS}:${randomBytes(16).toString('base64url')}:${randomBytes(HASH_BYTES).toString('base64url')}`;

/* --------------------------------------------------------------------------
   Configuration
   -------------------------------------------------------------------------- */

/** Comptes déclarés dans ADMIN_USERS : Map identifiant → empreinte. */
function configuredUsers() {
  const users = new Map();
  for (const entry of (process.env.ADMIN_USERS ?? '').split(/[\s,]+/).filter(Boolean)) {
    const separator = entry.indexOf(':');
    if (separator > 0) users.set(entry.slice(0, separator), entry.slice(separator + 1));
  }
  return users;
}

/** Variables manquantes pour activer l'espace d'édition (liste vide si tout est prêt). */
export function missingConfiguration() {
  const missing = [];
  if (configuredUsers().size === 0) missing.push('ADMIN_USERS');
  if ((process.env.ADMIN_SECRET ?? '').length < MIN_SECRET_LENGTH) missing.push('ADMIN_SECRET');
  return missing;
}

/* --------------------------------------------------------------------------
   Mots de passe
   -------------------------------------------------------------------------- */

/** Empreinte d'un mot de passe (pour ADMIN_USERS). */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await pbkdf2(password, salt, HASH_ITERATIONS, HASH_BYTES, 'sha256');
  return `${HASH_ALGORITHM}:${HASH_ITERATIONS}:${salt.toString('base64url')}:${hash.toString('base64url')}`;
}

async function verifyPassword(password, stored) {
  const [algorithm, iterations, salt, expected] = stored.split(':');
  if (algorithm !== HASH_ALGORITHM || !salt || !expected) return false;
  const expectedBytes = Buffer.from(expected, 'base64url');
  const actual = await pbkdf2(
    password,
    Buffer.from(salt, 'base64url'),
    Number(iterations),
    expectedBytes.length,
    'sha256',
  );
  return expectedBytes.length > 0 && timingSafeEqual(actual, expectedBytes);
}

/** Vérifie identifiant et mot de passe (temps constant que l'identifiant existe ou non). */
export async function checkCredentials(username, password) {
  const stored = configuredUsers().get(username);
  const valid = await verifyPassword(String(password ?? ''), stored ?? DUMMY_HASH);
  return valid && stored !== undefined;
}

/* --------------------------------------------------------------------------
   Cookie de session
   -------------------------------------------------------------------------- */

const signature = (payload) =>
  createHmac('sha256', process.env.ADMIN_SECRET ?? '')
    .update(payload)
    .digest('base64url');

function cookie(request, value, maxAge) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE_NAME}=${value}; Path=${COOKIE_PATH}; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${secure}`;
}

/** En-tête Set-Cookie d'une session (nouvelle ou prolongée). */
export function sessionCookie(request, user, startedAt = Math.floor(Date.now() / 1000)) {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = Math.min(now + IDLE_SECONDS, startedAt + MAX_SESSION_SECONDS);
  const payload = Buffer.from(JSON.stringify({ user, startedAt, expiresAt })).toString('base64url');
  return cookie(request, `${payload}.${signature(payload)}`, expiresAt - now);
}

export const clearedSessionCookie = (request) => cookie(request, '', 0);

/** Session valide de la requête, ou null. */
export function readSession(request) {
  if (missingConfiguration().length) return null;

  const raw = (request.headers.get('cookie') ?? '')
    .split(/;\s*/)
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
  const [payload, sent] = raw?.split('.') ?? [];
  if (!payload || !sent) return null;

  const expected = Buffer.from(signature(payload));
  const received = Buffer.from(sent);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const valid = session.expiresAt > Date.now() / 1000 && configuredUsers().has(session.user);
    return valid ? session : null;
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------------------
   Garde des fonctions
   -------------------------------------------------------------------------- */

/** Refuse les requêtes envoyées depuis un autre site (protection CSRF). */
export function assertSameOrigin(request) {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin') throw new HttpError(403, 'Requête refusée.');
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    throw new HttpError(403, 'Requête refusée.');
}

/**
 * Exécute une action réservée à l'équipe connectée et prolonge la session.
 * @param {Request} request
 * @param {(session: { user: string }) => Promise<Response>} action
 */
export async function withSession(request, action) {
  const missing = missingConfiguration();
  if (missing.length) {
    return json(
      { ok: false, setup: true, missing, message: 'Espace d’édition non configuré.' },
      503,
    );
  }
  if (request.method !== 'GET') assertSameOrigin(request);

  const session = readSession(request);
  if (!session) {
    return json({ ok: false, message: 'Session expirée : reconnectez-vous.' }, 401, {
      'Set-Cookie': clearedSessionCookie(request),
    });
  }

  const response = await action(session);
  response.headers.append('Set-Cookie', sessionCookie(request, session.user, session.startedAt));
  return response;
}
