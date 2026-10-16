/**
 * Envoi d'une image — POST /api/admin/upload  { name, data }
 *
 * L'image arrive déjà redimensionnée et compressée par le navigateur
 * (src/admin/scripts/image.js), encodée en base64 : 3 Mo maximum.
 */
import { saveImage } from '../../lib/admin/articles.js';
import { withSession } from '../../lib/admin/auth.js';
import { createContentStore } from '../../lib/admin/content-store.js';
import { handle, json, readJson } from '../../lib/http.js';

/** Base64 d'une image de 3 Mo, plus une marge pour le reste de la requête. */
const MAX_REQUEST_BYTES = 4_200_000;

export function POST(request) {
  return handle(() =>
    withSession(request, async ({ user }) => {
      const { name, data } = await readJson(request, MAX_REQUEST_BYTES);
      return json({ ok: true, ...(await saveImage(createContentStore(), { name, data, user })) });
    }),
  );
}
