/**
 * Affichage du résultat de la vérification SEO dans l'éditeur :
 * note (anneau), points à corriger, à améliorer, puis points validés (repliés).
 */
import { GROUPS, prioritizedActions } from './seo-checker.js';

const STATUS_LABELS = { bad: 'À corriger', improve: 'À améliorer', good: 'Validé' };

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function renderCheck(check) {
  const item = element('li', `check check--${check.status}`);
  item.append(element('span', 'visually-hidden', `${STATUS_LABELS[check.status]} : `));

  const body = element('div', 'check__body');
  body.append(element('p', 'check__title', check.title));
  if (check.detail) body.append(element('p', 'check__detail', check.detail));

  if (check.suggestions?.length) {
    const list = element('div', 'check__suggestions');
    list.append(element('span', 'check__suggestions-label', 'Pages à lier :'));
    check.suggestions.forEach((suggestion) => {
      const button = element('button', 'chip', `+ ${suggestion.label}`);
      button.type = 'button';
      button.dataset.insertLink = suggestion.url;
      button.dataset.linkLabel = suggestion.label;
      button.title = `Insérer un lien vers ${suggestion.url} à l’endroit du curseur`;
      list.append(button);
    });
    body.append(list);
  }

  if (check.link) {
    const link = element('a', 'check__link', check.link.label);
    link.href = check.link.url;
    link.target = '_blank';
    body.append(link);
  }

  item.append(body);
  item.title = GROUPS[check.group] ?? '';
  return item;
}

function renderList(checks) {
  const list = element('ul', 'checks');
  list.setAttribute('role', 'list');
  list.append(...checks.map(renderCheck));
  return list;
}

/**
 * @param {HTMLElement} panel  section [data-seo-panel]
 * @param {{ score: number, level: { key: string, label: string }, checks: object[] }} result
 */
export function renderSeoPanel(panel, result) {
  const ring = panel.querySelector('[data-score-ring]');
  ring.dataset.level = result.level.key;
  ring.style.setProperty('--score', result.score);
  panel.querySelector('[data-score-number]').textContent = result.score;
  panel.querySelector('[data-score-summary]').textContent = result.level.label;

  const toFix = prioritizedActions(result.checks);
  const validated = result.checks.filter((check) => check.status === 'good');
  const container = panel.querySelector('[data-seo-checks]');

  // Le panneau « points validés » garde son état ouvert / fermé entre deux analyses.
  const wasOpen = container.querySelector('details')?.open ?? false;
  const content = [];

  if (toFix.length) {
    content.push(
      element(
        'h3',
        'checks__title',
        `${toFix.length} action${toFix.length > 1 ? 's' : ''} à mener`,
      ),
      renderList(toFix),
    );
  } else {
    content.push(element('p', 'checks__done', 'Tout est en ordre : bravo !'));
  }

  if (validated.length) {
    const details = element('details', 'checks__validated');
    details.open = wasOpen;
    details.append(
      element(
        'summary',
        '',
        `${validated.length} point${validated.length > 1 ? 's' : ''} validé${validated.length > 1 ? 's' : ''}`,
      ),
      renderList(validated),
    );
    content.push(details);
  }

  container.replaceChildren(...content);
}
