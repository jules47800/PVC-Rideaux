/**
 * Articles du blog (espace d'édition).
 *
 *   GET    /api/admin/articles             tous les articles, brouillons compris
 *   POST   /api/admin/articles             enregistrement  { article, originalSlug?, baseSha? }
 *   DELETE /api/admin/articles?slug=…      mise à la corbeille
 *
 * Les réponses d'enregistrement indiquent le commit créé (`commit`, null en
 * local) et si le site doit être redéployé (`goesLive`) : l'espace d'édition
 * suit alors la mise en ligne grâce à /build-info.json.
 */
import { listArticles, saveArticle, trashArticle } from '../../lib/admin/articles.js';
import { withSession } from '../../lib/admin/auth.js';
import { createContentStore } from '../../lib/admin/content-store.js';
import { handle, json, readJson } from '../../lib/http.js';

export function GET(request) {
  return handle(() =>
    withSession(request, async () =>
      json({ ok: true, articles: await listArticles(createContentStore()) }),
    ),
  );
}

export function POST(request) {
  return handle(() =>
    withSession(request, async ({ user }) => {
      const { article, originalSlug, baseSha } = await readJson(request, 500_000);
      const result = await saveArticle(createContentStore(), {
        input: article ?? {},
        originalSlug: originalSlug || undefined,
        baseSha,
        user,
      });
      return json({ ok: true, ...result });
    }),
  );
}

export function DELETE(request) {
  return handle(() =>
    withSession(request, async ({ user }) => {
      const slug = new URL(request.url).searchParams.get('slug') ?? '';
      const result = await trashArticle(createContentStore(), { slug, user });
      return json({ ok: true, message: 'Article placé dans la corbeille.', ...result });
    }),
  );
}
