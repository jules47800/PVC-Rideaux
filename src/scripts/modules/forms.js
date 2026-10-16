/**
 * Formulaires envoyés en arrière-plan (contact & devis).
 *
 * Amélioration progressive : sans JavaScript, le formulaire est posté
 * normalement vers api/send.php, qui redirige vers la page « Merci ».
 * Avec JavaScript :
 *   - validation en français, message sous chaque champ (accessible) ;
 *   - envoi via fetch, bouton en état de chargement ;
 *   - en développement (`npm run dev`), l'envoi est simulé (pas de PHP).
 *
 * Attributs utilisés :
 *   form[data-async-form]           active le module
 *   form[data-success-url]          page de redirection après succès
 *   [data-form-alert]               zone de message global (erreur serveur…)
 *   [data-default-message]          message d'erreur par défaut (sur l'alerte)
 *
 * Événements émis sur le formulaire (utilisés par le configurateur pas à pas) :
 *   form:invalid  { detail.field }  premier champ en erreur ; preventDefault()
 *                                   empêche la mise au focus automatique.
 *   form:success                    juste avant la redirection.
 */
const ERROR_ICON =
  '<svg class="icon" aria-hidden="true"><use href="/icons.svg#i-info"></use></svg>';

export function initForms() {
  document.querySelectorAll('form[data-async-form]').forEach(setupForm);
}

function setupForm(form) {
  form.noValidate = true;

  const startedAt = form.elements.namedItem('started_at');
  if (startedAt) startedAt.value = String(Math.floor(Date.now() / 1000));

  // Validation au fil de l'eau : à la sortie d'un champ, puis en direct
  // tant qu'il est en erreur.
  form.addEventListener('focusout', (event) => {
    if (isValidatable(event.target) && event.target.type !== 'radio') validateField(event.target);
  });

  const revalidate = (event) => {
    const field = event.target;
    if (isValidatable(field) && field.getAttribute('aria-invalid') === 'true') validateField(field);
  };
  form.addEventListener('input', revalidate);
  form.addEventListener('change', revalidate);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    hideAlert(form);

    const invalid = validateFields(form);
    if (invalid.length) {
      reportInvalid(form, invalid[0]);
      return;
    }

    submitForm(form);
  });
}

/* ---------------------------------------------------------------------------
   Validation
   ------------------------------------------------------------------------- */

function isValidatable(element) {
  return (
    element instanceof HTMLElement &&
    'willValidate' in element &&
    element.willValidate &&
    !element.closest('.field--trap')
  );
}

/**
 * Valide les champs actifs d'un formulaire ou d'une partie de formulaire
 * (fieldset, étape…) et affiche les messages ; renvoie les champs invalides.
 *
 * @param {HTMLFormElement | HTMLFieldSetElement | HTMLElement} container
 * @returns {HTMLElement[]}
 */
export function validateFields(container) {
  const seenGroups = new Set();
  const invalid = [];
  const fields = container.elements ?? container.querySelectorAll('input, select, textarea');

  for (const field of fields) {
    if (!isValidatable(field)) continue;
    if (field.type === 'radio') {
      if (seenGroups.has(field.name)) continue;
      seenGroups.add(field.name);
    }
    if (!validateField(field)) invalid.push(field);
  }

  return invalid;
}

function validateField(field) {
  if (field.checkValidity()) {
    clearError(field);
    return true;
  }
  showError(field, messageFor(field));
  return false;
}

function messageFor(field) {
  const { validity } = field;

  if (validity.valueMissing) {
    if (field.type === 'checkbox') return 'Merci de cocher cette case pour continuer.';
    if (field.type === 'radio') return 'Merci de sélectionner une option.';
    return 'Ce champ est obligatoire.';
  }
  if (validity.typeMismatch && field.type === 'email') {
    return 'Adresse e-mail invalide (exemple : nom@domaine.fr).';
  }
  if (validity.patternMismatch) return field.dataset.patternMessage || 'Format invalide.';
  if (validity.rangeUnderflow) return `Valeur minimale : ${formatLimit(field, field.min)}.`;
  if (validity.rangeOverflow) return `Valeur maximale : ${formatLimit(field, field.max)}.`;
  if (validity.stepMismatch || validity.badInput) return 'Merci de saisir un nombre entier.';
  if (validity.tooShort) return `Au moins ${field.minLength} caractères.`;

  return field.validationMessage;
}

function formatLimit(field, value) {
  const unit = field.dataset.unit ? ` ${field.dataset.unit}` : '';
  return `${Number(value).toLocaleString('fr-FR')}${unit}`;
}

/** Champs liés (un groupe radio partage le même message). */
function relatedFields(field) {
  if (field.type !== 'radio' || !field.form) return [field];
  return [...field.form.elements].filter((el) => el.type === 'radio' && el.name === field.name);
}

function errorHost(field) {
  return field.type === 'radio' ? field.closest('fieldset') : field.closest('.field') || field;
}

function showError(field, message) {
  const host = errorHost(field);
  const id = `${field.name}-error`;
  let error = host.querySelector(':scope > .field__error');

  if (!error) {
    error = document.createElement('p');
    error.className = 'field__error';
    error.id = id;
    // Le message se place avant un éventuel bloc marqué [data-errors-before]
    // (boutons de navigation du configurateur), sinon en fin de bloc.
    const anchor = host.querySelector(':scope > [data-errors-before]');
    if (anchor) anchor.before(error);
    else host.append(error);
  }

  error.innerHTML = ERROR_ICON;
  error.append(document.createTextNode(message));

  relatedFields(field).forEach((el) => {
    el.setAttribute('aria-invalid', 'true');
    el.setAttribute('aria-describedby', mergeIds(el.getAttribute('aria-describedby'), id));
  });
}

function clearError(field) {
  const host = errorHost(field);
  const error = host.querySelector(':scope > .field__error');
  if (!error) return;

  relatedFields(field).forEach((el) => {
    el.removeAttribute('aria-invalid');
    const remaining = removeId(el.getAttribute('aria-describedby'), error.id);
    if (remaining) el.setAttribute('aria-describedby', remaining);
    else el.removeAttribute('aria-describedby');
  });
  error.remove();
}

const mergeIds = (list, id) =>
  [...new Set([...(list || '').split(' ').filter(Boolean), id])].join(' ');
const removeId = (list, id) =>
  (list || '')
    .split(' ')
    .filter((item) => item && item !== id)
    .join(' ');

/** Signale le premier champ en erreur ; le met au focus sauf si un écouteur s'en charge. */
function reportInvalid(form, field) {
  const event = new CustomEvent('form:invalid', { detail: { field }, cancelable: true });
  if (form.dispatchEvent(event)) field.focus();
}

/* ---------------------------------------------------------------------------
   Envoi
   ------------------------------------------------------------------------- */

async function submitForm(form) {
  const submitButton = form.querySelector('[type="submit"]');
  setBusy(submitButton, true);

  try {
    const data = new FormData(form);

    if (import.meta.env.DEV) {
      // Pas de serveur PHP avec `vite` : on simule l'envoi.
      console.info('[dev] Envoi simulé du formulaire :', Object.fromEntries(data));
      await new Promise((resolve) => setTimeout(resolve, 700));
    } else {
      const response = await fetch(form.action, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.ok) {
        showServerErrors(form, result.errors);
        throw new Error(result.message || '');
      }
    }

    form.dispatchEvent(new CustomEvent('form:success'));
    window.location.assign(form.dataset.successUrl || '/merci/');
  } catch (error) {
    showAlert(form, error.message);
    setBusy(submitButton, false);
  }
}

function setBusy(button, busy) {
  if (!button) return;
  button.disabled = busy;
  button.setAttribute('aria-busy', String(busy));
}

/** Affiche les erreurs renvoyées par le serveur ({ nomDuChamp: message }). */
function showServerErrors(form, errors) {
  if (!errors || typeof errors !== 'object') return;

  const targets = Object.entries(errors)
    .map(([name, message]) => {
      const field = form.elements.namedItem(name);
      const target = field instanceof RadioNodeList ? field[0] : field;
      if (target) showError(target, message);
      return target;
    })
    .filter(Boolean);

  if (targets.length) reportInvalid(form, targets[0]);
}

function showAlert(form, message) {
  const alert = form.querySelector('[data-form-alert]');
  if (!alert) return;

  const text = alert.querySelector('[data-form-alert-text]') || alert;
  text.textContent = message || alert.dataset.defaultMessage || 'Une erreur est survenue.';
  alert.hidden = false;
  alert.focus();
}

function hideAlert(form) {
  const alert = form.querySelector('[data-form-alert]');
  if (alert) alert.hidden = true;
}
