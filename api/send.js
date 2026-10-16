/**
 * Réception des formulaires (contact & devis) et envoi par e-mail — fonction Vercel.
 *
 *   POST /api/send   (multipart/form-data ou application/x-www-form-urlencoded)
 *
 * - Répond en JSON si la requête le demande (envoi via fetch), sinon redirige
 *   vers la page de remerciement (envoi classique, sans JavaScript).
 * - Protections : champ piège, délai minimal de remplissage, limitation par IP,
 *   liste blanche des champs et des valeurs (lib/forms.js).
 */
import {
  FIELD_LABELS,
  FORM_TYPES,
  collectFields,
  composeEmail,
  looksLikeSpam,
  validate,
} from '../lib/forms.js';
import { clientIp, createRateLimiter, json, redirect } from '../lib/http.js';
import { sendMail } from '../lib/mailer.js';
import { escapeHtml } from '../lib/blog/model.js';
import site from '../site.config.js';

const SUCCESS_URL = '/merci/';
/** Un humain met plus de quelques secondes à remplir un formulaire. */
const MIN_FILL_SECONDS = 3;
/** Un envoi toutes les 30 secondes par adresse IP (par instance de fonction). */
const rateLimiter = createRateLimiter({ windowMs: 30_000, max: 1 });

/**
 * Termine la requête : JSON pour les envois via fetch, sinon redirection
 * (succès) ou page d'erreur minimale (échec).
 */
function respond(request, { status = 200, ok, message, errors, formType = '' }) {
  if (request.headers.get('accept')?.includes('application/json')) {
    return json({ ok, ...(message && { message }), ...(errors && { errors }) }, status);
  }

  if (ok) return redirect(`${SUCCESS_URL}${formType ? `?demande=${formType}` : ''}`);

  const back = formType === 'devis' ? '/devis/' : '/contact/';
  const details = errors
    ? `<ul>${Object.entries(errors)
        .map(
          ([field, error]) =>
            `<li>${escapeHtml(FIELD_LABELS[field] ?? field)} : ${escapeHtml(error)}</li>`,
        )
        .join('')}</ul>`
    : '';
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Demande non envoyée</title></head><body><h1>Votre demande n’a pas pu être envoyée</h1><p>${escapeHtml(message ?? 'Une erreur est survenue.')}</p>${details}<p><a href="${back}">Revenir au formulaire</a></p></body></html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function POST(request) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return respond(request, { status: 400, ok: false, message: 'Formulaire illisible.' });
  }

  const formType = String(formData.get('form_type') ?? '');
  if (!FORM_TYPES.includes(formType)) {
    return respond(request, { status: 400, ok: false, message: 'Formulaire inconnu.' });
  }

  // Robot probable : on simule un succès pour ne pas l'aider à s'adapter.
  if (looksLikeSpam(formData, MIN_FILL_SECONDS)) return respond(request, { ok: true, formType });

  if (rateLimiter.limited(clientIp(request))) {
    return respond(request, {
      status: 429,
      ok: false,
      message: 'Merci de patienter quelques secondes avant un nouvel envoi.',
      formType,
    });
  }

  const data = collectFields(formData, formType);
  const errors = validate(data, formType);
  if (Object.keys(errors).length) {
    rateLimiter.reset(clientIp(request));
    return respond(request, {
      status: 422,
      ok: false,
      message: 'Certains champs sont à corriger.',
      errors,
      formType,
    });
  }

  try {
    const { subject, text } = composeEmail(data, formType, site.name);
    await sendMail({ subject, text, replyTo: data.email, fromName: site.name });
  } catch (error) {
    console.error('[formulaire] Envoi impossible :', error);
    rateLimiter.reset(clientIp(request));
    return respond(request, {
      status: 500,
      ok: false,
      message: 'L’envoi de votre demande a échoué. Merci de réessayer ou de nous appeler.',
      formType,
    });
  }

  return respond(request, { ok: true, formType });
}
