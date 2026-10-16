/**
 * Tableau de bord (admin/index.php) : note SEO de chaque article, note
 * moyenne, actions prioritaires sur les articles en ligne, confirmation avant
 * suppression.
 */
import { fetchArticles } from './api.js';
import { analyzeArticle, prioritizedActions, scoreLevel } from './seo-checker.js';

const PRIORITY_ACTIONS_MAX = 8;

// Confirmation avant de placer un article dans la corbeille
document.querySelectorAll('form[data-confirm]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    if (!window.confirm(form.dataset.confirm)) event.preventDefault();
  });
});

function renderPriorityActions(entries) {
  const section = document.querySelector('[data-priority-actions]');
  if (!section || entries.length === 0) return;

  const items = entries.slice(0, PRIORITY_ACTIONS_MAX).map(({ article, check }) => {
    const item = document.createElement('li');
    item.className = `priority priority--${check.status}`;

    const link = document.createElement('a');
    link.href = `/admin/edit.php?slug=${encodeURIComponent(article.slug)}`;
    link.textContent = article.title;

    const title = document.createElement('strong');
    title.textContent = check.title;
    const detail = document.createElement('span');
    detail.textContent = check.detail;

    item.append(title, detail, link);
    return item;
  });

  section.querySelector('[data-priority-list]').replaceChildren(...items);
  section.hidden = false;
}

async function scoreArticles() {
  const articles = await fetchArticles();
  const publishedScores = [];
  const actions = [];

  articles.forEach((article) => {
    const result = analyzeArticle(article, { otherArticles: articles });
    const pill = document.querySelector(`[data-score-for="${CSS.escape(article.slug)}"]`);
    if (pill) {
      pill.textContent = `${result.score}`;
      pill.dataset.level = result.level.key;
      pill.title = result.level.label;
    }

    if (article.state === 'published') {
      publishedScores.push(result.score);
      prioritizedActions(result.checks).forEach((check) => actions.push({ article, check }));
    }
  });

  if (publishedScores.length) {
    const average = Math.round(
      publishedScores.reduce((sum, score) => sum + score, 0) / publishedScores.length,
    );
    const output = document.querySelector('[data-average-score]');
    output.textContent = `${average}`;
    output.dataset.level = scoreLevel(average).key;
  }

  // Les plus graves et les plus importantes d'abord, en variant les articles.
  const severity = { bad: 0, improve: 1 };
  const seen = new Map();
  actions
    .sort(
      (a, b) =>
        severity[a.check.status] - severity[b.check.status] || b.check.weight - a.check.weight,
    )
    .forEach((entry) => {
      const count = seen.get(entry.article.slug) ?? 0;
      entry.rank = count;
      seen.set(entry.article.slug, count + 1);
    });
  actions.sort(
    (a, b) =>
      a.rank - b.rank ||
      severity[a.check.status] - severity[b.check.status] ||
      b.check.weight - a.check.weight,
  );

  renderPriorityActions(actions);
}

scoreArticles().catch(() => {
  document.querySelectorAll('[data-score-for]').forEach((pill) => {
    pill.textContent = '?';
    pill.title = 'Note indisponible : rechargez la page.';
  });
});
