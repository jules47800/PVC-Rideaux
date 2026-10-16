/**
 * Apparition des blocs au défilement (une seule fois par élément).
 *
 * - `data-reveal` sur un élément : il apparaît en fondu à l'entrée dans l'écran.
 * - `data-reveal-group` sur un parent : ses enfants [data-reveal] apparaissent
 *   en cascade (60 ms d'écart, plafonné pour ne jamais faire attendre).
 *
 * À réserver aux sections sous la ligne de flottaison : le haut de page doit
 * s'afficher immédiatement.
 */
const MAX_STAGGER_STEPS = 5;

export function initReveal() {
  const items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('is-revealed'));
    return;
  }

  document.querySelectorAll('[data-reveal-group]').forEach((group) => {
    group.querySelectorAll(':scope > [data-reveal]').forEach((item, index) => {
      item.style.setProperty('--reveal-index', String(Math.min(index, MAX_STAGGER_STEPS)));
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0 },
  );

  items.forEach((item) => observer.observe(item));
}
