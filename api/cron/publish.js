/**
 * Mise en ligne des articles programmés — tâche planifiée Vercel (voir vercel.json).
 *
 * Le blog étant généré au build, un article programmé n'apparaît qu'au
 * déploiement suivant sa date. Chaque jour, cette fonction compare les
 * articles dont la date est passée avec ceux du site en ligne
 * (/build-info.json) et, s'il en manque, relance un déploiement via le
 * « Deploy Hook » Vercel (variable DEPLOY_HOOK_URL).
 *
 * Vercel appelle cette adresse avec l'en-tête « Authorization: Bearer <CRON_SECRET> ».
 */
import { listArticles } from '../../lib/admin/articles.js';
import { createContentStore } from '../../lib/admin/content-store.js';
import { isPublic } from '../../lib/blog/model.js';
import { handle, json } from '../../lib/http.js';

export function GET(request) {
  return handle(async () => {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
      return json({ ok: false, message: 'Accès refusé.' }, 401);
    }

    const due = (await listArticles(createContentStore())).filter((article) => isPublic(article));
    const response = await fetch(new URL('/build-info.json', request.url), { cache: 'no-store' });
    const online = new Set(response.ok ? (await response.json()).published : []);
    const missing = due
      .filter((article) => !online.has(article.slug))
      .map((article) => article.slug);

    if (!missing.length) return json({ ok: true, deployed: false });
    if (!process.env.DEPLOY_HOOK_URL) {
      console.error(
        '[cron] Articles à mettre en ligne, mais DEPLOY_HOOK_URL est absent :',
        missing,
      );
      return json({ ok: false, message: 'DEPLOY_HOOK_URL non configuré.', missing }, 500);
    }

    const hook = await fetch(process.env.DEPLOY_HOOK_URL, { method: 'POST' });
    if (!hook.ok) throw new Error(`Deploy Hook → ${hook.status}`);
    return json({ ok: true, deployed: true, articles: missing });
  });
}
