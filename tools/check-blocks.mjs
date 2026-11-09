/**
 * Vérifie que l'éditeur par blocs ne modifie pas les articles :
 * Markdown → blocs → Markdown doit garder le même rendu HTML.
 * Usage : node tools/check-blocks.mjs
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

import { renderMarkdown } from '../lib/blog/markdown.js';
import { blocksToMarkdown, parseBlocks } from '../src/admin/scripts/blocks-model.js';

const roundTrip = (markdown) => blocksToMarkdown(parseBlocks(markdown));
const sameRender = (markdown, label) =>
  assert.equal(renderMarkdown(roundTrip(markdown)), renderMarkdown(markdown), label);

const sample = `Intro avec **gras**, *italique* et un [lien](/devis/).
Suite du paragraphe.

## Pourquoi un rideau ?
Texte collé sous l'intertitre.

### Détail

- un
- deux **fort**

1. premier
2. second

> Une citation
> sur deux lignes

![Rideau dans un garage](/uploads/blog/2026/11/garage.webp)

[[devis]]

| A | B |
| - | - |
| 1 | 2 |

\`\`\`
code

avec ligne vide
\`\`\`

# Titre de niveau 1`;

sameRender(sample, 'exemple complet');
assert.deepEqual(
  parseBlocks(sample).map((block) => block.type),
  [
    'paragraph',
    'h2',
    'paragraph',
    'h3',
    'ul',
    'ol',
    'quote',
    'image',
    'devis',
    'raw',
    'raw',
    'raw',
  ],
);

// Un paragraphe qui ressemble à une structure reste un paragraphe.
assert.equal(
  blocksToMarkdown([{ type: 'paragraph', text: '1. pas une liste' }]),
  '1\\. pas une liste',
);
assert.equal(blocksToMarkdown([{ type: 'paragraph', text: '# pas un titre' }]), '\\# pas un titre');
// Les blocs vides disparaissent.
assert.equal(
  blocksToMarkdown([
    { type: 'paragraph', text: '  ' },
    { type: 'ul', items: ['', ' '] },
    { type: 'image', src: '', alt: '' },
    { type: 'h2', text: 'Titre' },
  ]),
  '## Titre',
);

// Tous les articles du blog gardent exactement le même rendu.
for (const file of readdirSync('content/articles')) {
  const { content } = JSON.parse(readFileSync(`content/articles/${file}`, 'utf8'));
  sameRender(content, file);
}

console.log('Éditeur par blocs : conversions vérifiées.');
