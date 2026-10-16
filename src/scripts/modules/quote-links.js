/**
 * Transmet le contexte de la page au configurateur de devis pour le
 * pré-remplir (et sauter les questions déjà connues) :
 *   - `<body data-space="pro|particulier">`  → paramètre `profil` ;
 *   - `<body data-product="kit|soudure|…">` → paramètre `produit`.
 * Il est ajouté aux liens vers /devis/ et, en champ caché, aux mini-formulaires
 * d'estimation (action="/devis/"), sauf s'ils le précisent déjà.
 */
export function contextualizeQuoteLinks() {
  const context = Object.entries({
    profil: document.body.dataset.space,
    produit: document.body.dataset.product,
  }).filter(([, value]) => value);
  if (!context.length) return;

  document.querySelectorAll('a[href^="/devis/"]').forEach((link) => {
    const url = new URL(link.getAttribute('href'), window.location.origin);
    context.forEach(([name, value]) => {
      if (!url.searchParams.has(name)) url.searchParams.set(name, value);
    });
    link.setAttribute('href', `${url.pathname}${url.search}${url.hash}`);
  });

  document.querySelectorAll('form[action="/devis/"]').forEach((form) => {
    context.forEach(([name, value]) => {
      if (form.elements.namedItem(name)) return;
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.append(input);
    });
  });
}
