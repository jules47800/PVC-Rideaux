/**
 * Sur les pages d'un espace (`<body data-space="pro|particulier">`), ajoute le
 * profil aux liens vers le configurateur de devis pour le pré-remplir.
 */
export function contextualizeQuoteLinks() {
  const space = document.body.dataset.space;
  if (!space) return;

  document.querySelectorAll('a[href^="/devis/"]').forEach((link) => {
    const url = new URL(link.getAttribute('href'), window.location.origin);
    if (url.searchParams.has('profil')) return;

    url.searchParams.set('profil', space);
    link.setAttribute('href', `${url.pathname}${url.search}${url.hash}`);
  });
}
