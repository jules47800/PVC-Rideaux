/**
 * Menus déroulants de la navigation principale (motif « disclosure »).
 *
 * Structure attendue :
 *   <li data-dropdown>
 *     <button aria-expanded="false" aria-controls="menu-x">…</button>
 *     <div class="dropdown" id="menu-x">…</div>
 *   </li>
 *
 * - Clic / Entrée / Espace : ouvre ou ferme.
 * - Survol à la souris : ouvre, avec un léger délai de fermeture.
 * - Échap, clic extérieur ou perte du focus : ferme.
 * - Ouverture au clavier : sans animation (data-instant), pour rester réactif.
 */
const HOVER_CAPABLE = window.matchMedia('(hover: hover) and (pointer: fine)');
const CLOSE_DELAY_MS = 120;

export function initDropdowns() {
  document.querySelectorAll('[data-dropdown]').forEach(setupDropdown);
}

function setupDropdown(item) {
  const trigger = item.querySelector('[aria-controls]');
  const panel = trigger && document.getElementById(trigger.getAttribute('aria-controls'));
  if (!panel) return;

  let closeTimer;
  let openedByHover = false;

  const isOpen = () => trigger.getAttribute('aria-expanded') === 'true';

  const open = ({ instant = false } = {}) => {
    clearTimeout(closeTimer);
    panel.toggleAttribute('data-instant', instant);
    trigger.setAttribute('aria-expanded', 'true');
    panel.setAttribute('data-open', '');
  };

  const close = () => {
    clearTimeout(closeTimer);
    openedByHover = false;
    trigger.setAttribute('aria-expanded', 'false');
    panel.removeAttribute('data-open');
  };

  trigger.addEventListener('click', (event) => {
    // event.detail === 0 : « clic » déclenché au clavier
    const fromKeyboard = event.detail === 0;

    if (isOpen() && !openedByHover) {
      close();
    } else {
      open({ instant: fromKeyboard });
      openedByHover = false;
    }
  });

  item.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse' || !HOVER_CAPABLE.matches) return;
    if (!isOpen()) openedByHover = true;
    open();
  });

  item.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'mouse' || !HOVER_CAPABLE.matches || !openedByHover) return;
    closeTimer = setTimeout(close, CLOSE_DELAY_MS);
  });

  item.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !isOpen()) return;
    close();
    trigger.focus();
  });

  item.addEventListener('focusout', (event) => {
    if (!item.contains(event.relatedTarget)) close();
  });

  document.addEventListener('click', (event) => {
    if (isOpen() && !item.contains(event.target)) close();
  });
}
