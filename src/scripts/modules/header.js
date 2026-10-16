/**
 * En-tête collant : ajoute `data-scrolled` dès que la page défile,
 * pour afficher la bordure et l'ombre (cf. header.css).
 */
export function initHeader() {
  const header = document.querySelector('[data-header]');
  if (!header) return;

  let ticking = false;

  const update = () => {
    header.toggleAttribute('data-scrolled', window.scrollY > 8);
    ticking = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );

  update();
}
