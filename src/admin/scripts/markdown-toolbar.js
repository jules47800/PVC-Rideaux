/**
 * Mise en forme Markdown dans la zone de texte de l'éditeur.
 *
 * Les insertions passent par execCommand('insertText') quand le navigateur le
 * permet : Ctrl+Z annule alors la mise en forme comme une frappe normale.
 */

/** Remplace la sélection [start, end] par `text` puis sélectionne [selectStart, selectEnd]. */
function replaceRange(
  textarea,
  start,
  end,
  text,
  selectStart = start + text.length,
  selectEnd = selectStart,
) {
  textarea.focus();
  textarea.setSelectionRange(start, end);
  const inserted = document.execCommand?.('insertText', false, text);
  if (!inserted) {
    textarea.setRangeText(text, start, end, 'end');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
  textarea.setSelectionRange(selectStart, selectEnd);
}

/** Entoure la sélection (ou un texte d'exemple sélectionné) : **gras**, _italique_. */
function wrapSelection(textarea, marker, placeholder) {
  const { selectionStart: start, selectionEnd: end, value } = textarea;
  const selected = value.slice(start, end) || placeholder;
  replaceRange(
    textarea,
    start,
    end,
    `${marker}${selected}${marker}`,
    start + marker.length,
    start + marker.length + selected.length,
  );
}

/** Préfixe chaque ligne sélectionnée (« ## », « - », « 1. », « > »), en remplaçant un préfixe existant. */
function prefixLines(textarea, prefixFor) {
  const { value } = textarea;
  const start = value.lastIndexOf('\n', textarea.selectionStart - 1) + 1;
  const endOfLine = value.indexOf('\n', textarea.selectionEnd);
  const end = endOfLine === -1 ? value.length : endOfLine;

  const lines = value
    .slice(start, end)
    .split('\n')
    .map(
      (line, index) =>
        prefixFor(index) + line.replace(/^\s*(#{1,6}\s+|[-*+]\s+|\d+[.)]\s+|>\s?)/, ''),
    );
  const text = lines.join('\n');
  replaceRange(textarea, start, end, text, start + text.length);
}

/** Insère un bloc sur ses propres lignes, séparé du texte par des lignes vides. */
export function insertBlock(
  textarea,
  block,
  { start = textarea.selectionStart, end = textarea.selectionEnd } = {},
) {
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  const leading =
    before === '' || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const trailing = after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
  replaceRange(textarea, start, end, `${leading}${block}${trailing}`);
}

/** Insère `[texte](adresse)` à la place de la sélection mémorisée. */
export function insertLink(textarea, { text, url, start, end }) {
  replaceRange(textarea, start, end, `[${text || url}](${url})`);
}

/** Actions simples de la barre d'outils (les liens et images passent par des fenêtres). */
export const FORMATS = {
  h2: (textarea) => prefixLines(textarea, () => '## '),
  h3: (textarea) => prefixLines(textarea, () => '### '),
  bold: (textarea) => wrapSelection(textarea, '**', 'texte en gras'),
  italic: (textarea) => wrapSelection(textarea, '_', 'texte en italique'),
  ul: (textarea) => prefixLines(textarea, () => '- '),
  ol: (textarea) => prefixLines(textarea, (index) => `${index + 1}. `),
  quote: (textarea) => prefixLines(textarea, () => '> '),
  devis: (textarea) => insertBlock(textarea, '[[devis]]'),
};
