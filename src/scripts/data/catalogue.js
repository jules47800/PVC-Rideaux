/**
 * Catalogue IsoRideaux : formats de lanières, types de PVC et produits.
 *
 * Source unique utilisée par le configurateur de devis. Si la gamme évolue,
 * pensez à mettre à jour :
 *   - ce fichier ;
 *   - le tableau de disponibilité (src/professionnels/kit-rideau-lanieres/index.html) ;
 *   - les libellés côté serveur (lib/forms.js → OPTION_LABELS).
 */

/** Types de PVC, dans l'ordre d'affichage (identifiants = valeurs du formulaire). */
export const PVC_TYPES = [
  'standard',
  'congelateur',
  'nervure',
  'nervure-congelateur',
  'antistatique',
  'translucide',
  'occultant',
  'soudure',
];

/** Formats de lanières (largeur × épaisseur), du plus fin au plus robuste. */
export const PVC_FORMATS = {
  '200x2': {
    label: '200 × 2 mm',
    stripWidth: 200,
    types: [
      'standard',
      'antistatique',
      'congelateur',
      'translucide',
      'nervure',
      'nervure-congelateur',
    ],
  },
  '300x2': {
    label: '300 × 2 mm',
    stripWidth: 300,
    types: ['standard', 'congelateur', 'soudure', 'occultant'],
  },
  '300x3': {
    label: '300 × 3 mm',
    stripWidth: 300,
    types: ['standard', 'antistatique', 'translucide', 'nervure', 'nervure-congelateur'],
  },
  '400x4': {
    label: '400 × 4 mm',
    stripWidth: 400,
    types: ['standard', 'congelateur', 'nervure'],
  },
};

/**
 * Produits proposés dans le configurateur.
 * `steps` : étapes du parcours propres au produit (attribut data-group du HTML).
 * `types` : restreint les types de PVC proposés (tous si absent).
 */
export const PRODUCTS = {
  kit: {
    steps: ['dimensions', 'type', 'format', 'options'],
  },
  'chambre-froide': {
    steps: ['dimensions', 'type', 'format', 'options'],
    types: ['congelateur', 'nervure-congelateur'],
  },
  soudure: {
    steps: ['dimensions', 'type', 'format', 'options'],
    types: ['soudure'],
  },
  lanieres: {
    steps: ['strips', 'type', 'format'],
  },
  rouleaux: {
    steps: ['roll', 'type', 'format'],
  },
  rail: {
    steps: ['rail'],
  },
};

/** Longueur d'une section de rail inox, en mm. */
export const RAIL_SECTION_MM = 984;

/**
 * Repères indicatifs : plus l'ouverture est haute, plus la lanière doit être
 * large et épaisse pour bien retomber et résister au vent.
 */
const FORMAT_BY_HEIGHT = [
  { format: '200x2', upTo: 2500 },
  { format: '300x3', upTo: 4000 },
  { format: '400x4', upTo: Infinity },
];

const FORMAT_ORDER = Object.keys(PVC_FORMATS);

/**
 * Types de PVC proposés pour un produit.
 * @param {string} productId
 * @returns {string[]}
 */
export function typesForProduct(productId) {
  const allowed = PRODUCTS[productId]?.types;
  return PVC_TYPES.filter((type) => !allowed || allowed.includes(type));
}

/**
 * Formats disponibles pour un type de PVC (et compatibles avec le produit).
 * @param {string} productId
 * @param {string} typeId
 * @returns {string[]}
 */
export function formatsFor(productId, typeId) {
  if (!typesForProduct(productId).includes(typeId)) return [];
  return FORMAT_ORDER.filter((id) => PVC_FORMATS[id].types.includes(typeId));
}

/**
 * Format conseillé selon la hauteur (mm), parmi les formats disponibles.
 * Si le format idéal n'existe pas dans la matière choisie, on retient le plus
 * proche, en privilégiant le plus robuste.
 *
 * @param {number | null} height
 * @param {string[]} available
 * @returns {string | null}
 */
export function recommendFormat(height, available) {
  if (!available.length || !Number.isFinite(height) || height <= 0) return null;

  const ideal = FORMAT_BY_HEIGHT.find(({ upTo }) => height <= upTo).format;
  if (available.includes(ideal)) return ideal;

  const target = FORMAT_ORDER.indexOf(ideal);
  const distance = (id) => Math.abs(FORMAT_ORDER.indexOf(id) - target);
  return [...available].sort(
    (a, b) => distance(a) - distance(b) || FORMAT_ORDER.indexOf(b) - FORMAT_ORDER.indexOf(a),
  )[0];
}
