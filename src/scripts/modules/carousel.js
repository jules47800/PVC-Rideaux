/**
 * Carrousel léger basé sur le défilement natif (scroll-snap).
 * Le JS ne fait qu'ajouter les boutons précédent / suivant : sans lui, la
 * liste reste défilable au doigt, au trackpad ou au clavier.
 *
 *   <div data-carousel>
 *     <div data-carousel-controls hidden>
 *       <button data-carousel-prev>…</button><button data-carousel-next>…</button>
 *     </div>
 *     <ul data-carousel-track>…</ul>
 *   </div>
 */
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

export function initCarousels() {
  document.querySelectorAll('[data-carousel]').forEach(setupCarousel);
}

function setupCarousel(root) {
  const track = root.querySelector('[data-carousel-track]');
  const prev = root.querySelector('[data-carousel-prev]');
  const next = root.querySelector('[data-carousel-next]');
  if (!track || !prev || !next) return;

  root.querySelector('[data-carousel-controls]')?.removeAttribute('hidden');

  const step = () => {
    const first = track.firstElementChild;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return first ? first.getBoundingClientRect().width + gap : track.clientWidth;
  };

  const scrollByStep = (direction) => {
    track.scrollBy({
      left: direction * step(),
      behavior: REDUCED_MOTION.matches ? 'auto' : 'smooth',
    });
  };

  const updateButtons = () => {
    const maxScroll = track.scrollWidth - track.clientWidth - 2;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= maxScroll;
  };

  prev.addEventListener('click', () => scrollByStep(-1));
  next.addEventListener('click', () => scrollByStep(1));
  track.addEventListener('scroll', () => requestAnimationFrame(updateButtons), { passive: true });
  window.addEventListener('resize', updateButtons);
  updateButtons();
}
