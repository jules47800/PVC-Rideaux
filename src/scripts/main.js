/**
 * Point d'entrée commun à toutes les pages.
 * Chaque module est autonome et ne fait rien si ses éléments sont absents.
 */
import '../styles/main.css';

import { initCarousels } from './modules/carousel.js';
import { initDropdowns } from './modules/dropdown.js';
import { initForms } from './modules/forms.js';
import { initHeader } from './modules/header.js';
import { initMobileMenu } from './modules/mobile-menu.js';
import { contextualizeQuoteLinks } from './modules/quote-links.js';
import { initReveal } from './modules/reveal.js';

// Active les styles dépendant du JS (apparitions au défilement, etc.).
document.documentElement.classList.add('js');

initHeader();
initDropdowns();
initMobileMenu();
initReveal();
initCarousels();
initForms();
contextualizeQuoteLinks();
