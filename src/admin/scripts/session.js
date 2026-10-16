/**
 * Session de l'espace d'édition : vérifie la connexion avant d'afficher une
 * page, affiche la navigation et gère la déconnexion.
 */
import { request } from './api.js';

/** @returns {Promise<{ user: string, storage: 'github' | 'local' }>} */
export async function requireSession() {
  const session = await request('/api/admin/session');

  document.querySelector('[data-admin-nav]').hidden = false;
  document.querySelector('[data-admin-user]').hidden = false;
  document.querySelector('[data-admin-user-name]').textContent = `(${session.user})`;
  document.querySelector('[data-logout]').addEventListener('click', async () => {
    await request('/api/admin/logout', { method: 'POST', redirectOnAuthError: false }).catch(
      () => {},
    );
    window.location.assign('/admin/connexion/?deconnecte=1');
  });

  return session;
}

/** Message affiché sur la page suivante (après une redirection). */
export function setFlash(type, message) {
  try {
    sessionStorage.setItem('admin-flash', JSON.stringify({ type, message }));
  } catch {
    // Stockage indisponible (navigation privée stricte) : le message est simplement perdu.
  }
}

export function showFlash(element) {
  try {
    const flash = JSON.parse(sessionStorage.getItem('admin-flash') ?? 'null');
    sessionStorage.removeItem('admin-flash');
    if (!flash) return;
    element.className = `notice notice--${flash.type}`;
    element.textContent = flash.message;
    element.hidden = false;
  } catch {
    // Rien à afficher.
  }
}
