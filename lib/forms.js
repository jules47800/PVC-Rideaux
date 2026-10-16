/**
 * Formulaires du site (contact & devis) : champs acceptés, validation et
 * contenu de l'e-mail. Utilisé par api/send.js.
 *
 * Les libellés ci-dessous doivent rester alignés avec
 * src/scripts/data/catalogue.js et les formulaires HTML.
 */

export const FORM_TYPES = ['contact', 'devis'];

/** Champs acceptés pour chaque formulaire, dans l'ordre d'affichage de l'e-mail. */
const FORM_FIELDS = {
  contact: ['profile', 'subject', 'name', 'company', 'email', 'phone', 'message', 'consent'],
  devis: [
    'profile',
    'product',
    'width',
    'height',
    'quantity',
    'strip_length',
    'strip_count',
    'hanging_plates',
    'roll_length',
    'roll_count',
    'rail_length',
    'plate_count',
    'pvc_format',
    'pvc_type',
    'overlap',
    'red_borders',
    'name',
    'company',
    'email',
    'phone',
    'postal_code',
    'message',
    'consent',
  ],
};

export const FIELD_LABELS = {
  profile: 'Profil',
  subject: 'Objet',
  product: 'Produit',
  width: 'Largeur (mm)',
  height: 'Hauteur (mm)',
  quantity: 'Nombre de rideaux',
  strip_length: 'Longueur des lanières (mm)',
  strip_count: 'Nombre de lanières',
  hanging_plates: 'Plaques de suspension',
  roll_length: 'Longueur du rouleau',
  roll_count: 'Nombre de rouleaux',
  rail_length: 'Longueur de rail (mm)',
  plate_count: 'Plaques de suspension (nombre)',
  pvc_format: 'Format des lanières',
  pvc_type: 'Matière',
  overlap: 'Chevauchement',
  red_borders: 'Bordures rouges',
  name: 'Nom',
  company: 'Société',
  email: 'E-mail',
  phone: 'Téléphone',
  postal_code: 'Code postal',
  message: 'Message',
};

/** Valeurs autorisées pour les champs à choix, avec leur libellé lisible. */
const OPTION_LABELS = {
  profile: { pro: 'Professionnel', particulier: 'Particulier' },
  subject: {
    information: 'Demande d’information / conseil',
    commande: 'Suivi de commande',
    sav: 'Pièce de rechange / SAV',
    autre: 'Autre demande',
  },
  product: {
    kit: 'Kit rideau à lanières',
    'chambre-froide': 'Chambre froide / meuble réfrigéré',
    soudure: 'Rideau de soudure',
    lanieres: 'Lanières de remplacement',
    rouleaux: 'Rouleaux PVC',
    rail: 'Rail & accessoires',
  },
  pvc_format: {
    '200x2': '200 × 2 mm',
    '300x2': '300 × 2 mm',
    '300x3': '300 × 3 mm',
    '400x4': '400 × 4 mm',
  },
  pvc_type: {
    standard: 'Standard transparent',
    antistatique: 'Antistatique',
    congelateur: 'Congélateur (polaire)',
    translucide: 'Translucide',
    nervure: 'Nervuré',
    'nervure-congelateur': 'Nervuré congélateur',
    soudure: 'Soudure',
    occultant: 'Occultant noir',
  },
  hanging_plates: { oui: 'Avec plaques', non: 'Lanières seules' },
  roll_length: { 25: '25 m', 50: '50 m' },
  overlap: { maximum: 'Maximum', minimum: 'Minimum' },
  red_borders: { oui: 'Oui', non: 'Non' },
};

/** Champs numériques entiers : [minimum, maximum]. */
const INTEGER_RANGES = {
  width: [300, 20000],
  height: [300, 8000],
  quantity: [1, 99],
  strip_length: [100, 8000],
  strip_count: [1, 500],
  roll_count: [1, 200],
  rail_length: [100, 50000],
  plate_count: [0, 2000],
};

/** Champs de configuration propres à chaque produit (formulaire de devis). */
const CURTAIN_FIELDS = [
  'width',
  'height',
  'quantity',
  'pvc_format',
  'pvc_type',
  'overlap',
  'red_borders',
];
const PRODUCT_FIELDS = {
  kit: CURTAIN_FIELDS,
  'chambre-froide': CURTAIN_FIELDS,
  soudure: CURTAIN_FIELDS,
  lanieres: ['strip_length', 'strip_count', 'hanging_plates', 'pvc_format', 'pvc_type'],
  rouleaux: ['roll_length', 'roll_count', 'pvc_format', 'pvc_type'],
  rail: ['rail_length', 'plate_count'],
};

/** Champs de configuration facultatifs (valeur par défaut ou optionnels). */
const OPTIONAL_PRODUCT_FIELDS = ['overlap', 'red_borders', 'hanging_plates', 'plate_count'];

/** Champs communs à toutes les demandes de devis. */
const QUOTE_COMMON_FIELDS = [
  'profile',
  'product',
  'name',
  'company',
  'email',
  'phone',
  'postal_code',
  'message',
  'consent',
];

const MAX_TEXT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 3000;
const EMAIL_RE = /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[a-z]{2,}$/i;

/** Texte sur une ligne : sans caractères de contrôle (ni retours à la ligne). */
const cleanLine = (value) =>
  value
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT_LENGTH);

/** Texte multiligne : retours à la ligne conservés, autres contrôles retirés. */
const cleanMultiline = (value) =>
  value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]+/g, '')
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);

/**
 * Ne conserve que les champs attendus, nettoyés. Pour un devis, ne garde que
 * les champs utiles au produit choisi (sans JavaScript, tous les blocs du
 * formulaire sont envoyés).
 *
 * @param {FormData} formData
 * @param {'contact' | 'devis'} formType
 */
export function collectFields(formData, formType) {
  const data = {};
  for (const name of FORM_FIELDS[formType]) {
    const value = formData.get(name);
    if (typeof value !== 'string') continue;
    const cleaned = name === 'message' ? cleanMultiline(value) : cleanLine(value);
    if (cleaned !== '') data[name] = cleaned;
  }

  if (formType === 'devis') {
    const relevant = new Set([...QUOTE_COMMON_FIELDS, ...(PRODUCT_FIELDS[data.product] ?? [])]);
    Object.keys(data).forEach((name) => {
      if (!relevant.has(name)) delete data[name];
    });
  }
  return data;
}

/** Erreurs sous la forme { champ: message }. */
export function validate(data, formType) {
  const errors = {};
  const required = ['profile', 'name', 'email', 'consent'];

  if (formType === 'contact') {
    required.push('subject', 'message');
  } else {
    const productFields = PRODUCT_FIELDS[data.product] ?? [];
    required.push(
      'product',
      'postal_code',
      ...productFields.filter((name) => !OPTIONAL_PRODUCT_FIELDS.includes(name)),
    );
    if (data.profile === 'pro') required.push('company');
  }

  for (const name of required) {
    if (data[name] === undefined) {
      errors[name] =
        name === 'consent'
          ? 'Merci de cocher cette case pour continuer.'
          : 'Ce champ est obligatoire.';
    }
  }

  for (const [name, value] of Object.entries(data)) {
    if (errors[name]) continue;
    if (OPTION_LABELS[name] && !Object.hasOwn(OPTION_LABELS[name], value)) {
      errors[name] = 'Choix invalide.';
    } else if (INTEGER_RANGES[name]) {
      const [min, max] = INTEGER_RANGES[name];
      const number = Number(value);
      if (!/^-?\d+$/.test(value) || number < min || number > max) {
        errors[name] = `Valeur attendue entre ${min} et ${max}.`;
      }
    }
  }

  if (data.name !== undefined && data.name.length < 2) errors.name = 'Merci d’indiquer votre nom.';
  if (data.email !== undefined && !EMAIL_RE.test(data.email))
    errors.email = 'Adresse e-mail invalide.';
  if (data.postal_code !== undefined && !/^\d{5}$/.test(data.postal_code)) {
    errors.postal_code = 'Indiquez un code postal à 5 chiffres.';
  }
  if (data.consent !== undefined && data.consent !== 'oui') {
    errors.consent = 'Merci de cocher cette case pour continuer.';
  }

  return errors;
}

/** Robot probable : champ piège rempli, ou formulaire rempli trop vite. */
export function looksLikeSpam(formData, minFillSeconds) {
  if (String(formData.get('website') ?? '').trim() !== '') return true;
  const startedAt = String(formData.get('started_at') ?? '');
  return /^\d+$/.test(startedAt) && Date.now() / 1000 - Number(startedAt) < minFillSeconds;
}

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Europe/Paris',
});

/** Objet et texte de l'e-mail envoyé à l'équipe. */
export function composeEmail(data, formType, siteName) {
  const lines = Object.entries(data)
    .filter(([name]) => name !== 'message' && name !== 'consent')
    .map(([name, value]) => `${FIELD_LABELS[name]} : ${OPTION_LABELS[name]?.[value] ?? value}`);

  const intro =
    formType === 'devis'
      ? 'Nouvelle demande de devis reçue depuis le site.'
      : 'Nouveau message reçu depuis le formulaire de contact.';

  const text = [
    intro,
    '',
    ...lines,
    '',
    'Message :',
    data.message ?? '(aucun)',
    '',
    '—',
    `Envoyé le ${dateTimeFormatter.format(new Date())} — consentement RGPD donné.`,
  ].join('\n');

  const topic =
    formType === 'devis'
      ? `Demande de devis — ${OPTION_LABELS.product[data.product] ?? ''}`
      : `Contact — ${OPTION_LABELS.subject[data.subject] ?? ''}`;
  const subject = `[${siteName}] ${topic} (${OPTION_LABELS.profile[data.profile] ?? ''})`;

  return { subject, text };
}
