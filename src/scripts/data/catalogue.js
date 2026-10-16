/**
 * Catalogue IsoRideaux : formats de lanières, types de PVC et produits.
 *
 * Source unique utilisée par le configurateur de devis. Si la gamme évolue,
 * pensez à mettre à jour :
 *   - ce fichier ;
 *   - le tableau de disponibilité (src/professionnels/kit-rideau-lanieres/index.html) ;
 *   - les libellés côté serveur (public/api/send.php → OPTION_LABELS).
 */

/** Types de PVC (identifiants = valeurs envoyées par le formulaire). */
export const PVC_TYPES = {
  standard: 'Standard transparent',
  antistatique: 'Antistatique',
  congelateur: 'Congélateur (polaire)',
  translucide: 'Translucide',
  nervure: 'Nervuré',
  'nervure-congelateur': 'Nervuré congélateur',
  soudure: 'Soudure',
  occultant: 'Occultant noir',
};

/** Formats de lanières (largeur × épaisseur) et types disponibles pour chacun. */
export const PVC_FORMATS = {
  '200x2': {
    label: '200 × 2 mm',
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
    types: ['standard', 'congelateur', 'soudure', 'occultant'],
  },
  '300x3': {
    label: '300 × 3 mm',
    types: ['standard', 'antistatique', 'translucide', 'nervure', 'nervure-congelateur'],
  },
  '400x4': {
    label: '400 × 4 mm',
    types: ['standard', 'congelateur', 'nervure'],
  },
};

/**
 * Produits proposés dans le configurateur.
 * `groups` : blocs de champs à afficher (attribut data-quote-group du HTML).
 * `types`  : restreint les types de PVC proposés (tous si absent).
 */
export const PRODUCTS = {
  kit: {
    label: 'Kit rideau à lanières',
    groups: ['dimensions', 'format', 'type', 'options'],
  },
  'chambre-froide': {
    label: 'Chambre froide / meuble réfrigéré',
    groups: ['dimensions', 'format', 'type', 'options'],
    types: ['congelateur', 'nervure-congelateur'],
  },
  soudure: {
    label: 'Rideau de soudure',
    groups: ['dimensions', 'format', 'type', 'options'],
    types: ['soudure'],
  },
  lanieres: {
    label: 'Lanières de remplacement',
    groups: ['strips', 'format', 'type'],
  },
  rouleaux: {
    label: 'Rouleaux PVC',
    groups: ['roll', 'format', 'type'],
  },
  rail: {
    label: 'Rail & accessoires',
    groups: ['rail'],
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

/**
 * Format conseillé selon la hauteur de l'ouverture (mm).
 * @param {number} height
 * @returns {string | null} identifiant du format, ou null si hauteur invalide.
 */
export function recommendFormat(height) {
  if (!Number.isFinite(height) || height <= 0) return null;
  return FORMAT_BY_HEIGHT.find(({ upTo }) => height <= upTo).format;
}

/**
 * Types de PVC autorisés pour un produit et un format donnés.
 * @param {string} productId
 * @param {string} formatId
 * @returns {string[]}
 */
export function availableTypes(productId, formatId) {
  const product = PRODUCTS[productId];
  const format = PVC_FORMATS[formatId];
  if (!product || !format) return [];
  return format.types.filter((type) => !product.types || product.types.includes(type));
}
