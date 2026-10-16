/**
 * Connexion à l'espace d'édition — POST /api/admin/login  { username, password }
 *
 * 5 essais ratés par adresse IP sur 15 minutes (par instance de fonction),
 * puis blocage ; réponse ralentie en cas d'échec.
 */
import {
  assertSameOrigin,
  checkCredentials,
  missingConfiguration,
  sessionCookie,
} from '../../lib/admin/auth.js';
import { HttpError, clientIp, createRateLimiter, handle, json, readJson } from '../../lib/http.js';

const failures = createRateLimiter({ windowMs: 15 * 60_000, max: 5 });
const FAILURE_DELAY_MS = 600;

export function POST(request) {
  return handle(async () => {
    const missing = missingConfiguration();
    if (missing.length) {
      return json(
        { ok: false, setup: true, missing, message: 'Espace d’édition non configuré.' },
        503,
      );
    }
    assertSameOrigin(request);

    const ip = clientIp(request);
    const { username, password } = await readJson(request, 10_000);
    const user = String(username ?? '').trim();

    if (await checkCredentials(user, password)) {
      failures.reset(ip);
      return json({ ok: true, user }, 200, { 'Set-Cookie': sessionCookie(request, user) });
    }

    await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
    if (failures.limited(ip))
      throw new HttpError(429, 'Trop de tentatives : réessayez dans 15 minutes.');
    throw new HttpError(401, 'Identifiant ou mot de passe incorrect.');
  });
}
