/**
 * Tableau de bord (/admin/) : liste des articles avec leur note SEO, compteurs,
 * actions prioritaires sur les articles en ligne, idées d'articles, mise à la corbeille.
 */
import { availableIdeas } from '../../../lib/blog/ideas.js';
import { CATEGORIES, STATE_LABELS, escapeHtml, formatDateFr } from '../../../lib/blog/model.js';
import { analyzeArticle, prioritizedActions, scoreLevel } from '../../../lib/blog/seo-checker.js';
import { deleteArticle, fetchArticles } from './api.js';
import { requireSession, setFlash, showFlash } from './session.js';

const PRIORITY_ACTIONS_MAX = 8;
const SEVERITY = { bad: 0, improve: 1 };

const $ = (selector) => document.querySelector(selector);
const editUrl = (slug) => `/admin/article/?slug=${encodeURIComponent(slug)}`;

/* --------------------------------------------------------------------------
   Rendu
   -------------------------------------------------------------------------- */

function articleRow(article, result) {
  const keyword = article.keyword ? ` · « ${escapeHtml(article.keyword)} »` : '';
  const isLive = article.state === 'published';
  return `<tr>
    <td data-label="Article">
      <a class="articles-table__title" href="${editUrl(article.slug)}">${escapeHtml(article.title || 'Sans titre')}</a>
      <span class="articles-table__meta">${escapeHtml(CATEGORIES[article.category])}${keyword}</span>
    </td>
    <td data-label="État"><span class="badge badge--${article.state}">${STATE_LABELS[article.state]}</span></td>
    <td data-label="Date">${escapeHtml(article.publishedAt ? formatDateFr(article.publishedAt) : '—')}</td>
    <td data-label="Note SEO"><span class="score-pill" data-level="${result.level.key}" title="${escapeHtml(result.level.label)}">${result.score}</span></td>
    <td class="articles-table__actions">
      <a class="btn btn--small" href="${editUrl(article.slug)}">Modifier</a>
      ${isLive ? `<a class="btn btn--small btn--ghost" href="${escapeHtml(article.url)}" target="_blank" rel="noopener">Voir</a>` : ''}
      <button class="btn btn--small btn--danger" type="button" data-delete="${escapeHtml(article.slug)}" data-title="${escapeHtml(article.title)}">Supprimer</button>
    </td>
  </tr>`;
}

function renderPriorityActions(entries) {
  const section = $('[data-priority-actions]');
  section.hidden = entries.length === 0;
  $('[data-priority-list]').innerHTML = entries
    .slice(0, PRIORITY_ACTIONS_MAX)
    .map(
      ({ article, check }) => `<li class="priority priority--${check.status}">
        <strong>${escapeHtml(check.title)}</strong>
        <span>${escapeHtml(check.detail)}</span>
        <a href="${editUrl(article.slug)}">${escapeHtml(article.title)}</a>
      </li>`,
    )
    .join('');
}

function renderIdeas(articles) {
  const ideas = availableIdeas(articles);
  $('[data-ideas]').hidden = ideas.length === 0;
  $('[data-ideas-list]').innerHTML = ideas
    .map(
      ([index, idea]) => `<li class="idea">
        <span class="idea__category">${escapeHtml(CATEGORIES[idea.category])}</span>
        <h3>${escapeHtml(idea.title)}</h3>
        <p class="idea__keyword">Expression clé : <strong>« ${escapeHtml(idea.keyword)} »</strong></p>
        <p class="text-muted">${escapeHtml(idea.why)}</p>
        <a class="btn btn--small" href="/admin/article/?idee=${index}">Rédiger cet article</a>
      </li>`,
    )
    .join('');
}

function render(articles) {
  const results = new Map(
    articles.map((article) => [article.slug, analyzeArticle(article, { otherArticles: articles })]),
  );

  // Compteurs
  ['published', 'scheduled', 'draft'].forEach((state) => {
    $(`[data-count="${state}"]`).textContent = articles.filter(
      (article) => article.state === state,
    ).length;
  });
  const live = articles.filter((article) => article.state === 'published');
  const average = $('[data-average-score]');
  if (live.length) {
    const score = Math.round(
      live.reduce((sum, article) => sum + results.get(article.slug).score, 0) / live.length,
    );
    average.textContent = score;
    average.dataset.level = scoreLevel(score).key;
  }

  // Liste
  $('[data-articles-loading]').hidden = true;
  $('[data-articles-empty]').hidden = articles.length > 0;
  $('[data-articles-table]').hidden = articles.length === 0;
  $('[data-articles-body]').innerHTML = articles
    .map((article) => articleRow(article, results.get(article.slug)))
    .join('');

  // Actions prioritaires : les plus graves et importantes d'abord, en alternant les articles.
  const actions = live.flatMap((article) =>
    prioritizedActions(results.get(article.slug).checks).map((check, rank) => ({
      article,
      check,
      rank,
    })),
  );
  actions.sort(
    (a, b) =>
      a.rank - b.rank ||
      SEVERITY[a.check.status] - SEVERITY[b.check.status] ||
      b.check.weight - a.check.weight,
  );
  renderPriorityActions(actions);

  renderIdeas(articles);
}

/* --------------------------------------------------------------------------
   Suppression
   -------------------------------------------------------------------------- */

$('[data-articles-body]').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-delete]');
  if (!button) return;
  if (
    !window.confirm(
      `Placer « ${button.dataset.title} » dans la corbeille ? Il ne sera plus visible sur le site.`,
    )
  ) {
    return;
  }

  button.disabled = true;
  try {
    const { commit, goesLive } = await deleteArticle(button.dataset.delete);
    setFlash(
      'success',
      commit && goesLive
        ? 'Article placé dans la corbeille. Il disparaîtra du site d’ici une à deux minutes.'
        : 'Article placé dans la corbeille.',
    );
    window.location.reload();
  } catch (error) {
    window.alert(error.message);
    button.disabled = false;
  }
});

/* --------------------------------------------------------------------------
   Démarrage
   -------------------------------------------------------------------------- */

await requireSession();
showFlash($('[data-flash]'));
try {
  render(await fetchArticles());
} catch (error) {
  $('[data-articles-loading]').textContent = error.message;
}
