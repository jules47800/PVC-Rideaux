/**
 * Page de connexion (/admin/connexion/).
 *
 * Si l'espace d'édition n'est pas encore configuré, affiche la mise en service :
 * l'empreinte du mot de passe (PBKDF2-SHA256, même format que lib/admin/auth.js)
 * et la clé de session sont calculées dans le navigateur, puis à copier dans
 * les variables d'environnement Vercel. Le mot de passe n'est envoyé nulle part.
 */
import { request } from './api.js';

const PBKDF2_ITERATIONS = 600_000;
const SECRET_BYTES = 36;

const params = new URLSearchParams(window.location.search);
/** Page demandée avant la connexion (uniquement dans l'espace d'édition). */
const returnTo = /^\/admin\/[\w\-/?=&%.]*$/.test(params.get('retour') ?? '')
  ? params.get('retour')
  : '/admin/';

const base64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

async function passwordHash(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    key,
    256,
  );
  return `pbkdf2_sha256:${PBKDF2_ITERATIONS}:${base64url(salt)}:${base64url(hash)}`;
}

function showLogin() {
  const card = document.querySelector('[data-login]');
  const form = card.querySelector('[data-login-form]');
  const error = card.querySelector('[data-login-error]');
  card.hidden = false;
  card.querySelector('[data-logged-out]').hidden = !params.has('deconnecte');
  form.elements.username.focus();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    error.hidden = true;
    try {
      await request('/api/admin/login', {
        method: 'POST',
        body: { username: form.elements.username.value, password: form.elements.password.value },
        redirectOnAuthError: false,
      });
      window.location.assign(returnTo);
    } catch (failure) {
      error.textContent = failure.message;
      error.hidden = false;
      form.elements.password.value = '';
      form.elements.password.focus();
      button.disabled = false;
    }
  });
}

function showSetup() {
  const card = document.querySelector('[data-setup]');
  const form = card.querySelector('[data-setup-form]');
  card.hidden = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = card.querySelector('[data-setup-submit]');
    button.disabled = true;
    button.textContent = 'Calcul en cours…';

    const hash = await passwordHash(form.elements.password.value);
    const secret = base64url(crypto.getRandomValues(new Uint8Array(SECRET_BYTES)));
    card.querySelector('[data-setup-output]').value =
      `ADMIN_USERS=${form.elements.username.value}:${hash}\nADMIN_SECRET=${secret}`;
    card.querySelector('[data-setup-result]').hidden = false;
    form.reset();
    button.disabled = false;
    button.textContent = 'Générer la configuration';
  });
}

try {
  await request('/api/admin/session', { redirectOnAuthError: false });
  window.location.assign(returnTo); // déjà connecté
} catch (error) {
  if (error.status === 503 && error.data.setup) showSetup();
  else showLogin();
}
