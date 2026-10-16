/**
 * Déconnexion — POST /api/admin/logout
 */
import { assertSameOrigin, clearedSessionCookie } from '../../lib/admin/auth.js';
import { handle, json } from '../../lib/http.js';

export function POST(request) {
  return handle(async () => {
    assertSameOrigin(request);
    return json({ ok: true }, 200, { 'Set-Cookie': clearedSessionCookie(request) });
  });
}
