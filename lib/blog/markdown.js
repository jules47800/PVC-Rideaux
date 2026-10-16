/**
 * Conversion Markdown → HTML des articles (build du site et aperçu de
 * l'espace d'édition : même rendu des deux côtés).
 *
 * markdown-it avec html: false : le HTML saisi est affiché tel quel (échappé)
 * et les liens dangereux (javascript:…) sont refusés. Le résultat est ensuite
 * enrichi : ancres sur les intertitres (sommaire), images en chargement
 * différé avec leurs dimensions, liens externes dans un nouvel onglet,
 * tableaux mis en forme, et encart devis.
 *
 * Raccourci : une ligne contenant seulement [[devis]] insère un encart
 * « Demander un devis » au milieu de l'article.
 */
import MarkdownIt from 'markdown-it';

import { slugify } from './model.js';

const markdown = new MarkdownIt({ html: false, linkify: false, typographer: false });

const DEVIS_BLOCK = `<aside class="post-inline-cta">
  <p><strong>Un projet de rideau à lanières ?</strong> Devis gratuit et sans engagement sous 24 h, livraison offerte.</p>
  <a class="btn btn--primary" href="/devis/">Demander mon devis <svg class="icon icon-arrow" aria-hidden="true"><use href="/icons.svg#i-arrow-right"></use></svg></a>
</aside>`;

const decodeEntities = (text) =>
  text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const stripTags = (html) => html.replace(/<[^>]+>/g, '');

/**
 * @param {string} source Markdown de l'article
 * @param {{ imageSize?: (src: string) => ({ width: number, height: number } | null) }} [options]
 *   imageSize : dimensions réelles d'une image du site (au build), pour réserver sa place
 * @returns {string} HTML
 */
export function renderMarkdown(source, { imageSize } = {}) {
  let html = markdown.render(String(source ?? ''));

  // Ancres stables sur les intertitres, pour le sommaire et les liens directs.
  const usedIds = new Set();
  html = html.replace(/<(h[23])>([\s\S]*?)<\/\1>/g, (match, tag, inner) => {
    const base = slugify(decodeEntities(stripTags(inner)), 60) || 'section';
    let id = base;
    for (let index = 2; usedIds.has(id); index += 1) id = `${base}-${index}`;
    usedIds.add(id);
    return `<${tag} id="${id}">${inner}</${tag}>`;
  });

  // Images : chargement différé, dimensions réelles si connues.
  html = html.replace(/<img src="([^"]*)"/g, (match, src) => {
    const size = imageSize?.(decodeEntities(src));
    const dimensions = size ? ` width="${size.width}" height="${size.height}"` : '';
    return `<img loading="lazy" decoding="async"${dimensions} src="${src}"`;
  });

  // Liens externes : nouvel onglet.
  html = html.replace(
    /<a href="(https?:\/\/[^"]+)">/g,
    '<a href="$1" target="_blank" rel="noopener">',
  );

  html = html.replace(/<p>\[\[devis\]\]<\/p>/g, DEVIS_BLOCK);

  // Alignement des colonnes de tableau : classes plutôt que style en ligne (bloqué par la CSP).
  html = html.replace(/ style="text-align:(left|center|right)"/g, ' class="is-$1"');
  html = html
    .replace(/<table>/g, '<div class="table-wrap"><table class="spec-table">')
    .replace(/<\/table>/g, '</table></div>');

  return html;
}

/** Intertitres de niveau 2 d'un HTML d'article : [{ id, text }] pour le sommaire. */
export function extractHeadings(html) {
  return [...html.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)].map(([, id, inner]) => ({
    id,
    text: decodeEntities(stripTags(inner)),
  }));
}
