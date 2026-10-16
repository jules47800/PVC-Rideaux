/**
 * Session de l'espace d'édition — GET /api/admin/session
 *
 * 200 { user, storage }  connecté (storage : « github » ou « local »)
 * 401                    non connecté
 * 503 { setup: true }    espace non configuré (ADMIN_USERS / ADMIN_SECRET manquants)
 */
import { withSession } from '../../lib/admin/auth.js';
import { handle, json } from '../../lib/http.js';

export function GET(request) {
  return handle(() =>
    withSession(request, async ({ user }) =>
      json({ ok: true, user, storage: process.env.GITHUB_CONTENT_TOKEN ? 'github' : 'local' }),
    ),
  );
}
