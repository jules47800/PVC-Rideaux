/**
 * Aperçu SVG du rideau dans le configurateur de devis.
 *
 * Purement illustratif : les proportions de l'ouverture sont respectées, mais
 * le nombre de lanières dessinées est une approximation visuelle. Les couleurs
 * de chaque matière sont définies en CSS (funnel.css, [data-type]).
 *
 * Usage :
 *   const preview = createCurtainPreview(svgElement);
 *   preview.update({ product, width, height, format, type, overlap, redBorders, … });
 */
import { PVC_FORMATS, RAIL_SECTION_MM } from '../data/catalogue.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Zone de dessin dans le viewBox 400 × 300. */
const STAGE = { left: 30, right: 350, top: 36, floor: 252 };

/** Espacement visuel entre lanières, en fraction de leur largeur. */
const PITCH_RATIO = { maximum: 0.5, minimum: 0.75 };

const MAX_STRIPS = 44;
const SWAY_DURATION_MS = 900;
const PLACEHOLDER = { width: 1200, height: 2400 };
const RAIL_OVERHANG = 1.08;

const numberFormat = new Intl.NumberFormat('fr-FR');

const DEFS = `
  <defs>
    <pattern id="cp-ribs" width="7" height="10" patternUnits="userSpaceOnUse">
      <rect width="7" height="10" class="cp-ribs-base" />
      <rect width="1.6" height="10" class="cp-ribs-line" />
    </pattern>
    <linearGradient id="cp-sheen" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0" />
      <stop offset="0.45" stop-color="#fff" stop-opacity="0.45" />
      <stop offset="1" stop-color="#fff" stop-opacity="0" />
    </linearGradient>
  </defs>`;

export function createCurtainPreview(svg) {
  if (!svg) return { update() {} };

  svg.innerHTML = DEFS;
  const scene = el('g', { class: 'cp-scene' });
  svg.append(scene);

  let lastType = null;

  return {
    update(state) {
      scene.replaceChildren();
      svg.dataset.type = state.type || 'standard';

      switch (state.product) {
        case 'lanieres':
          drawStrips(scene, state);
          break;
        case 'rouleaux':
          drawRoll(scene, state);
          break;
        case 'rail':
          drawRail(scene, state);
          break;
        default:
          drawDoorway(scene, state);
      }

      // Petit balancement des lanières quand la matière change.
      if (lastType !== null && state.type && state.type !== lastType) sway(svg);
      lastType = state.type || lastType;
    },
  };
}

/* ---------------------------------------------------------------------------
   Scènes
   ------------------------------------------------------------------------- */

function drawDoorway(scene, state) {
  const isPlaceholder = !state.width || !state.height;
  const width = state.width || PLACEHOLDER.width;
  const height = state.height || PLACEHOLDER.height;

  // Échelle commune (px par mm) pour respecter les proportions réelles.
  const railMm = width * RAIL_OVERHANG;
  const scale = Math.min(
    (STAGE.right - STAGE.left) / railMm,
    (STAGE.floor - STAGE.top - 10) / height,
  );

  const center = (STAGE.left + STAGE.right) / 2;
  const openingW = width * scale;
  const openingH = height * scale;
  const railW = railMm * scale;
  const railX = center - railW / 2;
  const railY = STAGE.floor - openingH - 8;

  scene.classList.toggle('is-placeholder', isPlaceholder);
  scene.append(
    el('rect', { class: 'cp-wall', x: 0, y: 0, width: 400, height: STAGE.floor }),
    el('rect', {
      class: 'cp-opening',
      x: center - openingW / 2,
      y: STAGE.floor - openingH,
      width: openingW,
      height: openingH,
    }),
  );

  const stripWidth = (PVC_FORMATS[state.format]?.stripWidth ?? 200) * scale;
  scene.append(
    stripsGroup({
      x: railX,
      y: railY + 6,
      width: railW,
      length: STAGE.floor - railY - 7,
      stripWidth,
      overlap: state.overlap,
      redBorders: state.redBorders,
    }),
    el('rect', { class: 'cp-rail', x: railX, y: railY, width: railW, height: 7, rx: 2 }),
    el('line', { class: 'cp-floor', x1: 0, y1: STAGE.floor, x2: 400, y2: STAGE.floor }),
  );

  // Cotes
  const dimY = STAGE.floor + 20;
  scene.append(
    dimension(center - openingW / 2, dimY, center + openingW / 2, dimY),
    text(center, dimY + 18, isPlaceholder ? 'Largeur' : `${numberFormat.format(width)} mm`),
  );
  const dimX = Math.min(center + railW / 2 + 16, 382);
  scene.append(
    dimension(dimX, STAGE.floor - openingH, dimX, STAGE.floor),
    text(
      dimX + 12,
      STAGE.floor - openingH / 2,
      isPlaceholder ? 'Hauteur' : `${numberFormat.format(height)} mm`,
      90,
    ),
  );
}

function drawStrips(scene, state) {
  const count = Math.min(state.stripCount || 3, 10);
  const lengthMm = state.stripLength || 2100;
  const stripMm = PVC_FORMATS[state.format]?.stripWidth ?? 200;

  const scale = Math.min(190 / lengthMm, 280 / (count * stripMm * 1.15));
  const stripW = stripMm * scale;
  const gap = stripW * 0.15;
  const totalW = count * stripW + (count - 1) * gap;
  const x0 = 200 - totalW / 2;

  const group = el('g', { class: 'cp-strips' });
  for (let i = 0; i < count; i += 1) {
    group.append(strip(x0 + i * (stripW + gap), 52, stripW, lengthMm * scale, i, false));
  }
  scene.append(
    el('rect', { class: 'cp-wall', x: 0, y: 0, width: 400, height: 300 }),
    group,
    text(200, 280, `${state.stripCount || '?'} × ${numberFormat.format(lengthMm)} mm`),
  );
}

function drawRoll(scene, state) {
  const group = el('g', { class: 'cp-strips' });
  // Bande déroulée
  group.append(
    el('path', {
      class: 'cp-strip',
      d: 'M150 168 C 210 230, 290 236, 360 214 L 366 236 C 290 262, 200 254, 140 190 Z',
    }),
  );
  scene.append(
    el('rect', { class: 'cp-wall', x: 0, y: 0, width: 400, height: 300 }),
    group,
    el('circle', { class: 'cp-roll', cx: 150, cy: 130, r: 78 }),
    el('circle', { class: 'cp-roll cp-roll--inner', cx: 150, cy: 130, r: 52 }),
    el('circle', { class: 'cp-core', cx: 150, cy: 130, r: 26 }),
    text(
      290,
      120,
      state.rollLength ? `${state.rollLength} m` : 'Rouleau',
      0,
      'cp-label cp-label--lg',
    ),
    text(290, 146, `× ${state.rollCount || 1}`),
  );
}

function drawRail(scene, state) {
  const sections = state.railLength ? Math.ceil(state.railLength / RAIL_SECTION_MM) : 3;
  const shown = Math.min(sections, 8);
  const sectionW = Math.min(80, 320 / shown);
  const x0 = 200 - (shown * sectionW) / 2;

  scene.append(el('rect', { class: 'cp-wall', x: 0, y: 0, width: 400, height: 300 }));
  for (let i = 0; i < shown; i += 1) {
    const x = x0 + i * sectionW;
    scene.append(
      el('rect', { class: 'cp-rail', x: x + 1, y: 120, width: sectionW - 2, height: 12, rx: 2 }),
    );
    for (let h = 8; h < sectionW - 4; h += 10) {
      scene.append(el('path', { class: 'cp-hook', d: `M${x + h} 132 v8 a3 3 0 0 0 6 0` }));
    }
  }
  scene.append(
    text(
      200,
      190,
      `${sections} section${sections > 1 ? 's' : ''} de 984 mm`,
      0,
      'cp-label cp-label--lg',
    ),
  );
}

/* ---------------------------------------------------------------------------
   Éléments
   ------------------------------------------------------------------------- */

/** Lanières réparties sur le rail, en deux rangées qui se chevauchent. */
function stripsGroup({ x, y, width, length, stripWidth, overlap, redBorders }) {
  const group = el('g', { class: 'cp-strips' });
  const pitchTarget = stripWidth * (PITCH_RATIO[overlap] ?? PITCH_RATIO.maximum);
  const count = Math.min(
    MAX_STRIPS,
    Math.max(2, Math.ceil((width - stripWidth) / pitchTarget) + 1),
  );
  const pitch = (width - stripWidth) / (count - 1);
  const drawnWidth = Math.max(stripWidth, pitch * 1.05);

  for (let i = 0; i < count; i += 1) {
    const isRed = redBorders && (i === 0 || i === count - 1);
    group.append(strip(x + i * pitch, y, drawnWidth, length, i, isRed));
  }
  return group;
}

function strip(x, y, width, height, index, isRed) {
  const node = el('g', { class: `cp-strip-wrap${index % 2 ? ' is-back' : ''}` });
  node.style.setProperty('--i', String(index));
  node.append(
    el('rect', { class: `cp-strip${isRed ? ' is-red' : ''}`, x, y, width, height, rx: 1.5 }),
    el('rect', { class: 'cp-sheen', x: x + width * 0.15, y, width: width * 0.35, height }),
  );
  return node;
}

function dimension(x1, y1, x2, y2) {
  const group = el('g', { class: 'cp-dim' });
  const vertical = x1 === x2;
  group.append(
    el('line', { x1, y1, x2, y2 }),
    el(
      'line',
      vertical ? { x1: x1 - 4, y1, x2: x1 + 4, y2: y1 } : { x1, y1: y1 - 4, x2: x1, y2: y1 + 4 },
    ),
    el(
      'line',
      vertical ? { x1: x2 - 4, y1: y2, x2: x2 + 4, y2 } : { x1: x2, y1: y2 - 4, x2, y2: y2 + 4 },
    ),
  );
  return group;
}

function text(x, y, content, rotate = 0, className = 'cp-label') {
  const node = el('text', {
    class: className,
    x,
    y,
    'text-anchor': 'middle',
    ...(rotate ? { transform: `rotate(${rotate} ${x} ${y})` } : {}),
  });
  node.textContent = content;
  return node;
}

function el(name, attributes = {}) {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
}

/**
 * Les lanières étant redessinées à chaque mise à jour, il suffit que la classe
 * soit présente pour que l'animation (CSS) se joue ; on la retire ensuite pour
 * ne pas la rejouer à chaque frappe dans un champ.
 */
let swayTimer;
function sway(svg) {
  svg.classList.add('is-swaying');
  clearTimeout(swayTimer);
  swayTimer = setTimeout(() => svg.classList.remove('is-swaying'), SWAY_DURATION_MS);
}
