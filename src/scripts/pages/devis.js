/**
 * Configurateur de devis « une question par écran » (page /devis/).
 *
 * Amélioration progressive : sans JavaScript, toutes les étapes du formulaire
 * s'affichent les unes sous les autres. Ce script :
 *   - n'affiche qu'une étape à la fois, avec barre de progression ;
 *   - n'enchaîne que les étapes utiles au produit choisi (les autres sont
 *     désactivées : ni validées, ni envoyées) et saute celles qui n'ont
 *     qu'une seule réponse possible ;
 *   - passe à la question suivante dès qu'un choix est cliqué ;
 *   - gère le clavier (Entrée pour continuer, lettres A, B, C… pour choisir) ;
 *   - conseille un format de lanière selon la hauteur ;
 *   - affiche un aperçu du rideau et un récapitulatif modifiable ;
 *   - mémorise la configuration (jamais les coordonnées) pour la reprendre.
 *
 * Paramètres d'URL acceptés :
 *   ?profil=pro&produit=kit&type=standard&format=200x2&largeur=1200&hauteur=2400
 * L'envoi est géré par le module commun forms.js.
 */
import {
  PRODUCTS,
  PVC_FORMATS,
  RAIL_SECTION_MM,
  formatsFor,
  recommendFormat,
  typesForProduct,
} from '../data/catalogue.js';
import { createCurtainPreview } from '../modules/curtain-preview.js';
import { validateFields } from '../modules/forms.js';

const STORAGE_KEY = 'isorideaux:devis';
const STORAGE_MAX_AGE_MS = 30 * 24 * 3600 * 1000;

/** Champs de configuration mémorisés, dans l'ordre du parcours (aucune donnée personnelle). */
const SAVED_FIELDS = [
  'profile',
  'product',
  'width',
  'height',
  'quantity',
  'strip_length',
  'strip_count',
  'hanging_plates',
  'rail_length',
  'plate_count',
  'pvc_type',
  'pvc_format',
  'roll_length',
  'roll_count',
  'overlap',
  'red_borders',
];

const URL_PARAMS = {
  profil: 'profile',
  produit: 'product',
  type: 'pvc_type',
  format: 'pvc_format',
  largeur: 'width',
  hauteur: 'height',
};

/** Étapes de « mesures » (cible du lien « Modifier » du récapitulatif). */
const SIZE_STEPS = ['dimensions', 'strips', 'roll', 'rail'];

const AUTO_ADVANCE_DELAY_MS = 280;
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const KEYS = 'ABCDEFGH';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const numberFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
const fmt = (number) => numberFormat.format(number);
const plural = (count, word) => `${fmt(count)} ${word}${count > 1 ? 's' : ''}`;

const form = document.querySelector('[data-funnel]');

if (form) initFunnel(form);

function initFunnel(form) {
  const steps = [...form.querySelectorAll('[data-step]')];
  const stepByName = Object.fromEntries(steps.map((step) => [step.dataset.step, step]));
  const progress = document.querySelector('[data-funnel-progress]');
  const previewPanel = document.querySelector('[data-funnel-preview]');
  const preview = createCurtainPreview(document.querySelector('[data-curtain-preview]'));
  const startButton = form.querySelector('[data-funnel-start]');
  const resumeButton = form.querySelector('[data-funnel-resume]');

  let current = null;
  let navigating = false;
  let autoAdvanceTimer;
  let returnToContact = false;

  /* -------------------------------------------------------------------------
     Lecture / écriture des champs
     ----------------------------------------------------------------------- */

  const radios = (name) => [...form.querySelectorAll(`input[type="radio"][name="${name}"]`)];
  const checked = (name) => radios(name).find((radio) => radio.checked) ?? null;
  const fieldsOf = (container) => [...container.querySelectorAll('input, select, textarea')];

  function value(name) {
    const field = form.elements.namedItem(name);
    if (field instanceof RadioNodeList) return checked(name)?.value ?? '';
    return field?.value ?? '';
  }

  function setValue(name, newValue) {
    const field = form.elements.namedItem(name);
    if (field instanceof RadioNodeList) {
      radios(name).forEach((radio) => {
        radio.checked = radio.value === newValue;
      });
    } else if (field) {
      field.value = newValue;
    }
  }

  /** Entier strictement positif, ou null. */
  function positiveInt(name) {
    const number = Number.parseInt(value(name), 10);
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  /** Libellé lisible d'un choix (texte du <strong> de sa carte). */
  function choiceLabel(name) {
    return checked(name)?.closest('label')?.querySelector('strong')?.textContent.trim() ?? '';
  }

  const product = () => (PRODUCTS[value('product')] ? value('product') : null);
  const isPro = () => value('profile') === 'pro';

  /* -------------------------------------------------------------------------
     Parcours : étapes utiles au produit choisi
     ----------------------------------------------------------------------- */

  function isInPath(step) {
    if (step === stepByName.welcome) return false;
    const { group } = step.dataset;
    if (!group) return true;
    const productId = product();
    return Boolean(productId && PRODUCTS[productId].steps.includes(group));
  }

  /** Étape à réponse unique déjà résolue (ex. soudure : une seule matière possible). */
  function isTrivial(step) {
    if (!step.hasAttribute('data-auto-advance') || !step.dataset.group) return false;
    const available = fieldsOf(step).filter((field) => !field.disabled);
    return available.length === 1 && available[0].checked;
  }

  const path = () => steps.filter((step) => isInPath(step) && !isTrivial(step));

  const isStepValid = (step) => fieldsOf(step).every((field) => field.checkValidity());

  /** Toutes les étapes avant les coordonnées sont-elles remplies ? (sans afficher d'erreur) */
  const isPathComplete = () =>
    path()
      .filter((step) => step !== stepByName.contact)
      .every(isStepValid);

  /** Première étape du parcours encore incomplète (reprise, liens pré-remplis). */
  const firstIncompleteStep = () => path().find((step) => !isStepValid(step)) ?? stepByName.contact;

  /* -------------------------------------------------------------------------
     Synchronisation des choix disponibles
     ----------------------------------------------------------------------- */

  function sync() {
    const productId = product();

    // Étapes hors parcours : désactivées (ni validées, ni envoyées).
    steps.forEach((step) => {
      if (step.dataset.group) step.disabled = !isInPath(step);
    });

    // Questions et champs réservés aux professionnels.
    form.querySelectorAll('[data-pro-only]').forEach((block) => {
      block.hidden = !isPro();
      fieldsOf(block).forEach((field) => {
        field.disabled = !isPro();
      });
    });

    // Champs obligatoires seulement dans les étapes actives.
    form.querySelectorAll('[data-required]').forEach((field) => {
      field.required = !field.disabled && !field.closest('fieldset:disabled');
    });

    syncChoices('pvc_type', productId ? typesForProduct(productId) : []);
    syncChoices('pvc_format', productId ? formatsFor(productId, value('pvc_type')) : []);
    syncChoices('roll_length', value('pvc_type') === 'soudure' ? ['25'] : ['25', '50']);
    syncFormatAdvice();
    assignKeys();
  }

  /**
   * N'affiche que les options disponibles, décoche celles qui ne le sont plus
   * et sélectionne d'office la seule option restante.
   */
  function syncChoices(name, available) {
    radios(name).forEach((radio) => {
      const isAvailable = available.includes(radio.value);
      radio.disabled = !isAvailable;
      radio.closest('label').hidden = !isAvailable;
      if (!isAvailable) radio.checked = false;
    });

    if (available.length === 1) setValue(name, available[0]);
  }

  /** Hauteur de référence pour conseiller un format. */
  function referenceHeight() {
    if (product() === 'lanieres') return positiveInt('strip_length');
    return PRODUCTS[product()]?.steps.includes('dimensions') ? positiveInt('height') : null;
  }

  function syncFormatAdvice() {
    const available = radios('pvc_format')
      .filter((radio) => !radio.disabled)
      .map((radio) => radio.value);
    const height = referenceHeight();
    const advised = recommendFormat(height, available);

    form.querySelectorAll('[data-reco-badge]').forEach((badge) => {
      badge.hidden = badge.closest('label').querySelector('input').value !== advised;
    });

    // Le format conseillé est présélectionné tant que le visiteur n'a rien choisi.
    if (advised && !checked('pvc_format')) setValue('pvc_format', advised);

    form.querySelector('[data-format-help]').textContent = advised
      ? `Pour ${fmt(height)} mm de hauteur, nous vous conseillons ${PVC_FORMATS[advised].label}.`
      : 'Largeur × épaisseur de chaque lanière.';
  }

  /** Choix pilotables au clavier (ceux qui affichent une lettre). */
  const keyedChoices = (step) =>
    [...step.querySelectorAll('.choice')].filter(
      (choice) => !choice.hidden && choice.querySelector('.choice__key'),
    );

  function assignKeys() {
    steps.forEach((step) => {
      keyedChoices(step).forEach((choice, index) => {
        choice.querySelector('.choice__key').textContent = KEYS[index] ?? '';
      });
    });
  }

  /* -------------------------------------------------------------------------
     Navigation
     ----------------------------------------------------------------------- */

  async function goTo(target, { direction = 1, focus = true } = {}) {
    if (!target || target === current || navigating) return;
    navigating = true;
    clearTimeout(autoAdvanceTimer);

    const previous = current;
    current = target;

    // Sortie rapide de l'étape courante, entrée un peu plus ample de la suivante.
    if (previous && !reducedMotion.matches) {
      await previous
        .animate(
          [
            { opacity: 1, transform: 'none' },
            { opacity: 0, transform: `translateY(${-12 * direction}px)` },
          ],
          { duration: 150, easing: EASE_OUT },
        )
        .finished.catch(() => {});
    }

    steps.forEach((step) => {
      step.hidden = step !== target;
    });

    if (previous) {
      target.animate(
        reducedMotion.matches
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { opacity: 0, transform: `translateY(${16 * direction}px)` },
              { opacity: 1, transform: 'none' },
            ],
        { duration: 280, easing: EASE_OUT },
      );
    }

    if (window.scrollY > 0) window.scrollTo({ top: 0 });
    updateProgress();
    render();
    if (focus) focusStep(target);
    navigating = false;
  }

  /** Focus sur le premier champ vide (comme Typeform), sinon sur la question. */
  function focusStep(step) {
    const emptyInput = fieldsOf(step).find(
      (field) =>
        field.matches('.input, .textarea') &&
        !field.disabled &&
        !field.closest('[hidden]') &&
        !field.value,
    );
    (emptyInput ?? step.querySelector('.funnel-step__title')).focus({ preventScroll: true });
  }

  function next() {
    if (!current || navigating) return;

    if (current !== stepByName.welcome && validateFields(current).length) {
      shake(current);
      return;
    }

    sync();
    saveProgress();

    if (returnToContact && isPathComplete()) {
      returnToContact = false;
      goTo(stepByName.contact);
      return;
    }

    const route = path();
    goTo(route[route.indexOf(current) + 1] ?? stepByName.contact);
  }

  function back() {
    if (!current || navigating) return;
    const route = path();
    const index = route.indexOf(current);
    goTo(index > 0 ? route[index - 1] : stepByName.welcome, { direction: -1 });
  }

  function scheduleAdvance() {
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = setTimeout(next, AUTO_ADVANCE_DELAY_MS);
  }

  function updateProgress() {
    const isWelcome = current === stepByName.welcome;
    progress.hidden = isWelcome;
    if (isWelcome) return;

    const route = path();
    const ratio = (Math.max(0, route.indexOf(current)) + 1) / route.length;
    progress.firstElementChild.style.transform = `scaleX(${ratio})`;
    progress.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));

    route.forEach((step, index) => {
      const kicker = step.querySelector('[data-step-kicker]');
      if (!kicker) return;
      kicker.textContent =
        step === stepByName.contact
          ? 'Dernière étape'
          : `Question ${index + 1} sur ${route.length - 1}`;
    });
  }

  /** Léger tremblement quand une réponse manque. */
  function shake(element) {
    if (reducedMotion.matches) return;
    element.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(5px)' },
        { transform: 'translateX(-3px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 320, easing: EASE_OUT },
    );
  }

  /* -------------------------------------------------------------------------
     Aperçu, indicateurs et récapitulatif
     ----------------------------------------------------------------------- */

  function readState() {
    return {
      product: product(),
      width: positiveInt('width'),
      height: positiveInt('height'),
      quantity: positiveInt('quantity') ?? 1,
      format: value('pvc_format'),
      type: value('pvc_type'),
      overlap: value('overlap'),
      redBorders: isPro() && value('red_borders') === 'oui',
      stripLength: positiveInt('strip_length'),
      stripCount: positiveInt('strip_count'),
      rollLength: positiveInt('roll_length'),
      rollCount: positiveInt('roll_count') ?? 1,
      railLength: positiveInt('rail_length'),
      plateCount: positiveInt('plate_count'),
    };
  }

  function render() {
    const state = readState();
    preview.update(state);
    renderKpis(state);
    renderChips(state);
    renderRecap(state);
  }

  function sizeSummary(state) {
    switch (state.product) {
      case 'lanieres':
        return state.stripLength && state.stripCount
          ? `${plural(state.stripCount, 'lanière')} de ${fmt(state.stripLength)} mm`
          : '';
      case 'rouleaux':
        return state.rollLength
          ? `${plural(state.rollCount, 'rouleau')} de ${state.rollLength} m`
          : '';
      case 'rail':
        return state.railLength ? `${fmt(state.railLength)} mm de rail` : '';
      default: {
        if (!state.width || !state.height) return '';
        const quantity = state.quantity > 1 ? ` · ${plural(state.quantity, 'rideau')}` : '';
        return `${fmt(state.width)} × ${fmt(state.height)} mm${quantity}`;
      }
    }
  }

  /** Deux indicateurs clés selon le produit. */
  function kpisFor(state) {
    const empty = '—';
    switch (state.product) {
      case 'lanieres': {
        const meters =
          state.stripLength && state.stripCount
            ? (state.stripLength * state.stripCount) / 1000
            : null;
        return [
          { label: 'Lanières', value: state.stripCount ? fmt(state.stripCount) : empty },
          { label: 'Métrage', value: meters ? `${fmt(meters)} m` : empty },
        ];
      }
      case 'rouleaux':
        return [
          { label: 'Rouleaux', value: fmt(state.rollCount) },
          {
            label: 'Métrage',
            value: state.rollLength ? `${fmt(state.rollLength * state.rollCount)} m` : empty,
          },
        ];
      case 'rail':
        return [
          {
            label: 'Sections',
            value: state.railLength ? fmt(Math.ceil(state.railLength / RAIL_SECTION_MM)) : empty,
          },
          { label: 'Plaques', value: state.plateCount ? fmt(state.plateCount) : empty },
        ];
      default: {
        const surface =
          state.width && state.height ? (state.width * state.height * state.quantity) / 1e6 : null;
        const sections = state.width
          ? Math.ceil(state.width / RAIL_SECTION_MM) * state.quantity
          : null;
        return [
          { label: 'Surface', value: surface ? `${fmt(surface)} m²` : empty },
          { label: 'Rail inox', value: sections ? plural(sections, 'section') : empty },
        ];
      }
    }
  }

  function renderKpis(state) {
    kpisFor(state).forEach(({ label, value: kpiValue }, index) => {
      const kpi = previewPanel.querySelector(`[data-kpi="${index + 1}"]`);
      kpi.querySelector('dt').textContent = label;
      kpi.querySelector('dd').textContent = kpiValue;
    });
  }

  function renderChips(state) {
    const labels = [
      choiceLabel('product'),
      sizeSummary(state),
      choiceLabel('pvc_type'),
      choiceLabel('pvc_format'),
    ];
    previewPanel.querySelector('[data-preview-chips]').replaceChildren(
      ...labels.filter(Boolean).map((label) => {
        const item = document.createElement('li');
        item.className = 'chip';
        item.textContent = label;
        return item;
      }),
    );
  }

  function renderRecap(state) {
    const productSteps = PRODUCTS[state.product]?.steps ?? [];
    const options = [
      state.overlap ? `Chevauchement ${choiceLabel('overlap').toLowerCase()}` : '',
      state.redBorders ? 'bordures rouges' : '',
    ]
      .filter(Boolean)
      .join(' · ');

    const rows = {
      product: choiceLabel('product'),
      size: sizeSummary(state),
      type: productSteps.includes('type') ? choiceLabel('pvc_type') : '',
      format: productSteps.includes('format') ? choiceLabel('pvc_format') : '',
      options: productSteps.includes('options') ? options : '',
    };

    const recap = form.querySelector('[data-funnel-recap]');
    recap.hidden = !rows.product;
    Object.entries(rows).forEach(([key, text]) => {
      const row = recap.querySelector(`[data-recap="${key}"]`);
      row.hidden = !text;
      row.querySelector('dd').textContent = text;
      // Rien à modifier quand une seule réponse était possible (ex. soudure).
      if (stepByName[key])
        row.querySelector('[data-edit-step]').hidden = isTrivial(stepByName[key]);
    });
  }

  /* -------------------------------------------------------------------------
     Mémorisation de la configuration (navigateur du visiteur uniquement)
     ----------------------------------------------------------------------- */

  function saveProgress() {
    const data = Object.fromEntries(
      SAVED_FIELDS.map((name) => [name, value(name)]).filter(([, fieldValue]) => fieldValue !== ''),
    );
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
    } catch {
      // Stockage indisponible (navigation privée…) : la reprise est simplement désactivée.
    }
  }

  function readProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      if (!saved?.data || Date.now() - saved.savedAt > STORAGE_MAX_AGE_MS) return null;
      return saved.data;
    } catch {
      return null;
    }
  }

  function clearProgress() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Rien à effacer.
    }
  }

  /** Applique des valeurs dans l'ordre du parcours (le produit avant la matière, etc.). */
  function applyValues(values) {
    SAVED_FIELDS.forEach((name) => {
      if (values[name] === undefined) return;
      sync();
      setValue(name, String(values[name]));
    });
    sync();
    render();
  }

  /* -------------------------------------------------------------------------
     Événements
     ----------------------------------------------------------------------- */

  form.addEventListener('input', () => {
    sync();
    render();
  });

  form.addEventListener('change', (event) => {
    sync();
    render();
    if (SAVED_FIELDS.includes(event.target.name)) saveProgress();
  });

  // Clic (souris, doigt) sur une carte de choix : on enchaîne, même si elle était
  // déjà sélectionnée. La sélection au clavier (flèches, espace) n'enchaîne pas.
  form.addEventListener('click', (event) => {
    if (event.target.matches('input')) return;
    const choice = event.target.closest('label.choice');
    if (choice && choice.closest('[data-auto-advance]') === current) scheduleAdvance();
  });

  form
    .querySelectorAll('[data-funnel-next]')
    .forEach((button) => button.addEventListener('click', next));
  form
    .querySelectorAll('[data-funnel-back]')
    .forEach((button) => button.addEventListener('click', back));

  startButton.addEventListener('click', () => {
    clearProgress();
    goTo(path()[0]);
  });

  resumeButton.addEventListener('click', () => {
    applyValues(readProgress() ?? {});
    goTo(firstIncompleteStep());
  });

  form.querySelectorAll('[data-edit-step]').forEach((button) => {
    button.addEventListener('click', () => {
      const name = button.dataset.editStep;
      const target =
        name === 'size'
          ? path().find((step) => SIZE_STEPS.includes(step.dataset.step))
          : stepByName[name];
      returnToContact = true;
      goTo(target, { direction: -1 });
    });
  });

  // Boutons − / + des compteurs.
  form.querySelectorAll('[data-stepper]').forEach((button) => {
    button.hidden = false;
    button.addEventListener('click', () => {
      const input = document.getElementById(button.getAttribute('aria-controls'));
      if (Number(button.dataset.stepper) > 0) input.stepUp();
      else input.stepDown();
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  // Exemples de dimensions.
  const presets = form.querySelector('[data-presets]');
  presets.hidden = false;
  presets.addEventListener('click', (event) => {
    const button = event.target.closest('[data-preset-width]');
    if (!button) return;
    setValue('width', button.dataset.presetWidth);
    setValue('height', button.dataset.presetHeight);
    form.querySelector('#height').dispatchEvent(new Event('change', { bubbles: true }));
  });

  // Clavier : Entrée pour continuer, lettres A, B, C… pour choisir.
  document.addEventListener('keydown', (event) => {
    if (!current || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
    const { target } = event;

    if (event.key === 'Enter') {
      if (target.matches('textarea, button, a, [type="checkbox"]')) return;
      if (current === stepByName.contact) return; // envoi natif du formulaire
      event.preventDefault();
      if (current === stepByName.welcome)
        (resumeButton.hidden ? startButton : resumeButton).click();
      else next();
      return;
    }

    if (target.matches('input.input, textarea, select') || event.key.length !== 1) return;
    const choice = keyedChoices(current)[KEYS.indexOf(event.key.toUpperCase())];
    if (!choice) return;

    const radio = choice.querySelector('input');
    radio.checked = true;
    radio.focus();
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    if (current.hasAttribute('data-auto-advance')) scheduleAdvance();
  });

  // Erreur détectée à l'envoi (ou renvoyée par le serveur) : retour à l'étape concernée.
  form.addEventListener('form:invalid', (event) => {
    const { field } = event.detail;
    const step = field.closest('[data-step]');
    if (!step) return;
    event.preventDefault();
    if (step === current) field.focus();
    else goTo(step, { direction: -1 }).then(() => field.focus());
  });

  form.addEventListener('form:success', clearProgress);

  /* -------------------------------------------------------------------------
     Démarrage
     ----------------------------------------------------------------------- */

  form.classList.add('is-enhanced');
  previewPanel.hidden = false;
  steps.forEach((step) => {
    step.hidden = true;
  });

  const params = new URLSearchParams(window.location.search);
  const fromUrl = Object.fromEntries(
    Object.entries(URL_PARAMS)
      .filter(([param]) => params.get(param))
      .map(([param, name]) => [name, params.get(param)]),
  );

  if (Object.keys(fromUrl).length) {
    // Arrivée depuis un bouton « Devis » ou le mini-formulaire : on va droit au but.
    applyValues(fromUrl);
    goTo(firstIncompleteStep(), { focus: false });
  } else {
    if (readProgress()) {
      resumeButton.hidden = false;
      startButton.classList.replace('btn--primary', 'btn--secondary');
      startButton.querySelector('[data-start-label]').textContent = 'Recommencer';
    }
    sync();
    render();
    goTo(stepByName.welcome, { focus: false });
  }
}
