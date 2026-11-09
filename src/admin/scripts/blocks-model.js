/**
 * Article Markdown ⇄ liste de blocs pour l'éditeur visuel.
 *
 * Le Markdown reste le format enregistré (site, vérification SEO et anciens
 * articles inchangés) ; l'éditeur n'en montre que des blocs. Ce qu'il ne sait
 * pas représenter (tableau, code, titre de niveau 1 ou 4…) devient un bloc
 * « avancé » conservé tel quel.
 *
 * Bloc : { type, text?, items?, src?, alt? }
 *   paragraph | h2 | h3 | quote : text (Markdown en ligne : **gras**, *italique*, [lien](url))
 *   ul | ol : items (Markdown en ligne)
 *   image : src, alt · devis · raw : text (Markdown brut)
 */

const HEADING = /^(#{2,3})\s+(.+?)\s*#*$/;
const IMAGE = /^!\[([^\]]*)\]\((\S+?)\)$/;
const BULLET = /^[-*+]\s+/;
const NUMBERED = /^\d+[.)]\s+/;

/** Morceaux séparés par des lignes vides, sans couper un bloc de code ```. */
function chunks(markdown) {
  const parts = [];
  let open = null;
  for (const part of markdown.replace(/\r\n?/g, '\n').split(/\n[ \t]*\n/)) {
    if (open !== null) {
      open += `\n\n${part}`;
      if ((part.match(/^```/gm) ?? []).length % 2 === 1) {
        parts.push(open);
        open = null;
      }
    } else if ((part.match(/^```/gm) ?? []).length % 2 === 1) {
      open = part;
    } else {
      parts.push(part);
    }
  }
  if (open !== null) parts.push(open);
  return parts.map((part) => part.replace(/^\n+|\s+$/g, '')).filter(Boolean);
}

function parseChunk(chunk) {
  const lines = chunk.split('\n');
  const [first] = lines;

  if (first.trim() === '[[devis]]' && lines.length === 1) return [{ type: 'devis' }];

  const image = lines.length === 1 && first.trim().match(IMAGE);
  if (image) return [{ type: 'image', alt: image[1], src: image[2] }];

  const heading = first.match(HEADING);
  if (heading) {
    const block = { type: heading[1] === '##' ? 'h2' : 'h3', text: heading[2] };
    const rest = lines.slice(1).join('\n').trim();
    return rest ? [block, ...parseChunk(rest)] : [block];
  }

  if (lines.every((line) => BULLET.test(line))) {
    return [{ type: 'ul', items: lines.map((line) => line.replace(BULLET, '')) }];
  }
  if (lines.every((line) => NUMBERED.test(line))) {
    return [{ type: 'ol', items: lines.map((line) => line.replace(NUMBERED, '')) }];
  }
  if (lines.every((line) => line.startsWith('>'))) {
    const text = lines.map((line) => line.replace(/^>\s?/, '')).join('\n');
    if (!/^(#|[-*+]\s|\d+[.)]\s|>|```)/m.test(text)) return [{ type: 'quote', text }];
  }

  // Tout ce qui commence comme une structure non gérée reste en Markdown brut.
  if (/^(#|[-*+]\s|\d+[.)]\s|>|```|\||<|\s{4})/m.test(chunk)) return [{ type: 'raw', text: chunk }];

  return [{ type: 'paragraph', text: chunk }];
}

export function parseBlocks(markdown = '') {
  return chunks(String(markdown)).flatMap(parseChunk);
}

/** Un paragraphe qui commence par « # », « - », « 1. »… ne doit pas changer de nature. */
const protectStart = (text) =>
  text.replace(/^(#|[-*+]\s|>|!\[|\[\[devis\]\])/, '\\$1').replace(/^(\d+)([.)]\s)/, '$1\\$2');

const oneLine = (text) => text.replace(/\s*\n\s*/g, ' ').trim();

function blockToMarkdown(block) {
  switch (block.type) {
    case 'h2':
      return oneLine(block.text) && `## ${oneLine(block.text)}`;
    case 'h3':
      return oneLine(block.text) && `### ${oneLine(block.text)}`;
    case 'ul':
    case 'ol': {
      const items = block.items.map(oneLine).filter(Boolean);
      return items
        .map((item, index) => `${block.type === 'ul' ? '-' : `${index + 1}.`} ${item}`)
        .join('\n');
    }
    case 'quote':
      return block.text
        .trim()
        .split('\n')
        .map((line) => `> ${line}`.trimEnd())
        .join('\n')
        .replace(/^>$/, '');
    case 'image':
      return block.src ? `![${oneLine(block.alt ?? '').replace(/[[\]]/g, '')}](${block.src})` : '';
    case 'devis':
      return '[[devis]]';
    case 'raw':
      return block.text.trim();
    default:
      return block.text
        .trim()
        .split(/\n[ \t]*\n/)
        .map((paragraph) => protectStart(paragraph.trim()))
        .join('\n\n');
  }
}

export function blocksToMarkdown(blocks) {
  return blocks.map(blockToMarkdown).filter(Boolean).join('\n\n');
}

/** Échappe le texte saisi pour qu'il reste du texte une fois relu comme Markdown. */
export const escapeInline = (text) => text.replace(/[\\`*_[\]]/g, '\\$&');
