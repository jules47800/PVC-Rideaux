/**
 * Appels au serveur de l'espace d'édition (réponses JSON).
 * Le jeton CSRF est lu dans <meta name="csrf-token"> et envoyé en en-tête.
 */

const csrfToken = () => document.querySelector('meta[name="csrf-token"]')?.content ?? '';

/**
 * @param {string} url
 * @param {{ method?: string, body?: FormData }} [options]
 * @returns {Promise<object>} réponse JSON si `ok` ; sinon une erreur portant
 *   `message` (texte affichable) et `data` (réponse complète, ex. erreurs par champ).
 */
export async function request(url, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(url, {
      method,
      body,
      headers: { Accept: 'application/json', 'X-CSRF-Token': csrfToken() },
      credentials: 'same-origin',
    });
  } catch {
    throw Object.assign(new Error('Connexion impossible : vérifiez votre accès à Internet.'), {
      data: {},
    });
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    const message = data.message || `Erreur du serveur (${response.status}).`;
    throw Object.assign(new Error(message), { data, status: response.status });
  }
  return data;
}

/** Tous les articles (pour la vérification SEO et les suggestions de liens). */
export const fetchArticles = () =>
  request('/admin/api.php?action=articles').then((data) => data.articles);

export function uploadImage(file) {
  const body = new FormData();
  body.append('image', file);
  return request('/admin/api.php?action=upload', { method: 'POST', body });
}

export function renderPreview(content) {
  const body = new FormData();
  body.append('content', content);
  return request('/admin/api.php?action=preview', { method: 'POST', body }).then(
    (data) => data.html,
  );
}
