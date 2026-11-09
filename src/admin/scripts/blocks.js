/**
 * Éditeur visuel par blocs (paragraphe, intertitre, liste, citation, image,
 * encart devis). Chaque bloc s'affiche comme sur le site ; l'article est
 * enregistré en Markdown (voir blocks-model.js).
 *
 * Clavier : Entrée = nouveau paragraphe, Maj + Entrée = retour à la ligne,
 * Retour arrière dans un bloc vide = le supprimer. Ctrl B / Ctrl I : natifs.
 * Le texte collé arrive sans mise en forme, une ligne = un paragraphe.
 */
import { renderInline } from '../../../lib/blog/markdown.js';
import { blocksToMarkdown, escapeInline, parseBlocks } from './blocks-model.js';

export const BLOCK_TYPES = {
  paragraph: 'Paragraphe',
  h2: 'Intertitre',
  h3: 'Sous-intertitre',
  ul: 'Liste à puces',
  ol: 'Liste numérotée',
  quote: 'Citation / encadré',
  image: 'Image',
  devis: 'Encart devis',
  raw: 'Mise en forme avancée',
};
const TEXT_TYPES = ['paragraph', 'h2', 'h3', 'quote'];
const LIST_TYPES = ['ul', 'ol'];
const SWITCHABLE = [...TEXT_TYPES, ...LIST_TYPES];
const PLACEHOLDERS = {
  paragraph: 'Écrivez votre texte ici…',
  h2: 'Intertitre : le thème de la partie qui suit',
  h3: 'Sous-intertitre',
  quote: 'Citation, témoignage ou point important…',
};

const html = (tag, attributes = {}, children = []) => {
  const node = Object.assign(document.createElement(tag), attributes);
  node.append(...children);
  return node;
};

/* --------------------------------------------------------------------------
   Texte mis en forme ⇄ Markdown en ligne
   -------------------------------------------------------------------------- */

const wrap = (marker, inner) => {
  const [, before, text, after] = inner.match(/^(\s*)([\s\S]*?)(\s*)$/);
  return text ? `${before}${marker}${text}${marker}${after}` : inner;
};

/** Contenu d'un élément éditable → Markdown en ligne. */
function inlineMarkdown(node) {
  let out = '';
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      out += escapeInline(child.data.replace(/ /g, ' '));
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const inner = inlineMarkdown(child);
    switch (child.tagName) {
      case 'BR':
        out += '\n';
        break;
      case 'B':
      case 'STRONG':
        out += wrap('**', inner);
        break;
      case 'I':
      case 'EM':
        out += wrap('*', inner);
        break;
      case 'A':
        out += inner.trim() ? `[${inner}](${child.getAttribute('href')})` : inner;
        break;
      case 'DIV':
      case 'P':
        out += `${out && !out.endsWith('\n') ? '\n' : ''}${inner}\n`;
        break;
      default:
        out += inner;
    }
  });
  return out;
}

const textOf = (element) => inlineMarkdown(element).replace(/\n+$/, '');

function setInline(element, markdown) {
  element.innerHTML = renderInline(markdown); // markdown-it, HTML saisi échappé
  markEmpty(element);
}

function markEmpty(element) {
  element.toggleAttribute('data-empty', element.textContent.trim() === '');
}

/* --------------------------------------------------------------------------
   Construction des blocs
   -------------------------------------------------------------------------- */

function toolsFor(type) {
  const label = SWITCHABLE.includes(type)
    ? html(
        'select',
        { className: 'block__type', title: 'Changer le type de bloc' },
        SWITCHABLE.map((value) =>
          html('option', { value, textContent: BLOCK_TYPES[value], selected: value === type }),
        ),
      )
    : html('span', { className: 'block__label', textContent: BLOCK_TYPES[type] });
  if (label.tagName === 'SELECT') label.setAttribute('aria-label', 'Type de bloc');

  const button = (action, text, title) => {
    const node = html('button', {
      type: 'button',
      className: `block__tool block__tool--${action}`,
      textContent: text,
      title,
    });
    node.dataset.blockAction = action;
    node.setAttribute('aria-label', title);
    return node;
  };

  return html('div', { className: 'block__tools' }, [
    label,
    html('span', { className: 'block__spacer' }),
    button('up', '↑', 'Monter le bloc'),
    button('down', '↓', 'Descendre le bloc'),
    button('remove', '✕', 'Supprimer le bloc'),
  ]);
}

function editable(tag, type, markdown) {
  const element = html(tag, { className: `block__text block__text--${type}` });
  element.contentEditable = 'true';
  element.dataset.placeholder = PLACEHOLDERS[type];
  element.setAttribute('role', 'textbox');
  element.setAttribute('aria-label', BLOCK_TYPES[type]);
  if (type === 'paragraph' || type === 'quote') element.setAttribute('aria-multiline', 'true');
  setInline(element, markdown);
  return element;
}

function listElement(type, items) {
  const list = html(type, { className: 'block__list' });
  list.contentEditable = 'true';
  list.setAttribute('role', 'textbox');
  list.setAttribute('aria-multiline', 'true');
  list.setAttribute('aria-label', BLOCK_TYPES[type]);
  const values = items.length ? items : [''];
  list.append(
    ...values.map((item) => {
      const li = html('li');
      if (item) li.innerHTML = renderInline(item);
      else li.append(html('br'));
      return li;
    }),
  );
  return list;
}

function imageBody(block, previewSrc) {
  const image = html('img', { className: 'block__image', alt: '' });
  if (block.src) image.src = previewSrc(block.src);
  image.hidden = !block.src;
  const alt = html('input', {
    className: 'input',
    type: 'text',
    value: block.alt ?? '',
    maxLength: 250,
    placeholder: 'ex. Rideau à lanières à l’entrée d’un garage',
  });
  alt.dataset.imageAlt = '';
  const file = html('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp' });
  file.dataset.imageReplace = '';
  return html('figure', { className: 'block__figure' }, [
    image,
    html('p', { className: 'block__status', hidden: true }),
    html('label', { className: 'field block__alt' }, [
      html('span', {
        className: 'block__alt-label',
        textContent: 'Description de l’image (obligatoire pour Google)',
      }),
      alt,
    ]),
    html('label', { className: 'btn btn--small file-button' }, [
      file,
      html('span', { textContent: 'Remplacer l’image' }),
    ]),
  ]);
}

function devisBody() {
  return html('div', { className: 'block__devis' }, [
    html('p', {}, [
      html('strong', { textContent: 'Un projet de rideau à lanières ?' }),
      ' Devis gratuit et sans engagement sous 24 h, livraison offerte.',
    ]),
    html('span', { className: 'btn btn--primary btn--small', textContent: 'Demander mon devis' }),
  ]);
}

function rawBody(text) {
  const textarea = html('textarea', {
    className: 'input block__raw',
    value: text,
    rows: Math.min(14, text.split('\n').length + 1),
  });
  textarea.setAttribute('aria-label', BLOCK_TYPES.raw);
  return html('div', {}, [
    html('p', {
      className: 'field-hint',
      textContent:
        'Tableau ou mise en forme spéciale : laissez ce bloc tel quel si vous ne savez pas le modifier.',
    }),
    textarea,
  ]);
}

/* --------------------------------------------------------------------------
   Éditeur
   -------------------------------------------------------------------------- */

/**
 * @param {HTMLElement} root
 * @param {{ onChange: () => void, sendImage: (file: File) => Promise<string>,
 *           previewSrc: (url: string) => string, onError: (message: string) => void }} options
 */
export function createBlockEditor(root, { onChange, sendImage, previewSrc, onError }) {
  let current = null;
  let savedRange = null;

  const blocks = () => [...root.querySelectorAll(':scope > .block')];

  function makeBlock(block) {
    const element = html('div', { className: `block block--${block.type}` });
    element.dataset.type = block.type;
    let body;
    if (TEXT_TYPES.includes(block.type)) {
      body = editable(block.type === 'quote' ? 'blockquote' : 'div', block.type, block.text ?? '');
    } else if (LIST_TYPES.includes(block.type)) {
      body = listElement(block.type, block.items ?? []);
    } else if (block.type === 'image') {
      body = imageBody(block, previewSrc);
      element.dataset.src = block.src ?? '';
    } else if (block.type === 'devis') {
      body = devisBody();
    } else {
      body = rawBody(block.text ?? '');
    }
    element.append(toolsFor(block.type), body);
    return element;
  }

  function readBlock(element) {
    const { type } = element.dataset;
    if (TEXT_TYPES.includes(type))
      return { type, text: textOf(element.querySelector('.block__text')) };
    if (LIST_TYPES.includes(type)) {
      const list = element.querySelector('.block__list');
      const items = [...list.children].filter((node) => node.tagName === 'LI').map(textOf);
      return { type, items: items.length ? items : [textOf(list)] };
    }
    if (type === 'image') {
      return {
        type,
        src: element.dataset.src,
        alt: element.querySelector('[data-image-alt]').value,
      };
    }
    if (type === 'raw') return { type, text: element.querySelector('textarea').value };
    return { type };
  }

  /** Place le curseur au début ou à la fin du bloc. */
  function focusBlock(element, atEnd = false) {
    const target =
      element?.querySelector('.block__text, .block__list, textarea, [data-image-alt]') ?? null;
    if (!target) return;
    target.focus();
    if (target.isContentEditable) {
      const range = document.createRange();
      const host =
        atEnd && target.tagName.match(/^[OU]L$/) ? (target.lastElementChild ?? target) : target;
      range.selectNodeContents(host);
      range.collapse(!atEnd);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  function insertAfter(reference, block) {
    const element = makeBlock(block);
    if (reference?.parentNode === root) reference.after(element);
    else root.append(element);
    return element;
  }

  function ensureOneBlock() {
    if (blocks().length === 0) root.append(makeBlock({ type: 'paragraph', text: '' }));
  }

  const changed = () => {
    ensureOneBlock();
    onChange();
  };

  /* — Images — */

  const picker = html('input', {
    type: 'file',
    accept: 'image/jpeg,image/png,image/webp',
    hidden: true,
  });
  root.after(picker);
  let pickerTarget = null;

  async function uploadInto(element, file) {
    const status = element.querySelector('.block__status');
    status.textContent = 'Envoi de l’image en cours…';
    status.hidden = false;
    element.setAttribute('aria-busy', 'true');
    try {
      const url = await sendImage(file);
      element.dataset.src = url;
      const image = element.querySelector('.block__image');
      image.src = previewSrc(url);
      image.hidden = false;
      status.hidden = true;
      element.querySelector('[data-image-alt]').focus();
      onChange();
      return true;
    } catch (error) {
      onError(error.message);
      status.textContent = `Échec de l’envoi : ${error.message}`;
      return false;
    } finally {
      element.removeAttribute('aria-busy');
    }
  }

  picker.addEventListener('change', async () => {
    const file = picker.files[0];
    picker.value = '';
    if (!file) return;
    const element = insertAfter(pickerTarget, { type: 'image', src: '', alt: '' });
    current = element;
    if (!(await uploadInto(element, file)) && !element.dataset.src) {
      element.remove();
      changed();
    }
  });

  /* — Ajout, déplacement, suppression, changement de type — */

  function add(type) {
    const reference = current?.parentNode === root ? current : blocks().at(-1);
    if (type === 'image') {
      pickerTarget = reference;
      picker.click();
      return;
    }
    // Remplit le paragraphe vide courant plutôt que d'en laisser un derrière soi.
    const replaceEmpty =
      reference?.dataset.type === 'paragraph' && readBlock(reference).text.trim() === '';
    const element = insertAfter(reference, { type, text: '', items: [] });
    if (replaceEmpty) reference.remove();
    current = element;
    focusBlock(element);
    changed();
  }

  function switchType(element, type) {
    const data = readBlock(element);
    const lines = data.items ?? data.text.split('\n');
    const next = LIST_TYPES.includes(type)
      ? { type, items: lines }
      : { type, text: type === 'h2' || type === 'h3' ? lines.join(' ') : lines.join('\n') };
    const replacement = makeBlock(next);
    element.replaceWith(replacement);
    current = replacement;
    focusBlock(replacement, true);
    changed();
  }

  function removeBlock(element) {
    const data = readBlock(element);
    const hasContent = blocksToMarkdown([data]) !== '' && data.type !== 'devis';
    if (hasContent && !window.confirm('Supprimer ce bloc et son contenu ?')) return;
    const neighbour = element.previousElementSibling ?? element.nextElementSibling;
    element.remove();
    changed();
    focusBlock(neighbour?.classList.contains('block') ? neighbour : blocks()[0], true);
  }

  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-block-action]');
    if (!button) return;
    const element = button.closest('.block');
    const action = button.dataset.blockAction;
    if (action === 'remove') return removeBlock(element);
    const sibling = action === 'up' ? element.previousElementSibling : element.nextElementSibling;
    if (!sibling?.classList.contains('block')) return;
    if (action === 'up') sibling.before(element);
    else sibling.after(element);
    button.focus();
    changed();
  });

  root.addEventListener('change', async (event) => {
    const element = event.target.closest('.block');
    if (event.target.matches('.block__type')) switchType(element, event.target.value);
    if (event.target.matches('[data-image-replace]')) {
      const file = event.target.files[0];
      event.target.value = '';
      if (file) await uploadInto(element, file);
    }
  });

  root.addEventListener('focusin', (event) => {
    current = event.target.closest('.block') ?? current;
  });

  root.addEventListener('input', (event) => {
    if (event.target.isContentEditable) markEmpty(event.target);
    onChange();
  });

  /* — Clavier — */

  const caretAtStart = (host) => {
    const selection = window.getSelection();
    if (!selection.rangeCount || !selection.isCollapsed) return false;
    const range = document.createRange();
    range.selectNodeContents(host);
    range.setEnd(selection.anchorNode, selection.anchorOffset);
    return range.toString() === '';
  };

  /** Entrée dans un bloc de texte : la suite du texte part dans un nouveau paragraphe. */
  function splitBlock(element, host) {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const tail = document.createRange();
    tail.setStart(range.endContainer, range.endOffset);
    tail.setEnd(host, host.childNodes.length);
    const holder = html('div');
    holder.append(tail.extractContents());
    markEmpty(host);
    const next = insertAfter(element, { type: 'paragraph', text: textOf(holder) });
    current = next;
    focusBlock(next);
    changed();
  }

  root.addEventListener('keydown', (event) => {
    const host = event.target;
    if (!host.isContentEditable) return;
    const element = host.closest('.block');
    const { type } = element.dataset;

    if (event.key === 'Enter' && !event.isComposing) {
      if (TEXT_TYPES.includes(type)) {
        if (event.shiftKey && (type === 'paragraph' || type === 'quote')) return;
        event.preventDefault();
        splitBlock(element, host);
      } else if (LIST_TYPES.includes(type) && !event.shiftKey) {
        // Entrée sur une puce vide : on sort de la liste.
        const item =
          window.getSelection().anchorNode?.parentElement?.closest('li') ??
          (window.getSelection().anchorNode?.nodeName === 'LI'
            ? window.getSelection().anchorNode
            : null);
        if (item && item.textContent.trim() === '') {
          event.preventDefault();
          item.remove();
          const next = insertAfter(element, { type: 'paragraph', text: '' });
          if (!host.querySelector('li')) element.remove();
          current = next;
          focusBlock(next);
          changed();
        }
      }
      return;
    }

    if (event.key === 'Backspace' && host.textContent === '' && !host.querySelector('img')) {
      const previous = element.previousElementSibling;
      if (!previous?.classList.contains('block') || blocks().length === 1) return;
      event.preventDefault();
      element.remove();
      current = previous;
      focusBlock(previous, true);
      changed();
    }
  });

  /* — Collage : texte simple, une ligne = un paragraphe (ou une puce) — */

  root.addEventListener('paste', (event) => {
    const host = event.target.closest('[contenteditable="true"]');
    if (!host) return;
    event.preventDefault();
    const lines = (event.clipboardData?.getData('text/plain') ?? '')
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) return;
    const element = host.closest('.block');
    const { type } = element.dataset;

    if (type === 'h2' || type === 'h3') {
      document.execCommand('insertText', false, lines.join(' '));
      return;
    }
    document.execCommand('insertText', false, lines[0]);
    if (LIST_TYPES.includes(type)) {
      let item = window.getSelection().anchorNode?.parentElement?.closest('li');
      lines.slice(1).forEach((line) => {
        const li = html('li', { textContent: line });
        if (item) item.after(li);
        else host.append(li);
        item = li;
      });
    } else {
      let reference = element;
      lines.slice(1).forEach((line) => {
        reference = insertAfter(reference, { type: 'paragraph', text: escapeInline(line) });
      });
      focusBlock(reference, true);
    }
    changed();
  });

  /* — Liens — */

  /** Mémorise la sélection avant d'ouvrir la fenêtre « Insérer un lien ». */
  function rememberSelection() {
    const selection = window.getSelection();
    const range = selection.rangeCount ? selection.getRangeAt(0) : null;
    const host = range?.commonAncestorContainer.parentElement?.closest('[contenteditable="true"]');
    savedRange = host && root.contains(host) ? range.cloneRange() : null;
    return savedRange?.toString() ?? '';
  }

  function insertLink({ text, url }) {
    const href = url.replace(/[\s()]/g, encodeURIComponent);
    let range = savedRange;
    if (!range) {
      // Pas de position mémorisée : le lien va à la fin du dernier paragraphe.
      const last =
        [...root.querySelectorAll('.block--paragraph .block__text')].at(-1) ??
        insertAfter(blocks().at(-1), { type: 'paragraph', text: '' }).querySelector('.block__text');
      if (last.textContent.trim()) last.append(' ');
      range = document.createRange();
      range.selectNodeContents(last);
      range.collapse(false);
    }
    const link = html('a', { textContent: text || range.toString() || url });
    link.setAttribute('href', href);
    range.deleteContents();
    range.insertNode(link);
    const host = link.closest('[contenteditable="true"]');
    markEmpty(host);
    host.focus();
    const after = document.createRange();
    after.setStartAfter(link);
    after.collapse(true);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(after);
    savedRange = null;
    changed();
  }

  /** Gras / italique sur la sélection du bloc en cours. */
  function format(command) {
    if (document.activeElement?.isContentEditable && root.contains(document.activeElement)) {
      document.execCommand(command);
    }
  }

  return {
    setMarkdown(markdown) {
      root.replaceChildren(...parseBlocks(markdown).map(makeBlock));
      ensureOneBlock();
    },
    getMarkdown: () => blocksToMarkdown(blocks().map(readBlock)),
    add,
    format,
    rememberSelection,
    insertLink,
  };
}
