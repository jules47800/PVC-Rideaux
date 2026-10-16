/**
 * Menu mobile : tiroir latéral basé sur <dialog> (piège à focus, touche Échap
 * et fond assombri fournis nativement par le navigateur).
 */
const DESKTOP_QUERY = window.matchMedia('(min-width: 64rem)');

export function initMobileMenu() {
  const dialog = document.getElementById('menu-mobile');
  const openButton = document.querySelector('[data-menu-open]');
  if (!dialog || !openButton || typeof dialog.showModal !== 'function') return;

  openButton.addEventListener('click', () => dialog.showModal());

  dialog.querySelectorAll('[data-menu-close]').forEach((button) => {
    button.addEventListener('click', () => dialog.close());
  });

  // Un clic sur le fond (en dehors du panneau) ferme le menu.
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (!inside) dialog.close();
  });

  // Les ancres de la page courante doivent refermer le menu.
  dialog.querySelectorAll('a[href*="#"]').forEach((link) => {
    link.addEventListener('click', () => dialog.close());
  });

  DESKTOP_QUERY.addEventListener('change', (event) => {
    if (event.matches && dialog.open) dialog.close();
  });
}
