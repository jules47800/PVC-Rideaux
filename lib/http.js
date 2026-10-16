/**
 * Petits outils HTTP communs aux fonctions Vercel (api/), qui utilisent
 * l'API web standard Request / Response.
 */

export const isProduction = () => process.env.VERCEL_ENV === 'production';

/** Réponse JSON, jamais mise en cache. */
export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

export const redirect = (location, status = 303) =>
  new Response(null, { status, headers: { Location: location, 'Cache-Control': 'no-store' } });

/** Erreur prévue, avec son code HTTP et un message affichable. */
export class HttpError extends Error {
  constructor(status, message, details = {}) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Corps JSON d'une requête, avec une taille maximale (octets). */
export async function readJson(request, maxBytes = 1_000_000) {
  if (!request.headers.get('content-type')?.includes('application/json')) {
    throw new HttpError(415, 'Format de requête attendu : JSON.');
  }
  const text = await request.text();
  if (Buffer.byteLength(text) > maxBytes) throw new HttpError(413, 'Requête trop volumineuse.');
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Requête illisible.');
  }
}

/** Adresse IP du visiteur (derrière le proxy Vercel). */
export const clientIp = (request) =>
  request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
  request.headers.get('x-real-ip') ||
  'inconnue';

/**
 * Limiteur de fréquence en mémoire. Sur Vercel, chaque instance de fonction a
 * sa propre mémoire : c'est une protection d'appoint (le pare-feu Vercel peut
 * compléter, voir README).
 */
export function createRateLimiter({ windowMs, max }) {
  const hits = new Map();
  return {
    /** true si la clé a dépassé sa limite ; sinon enregistre la tentative. */
    limited(key) {
      const now = Date.now();
      const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return true;
      }
      recent.push(now);
      hits.set(key, recent);
      if (hits.size > 5000) hits.delete(hits.keys().next().value);
      return false;
    },
    reset(key) {
      hits.delete(key);
    },
  };
}

/** Exécute un gestionnaire et convertit les erreurs en réponses JSON propres. */
export async function handle(run) {
  try {
    return await run();
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ ok: false, message: error.message, ...error.details }, error.status);
    }
    console.error(error);
    return json({ ok: false, message: 'Erreur interne du serveur. Merci de réessayer.' }, 500);
  }
}
