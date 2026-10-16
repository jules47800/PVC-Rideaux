/**
 * Configuration centrale du site IsoRideaux.
 *
 * Toutes les valeurs ci-dessous sont injectées dans les pages HTML au build
 * via la syntaxe `{{ site.cle }}` (voir vite-plugins/html-templates.js).
 * Modifier une coordonnée ici la met à jour sur l'ensemble du site.
 */
export default {
  name: 'IsoRideaux',
  tagline: 'Rideaux à lanières PVC sur mesure',
  // URL publique du site, sans slash final (sert aux balises canonical, au sitemap…).
  url: 'https://www.isorideaux.fr',
  locale: 'fr_FR',

  phone: '05 54 54 52 21',
  phoneHref: '+33554545221',
  email: 'contact@pvcrideaux.fr',
  hours: 'Lun – Ven · 9h – 17h',
  hoursLong: 'Du lundi au vendredi, de 9h à 17h',
  responseTime: '24 h',

  address: {
    street: '1128 Route Gallo-Romaine',
    postalCode: '47800',
    city: 'Moustier',
    region: 'Nouvelle-Aquitaine',
    country: 'FR',
  },
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=1128+Route+Gallo-Romaine+47800+Moustier',
  reviewUrl: 'https://g.page/r/CVnukwLrue-VEBM/review',

  legal: {
    owner: 'Emmanuelle Parker',
    siret: '978 419 745 00028',
    host: 'UAB Hostinger',
    hostAddress: 'Švitrigailos str. 34, 03230 Vilnius, Lituanie',
    cgvUrl: 'https://docs.google.com/document/d/1gSpX-6DKtoyRBaYcj4TylSd78EujONXP/edit?usp=sharing',
  },

  year: new Date().getFullYear(),
};
