/**
 * Bloc « Nos derniers conseils » des pages statiques : récupère les derniers
 * articles du blog (public/blog/latest.php) et les affiche sous forme de
 * cartes, identiques à celles du blog (public/lib/views/post-card.php).
 *
 * Les articles de l'espace de la page (`<body data-space>`) passent en premier.
 * Sans réponse du serveur ou sans article, la section reste masquée.
 */
const CATEGORY_BY_SPACE = { pro: 'professionnels', particulier: 'particuliers' };
const POSTS_COUNT = 3;
const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Crée un élément avec ses attributs et ses enfants (texte ou nœuds).
 * @param {string} tag
 * @param {Record<string, string>} [attributes]
 * @param {(Node|string)[]} [children]
 */
function element(tag, attributes = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
  node.append(...children);
  return node;
}

function arrowIcon() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', '/icons.svg#i-arrow-right');
  svg.append(use);
  return svg;
}

/** @param {{ title: string, url: string, excerpt: string, categoryLabel: string, date: string, dateLabel: string, readingTime: number, cover: { src: string } | null }} post */
function createCard(post) {
  const media = post.cover
    ? [
        element('div', { class: 'post-card__media' }, [
          element('img', {
            src: post.cover.src,
            alt: '',
            width: '1200',
            height: '630',
            loading: 'lazy',
            decoding: 'async',
          }),
        ]),
      ]
    : [];

  return element('article', { class: 'post-card' }, [
    ...media,
    element('div', { class: 'post-card__body' }, [
      element('p', { class: 'post-meta' }, [
        element('span', { class: 'post-chip' }, [post.categoryLabel]),
        element('time', { datetime: post.date }, [post.dateLabel]),
        element('span', { 'aria-hidden': 'true' }, ['·']),
        element('span', {}, [`${post.readingTime} min de lecture`]),
      ]),
      element('h3', { class: 'post-card__title' }, [
        element('a', { href: post.url }, [post.title]),
      ]),
      element('p', { class: 'post-card__excerpt' }, [post.excerpt]),
      element('span', { class: 'link-arrow' }, ['Lire l’article ', arrowIcon()]),
    ]),
  ]);
}

export async function initLatestPosts() {
  const section = document.querySelector('[data-latest-posts]');
  const list = section?.querySelector('[data-latest-posts-list]');
  if (!section || !list) return;

  const params = new URLSearchParams({ limit: String(POSTS_COUNT) });
  const category = CATEGORY_BY_SPACE[document.body.dataset.space];
  if (category) params.set('categorie', category);

  try {
    const response = await fetch(`/blog/latest.php?${params}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return;
    const { articles } = await response.json();
    if (!Array.isArray(articles) || articles.length === 0) return;

    list.replaceChildren(...articles.map(createCard));
    section.hidden = false;
  } catch {
    // Blog indisponible (ex. aperçu sans PHP) : la section reste simplement masquée.
  }
}
