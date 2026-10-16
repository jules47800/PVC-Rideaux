/**
 * Appels aux fonctions de l'espace d'édition (api/admin/*), en JSON.
 * Session expirée ou espace non configuré : retour à la page de connexion.
 */

const LOGIN_PAGE = '/admin/connexion/';

/**
 * @param {string} url
 * @param {{ method?: string, body?: object, redirectOnAuthError?: boolean }} [options]
 * @returns {Promise<object>} réponse JSON si `ok` ; sinon une erreur portant
 *   `message` (texte affichable), `status` et `data` (réponse complète, ex. erreurs par champ).
 */
export async function request(url, { method = 'GET', body, redirectOnAuthError = true } = {}) {
  let response;
  try {
    response = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(body && { 'Content-Type': 'application/json' }) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw Object.assign(new Error('Connexion impossible : vérifiez votre accès à Internet.'), {
      status: 0,
      data: {},
    });
  }

  const data = await response.json().catch(() => ({}));
  if ((response.status === 401 || response.status === 503) && redirectOnAuthError) {
    const back = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.assign(`${LOGIN_PAGE}?retour=${back}`);
    return new Promise(() => {}); // la page change : rien d'autre à faire
  }
  if (!response.ok || data.ok === false) {
    const message = data.message || `Erreur du serveur (${response.status}).`;
    throw Object.assign(new Error(message), { status: response.status, data });
  }
  return data;
}

/** Tous les articles, brouillons compris. */
export const fetchArticles = () => request('/api/admin/articles').then((data) => data.articles);

/** Enregistre un article : { article, commit, goesLive, message }. */
export const saveArticle = (payload) =>
  request('/api/admin/articles', { method: 'POST', body: payload });

export const deleteArticle = (slug) =>
  request(`/api/admin/articles?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' });

/** Envoie une image déjà préparée (image.js) : { url, commit }. */
export async function uploadImage(blob, name) {
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Lecture de l’image impossible.'));
    reader.readAsDataURL(blob);
  });
  return request('/api/admin/upload', { method: 'POST', body: { name, data } });
}
