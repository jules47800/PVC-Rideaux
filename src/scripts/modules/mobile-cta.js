/**
 * Barre d'action collante sur mobile (Appeler / Devis) : elle apparaît dès
 * que la première section de la page sort de l'écran, pour ne pas masquer
 * le haut de page ni doublonner ses propres boutons.
 */
export function initMobileCta() {
  const bar = document.querySelector('[data-mobile-cta]');
  const firstSection = document.querySelector('main > section');
  if (!bar || !firstSection || !('IntersectionObserver' in window)) {
    bar?.setAttribute('data-visible', '');
    return;
  }

  const observer = new IntersectionObserver(([entry]) => {
    bar.toggleAttribute('data-visible', !entry.isIntersecting);
  });
  observer.observe(firstSection);
}
