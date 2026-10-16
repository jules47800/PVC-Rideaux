/**
 * Configurateur de devis (page /devis/).
 *
 * - Affiche uniquement les champs utiles au produit choisi (les autres sont
 *   désactivés : ni validés, ni envoyés).
 * - Ne propose que les formats / types de PVC réellement disponibles.
 * - Conseille un format de lanière selon la hauteur de l'ouverture.
 * - Tient à jour un récapitulatif (surface, sections de rail, métrage…).
 * - Pré-remplit le formulaire depuis l'URL : ?profil=pro&produit=soudure&format=300x2&type=soudure
 *
 * L'envoi lui-même est géré par le module commun forms.js.
 */
import {
  PRODUCTS,
  PVC_FORMATS,
  RAIL_SECTION_MM,
  availableTypes,
  recommendFormat,
} from '../data/catalogue.js';

const DEFAULT_PRODUCT = 'kit';
const EMPTY = '—';

const numberFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
const formatNumber = (value) => numberFormat.format(value);
const plural = (count, word) => `${formatNumber(count)} ${word}${count > 1 ? 's' : ''}`;

const form = document.querySelector('[data-quote-form]');
const recap = document.querySelector('[data-recap]');

if (form && recap) {
  prefillFromUrl();
  form.addEventListener('change', update);
  form.addEventListener('input', update);
  form.querySelector('[data-apply-format]')?.addEventListener('click', applyRecommendedFormat);
  update();
}

/* ---------------------------------------------------------------------------
   Lecture du formulaire
   ------------------------------------------------------------------------- */

function radios(name) {
  return [...form.querySelectorAll(`input[type="radio"][name="${name}"]`)];
}

function checkedRadio(name) {
  return radios(name).find((radio) => radio.checked) ?? null;
}

function radioValue(name) {
  return checkedRadio(name)?.value ?? '';
}

/** Libellé lisible d'un choix (texte du <strong> de sa carte). */
function radioLabel(name) {
  const radio = checkedRadio(name);
  return radio?.closest('label')?.querySelector('strong')?.textContent.trim() ?? '';
}

/** Entier strictement positif, ou null. */
function positiveInt(name) {
  const value = Number.parseInt(form.elements.namedItem(name)?.value ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Si le choix courant est vide ou désactivé, sélectionne la première option disponible. */
function ensureValidChoice(name) {
  const current = checkedRadio(name);
  if (current && !current.disabled) return;

  const first = radios(name).find((radio) => !radio.disabled);
  if (first) first.checked = true;
}

function checkRadio(name, value) {
  const radio = radios(name).find((item) => item.value === value && !item.disabled);
  if (radio) radio.checked = true;
  return Boolean(radio);
}

/* ---------------------------------------------------------------------------
   Pré-remplissage depuis l'URL
   ------------------------------------------------------------------------- */

function prefillFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const mapping = { profil: 'profile', produit: 'product', format: 'pvc_format', type: 'pvc_type' };

  Object.entries(mapping).forEach(([param, name]) => {
    const value = params.get(param);
    if (value) checkRadio(name, value);
  });
}

/* ---------------------------------------------------------------------------
   Mise à jour de l'interface
   ------------------------------------------------------------------------- */

function update() {
  const productId = PRODUCTS[radioValue('product')] ? radioValue('product') : DEFAULT_PRODUCT;
  const product = PRODUCTS[productId];

  toggleGroups(product.groups);
  syncFormats(productId);
  syncTypes(productId);
  syncRollLength();
  updateRecommendation(product);
  updateCompanyRequirement();
  renderRecap(productId, product);
}

function toggleGroups(visibleGroups) {
  form.querySelectorAll('[data-quote-group]').forEach((group) => {
    const visible = visibleGroups.includes(group.dataset.quoteGroup);
    group.hidden = !visible;
    group.disabled = !visible;
  });
}

/** Désactive les formats sans type compatible avec le produit. */
function syncFormats(productId) {
  radios('pvc_format').forEach((radio) => {
    radio.disabled = availableTypes(productId, radio.value).length === 0;
  });

  ensureValidChoice('pvc_format');
}

/** Désactive les types indisponibles pour le couple produit / format. */
function syncTypes(productId) {
  const allowed = availableTypes(productId, radioValue('pvc_format'));

  radios('pvc_type').forEach((radio) => {
    radio.disabled = !allowed.includes(radio.value);
  });

  ensureValidChoice('pvc_type');
}

/** Le PVC de soudure n'existe qu'en rouleaux de 25 m. */
function syncRollLength() {
  const shortOnly = radioValue('pvc_type') === 'soudure';

  radios('roll_length').forEach((radio) => {
    radio.disabled = shortOnly && radio.value !== '25';
  });

  ensureValidChoice('roll_length');
}

function recommendedFormat(product) {
  if (!product.groups.includes('dimensions')) return null;

  const formatId = recommendFormat(positiveInt('height'));
  const radio = radios('pvc_format').find((item) => item.value === formatId);
  return radio && !radio.disabled ? formatId : null;
}

function updateRecommendation(product) {
  const formatId = recommendedFormat(product);

  form.querySelectorAll('[data-reco-badge]').forEach((badge) => {
    badge.hidden = badge.closest('label').querySelector('input').value !== formatId;
  });

  const hint = form.querySelector('[data-format-hint]');
  if (!hint) return;

  const showHint = formatId !== null && formatId !== radioValue('pvc_format');
  hint.hidden = !showHint;
  if (showHint) {
    hint.querySelector('[data-format-hint-text]').textContent =
      `Pour ${formatNumber(positiveInt('height'))} mm de hauteur, nous conseillons des lanières ${PVC_FORMATS[formatId].label}.`;
  }
}

function applyRecommendedFormat() {
  const productId = radioValue('product') || DEFAULT_PRODUCT;
  const formatId = recommendedFormat(PRODUCTS[productId]);
  if (formatId && checkRadio('pvc_format', formatId)) update();
}

/** Le nom de la société devient obligatoire pour un professionnel. */
function updateCompanyRequirement() {
  const company = form.elements.namedItem('company');
  if (!company) return;

  const required = radioValue('profile') === 'pro';
  company.required = required;
  form.querySelector('[data-company-optional]')?.toggleAttribute('hidden', required);
}

/* ---------------------------------------------------------------------------
   Récapitulatif
   ------------------------------------------------------------------------- */

function renderRecap(productId, product) {
  const has = (group) => product.groups.includes(group);
  const width = positiveInt('width');
  const height = positiveInt('height');
  const quantity = positiveInt('quantity') ?? 1;

  setRecap('profile', radioLabel('profile'));
  setRecap('product', radioLabel('product'));
  setRecap(
    'dimensions',
    has('dimensions') && width && height
      ? `${formatNumber(width)} × ${formatNumber(height)} mm`
      : '',
    has('dimensions'),
  );
  setRecap(
    'quantity',
    has('dimensions') ? plural(quantity, 'rideau') : '',
    has('dimensions') && quantity > 1,
  );
  setRecap('format', has('format') ? radioLabel('pvc_format') : '', has('format'));
  setRecap('type', has('type') ? radioLabel('pvc_type') : '', has('type'));
  setRecap(
    'options',
    has('options')
      ? [radioLabel('overlap'), radioValue('red_borders') === 'oui' ? 'bordures rouges' : '']
          .filter(Boolean)
          .join(', ')
      : '',
    has('options'),
  );

  const [first, second] = kpisFor(productId, { width, height, quantity });
  setKpi(1, first);
  setKpi(2, second);
}

/** Deux indicateurs clés selon le produit. */
function kpisFor(productId, { width, height, quantity }) {
  switch (productId) {
    case 'lanieres': {
      const length = positiveInt('strip_length');
      const count = positiveInt('strip_count');
      return [
        { label: 'Lanières', value: count ? formatNumber(count) : EMPTY },
        {
          label: 'Métrage total',
          value: length && count ? `${formatNumber((length * count) / 1000)} m` : EMPTY,
        },
      ];
    }
    case 'rouleaux': {
      const length = Number.parseInt(radioValue('roll_length'), 10);
      const count = positiveInt('roll_count');
      return [
        { label: 'Rouleaux', value: count ? formatNumber(count) : EMPTY },
        {
          label: 'Métrage total',
          value: length && count ? `${formatNumber(length * count)} m` : EMPTY,
        },
      ];
    }
    case 'rail': {
      const length = positiveInt('rail_length');
      const plates = positiveInt('plate_count');
      return [
        {
          label: 'Sections de rail',
          value: length ? formatNumber(Math.ceil(length / RAIL_SECTION_MM)) : EMPTY,
        },
        { label: 'Plaques', value: plates ? formatNumber(plates) : EMPTY },
      ];
    }
    default: {
      const surface = width && height ? (width * height * quantity) / 1_000_000 : null;
      const sections = width ? Math.ceil(width / RAIL_SECTION_MM) * quantity : null;
      return [
        { label: 'Surface à couvrir', value: surface ? `${formatNumber(surface)} m²` : EMPTY },
        { label: 'Rail (984 mm)', value: sections ? plural(sections, 'section') : EMPTY },
      ];
    }
  }
}

/** Renseigne une ligne du récapitulatif ; la masque si elle est hors sujet. */
function setRecap(key, value, relevant = true) {
  const target = recap.querySelector(`[data-recap-field="${key}"]`);
  if (!target) return;
  target.textContent = value || EMPTY;
  target.parentElement.hidden = !relevant;
}

function setKpi(index, { label, value }) {
  const kpi = recap.querySelector(`[data-recap-kpi="${index}"]`);
  if (!kpi) return;
  kpi.querySelector('dt').textContent = label;
  kpi.querySelector('dd').textContent = value;
}
