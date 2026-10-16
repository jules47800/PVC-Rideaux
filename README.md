# IsoRideaux — site vitrine

Refonte du site **pvcrideaux.fr**, qui devient **IsoRideaux** : rideaux à lanières PVC sur mesure.

Le site s'organise désormais autour de **deux espaces distincts**, accessibles dès l'arrivée :

- **Espace professionnels** : entrepôts, industrie, chambres froides, soudure, commerces ;
- **Espace particuliers** : garage, atelier, cuisine d'été, écurie, abri de jardin.

Projet statique construit avec [Vite](https://vite.dev), sans framework, pensé pour un **hébergement mutualisé
classique déployé par FTP** (Apache / LiteSpeed + PHP pour les formulaires).

---

## Sommaire

1. [Démarrage rapide](#démarrage-rapide)
2. [Plan du site](#plan-du-site)
3. [Structure du projet](#structure-du-projet)
4. [Gabarits HTML : partials et variables](#gabarits-html--partials-et-variables)
5. [Modifier le contenu courant](#modifier-le-contenu-courant)
6. [Formulaires (contact & devis)](#formulaires-contact--devis)
7. [Déploiement par FTP](#déploiement-par-ftp)
8. [Redirections depuis l'ancien site](#redirections-depuis-lancien-site)
9. [SEO, performance, accessibilité](#seo-performance-accessibilité)
10. [Design system & animations](#design-system--animations)
11. [Points à valider avec la cliente](#points-à-valider-avec-la-cliente)

---

## Démarrage rapide

**Prérequis** : Node.js 20.19+ (ou 22.12+) et npm. PHP 8.1+ uniquement pour tester les formulaires en local.

```bash
npm install        # installe Vite, Prettier et les polices
npm run dev        # serveur de développement : http://localhost:5173
npm run build      # génère le site final dans dist/
npm run preview    # sert dist/ en local pour vérification
npm run format     # formate JS / CSS / JSON / Markdown (Prettier)
```

En développement, les formulaires **simulent** l'envoi (aucun serveur PHP n'est lancé par Vite) : les données
envoyées s'affichent dans la console du navigateur et l'on est redirigé vers la page « Merci ».

---

## Plan du site

| URL                                             | Page                                                      | Espace       |
| ----------------------------------------------- | --------------------------------------------------------- | ------------ |
| `/`                                             | Accueil + aiguillage Professionnels / Particuliers        | —            |
| `/professionnels/`                              | Hub pro : secteurs, solutions, guide des 8 PVC, FAQ       | Pro          |
| `/professionnels/kit-rideau-lanieres/`          | Kits complets, tableau formats × matières, options        | Pro          |
| `/professionnels/chambre-froide/`               | Chambres froides & stores pour meubles réfrigérés         | Pro          |
| `/professionnels/rideaux-soudure/`              | Rideaux de soudure EN ISO 25980                           | Pro          |
| `/professionnels/lanieres-pvc/`                 | Lanières de remplacement                                  | Pro          |
| `/professionnels/rouleaux-rails-accessoires/`   | Rouleaux 25 / 50 m, rail inox, plaques                    | Pro          |
| `/particuliers/`                                | Usages, guide de mesure illustré, choix du PVC, pose, FAQ | Particuliers |
| `/devis/`                                       | Configurateur de devis (4 étapes + récapitulatif)         | —            |
| `/guide-installation/`                          | Guide de pose avec les 12 schémas d'accrochage            | —            |
| `/a-propos/`, `/contact/`, `/mentions-legales/` | Pages institutionnelles                                   | —            |
| `/merci/`, `/404.html`                          | Pages techniques (non indexées)                           | —            |

**Orientation des visiteurs** : une barre « Professionnels | Particuliers » est présente en haut de **toutes**
les pages (le modèle familier des sites bancaires). L'espace courant y est souligné automatiquement, et
l'accueil propose deux grandes cartes d'entrée. Chaque espace a sa couleur d'accent : bleu marine pour les
professionnels, ambre chaleureux pour les particuliers.

Le configurateur se pré-remplit depuis l'URL : `/devis/?profil=pro&produit=soudure&format=300x2&type=soudure`.
Sur les pages d'un espace, les liens « Devis » ajoutent automatiquement le bon `profil`.

---

## Structure du projet

```
.
├── site.config.js            # ★ Coordonnées, horaires, URL du site, infos légales
├── vite.config.js            # Configuration Vite (multi-pages, plugins)
├── vite-plugins/
│   ├── html-templates.js     # Partials, variables {{ }}, aria-current, typographie FR, Open Graph
│   ├── pages.js              # Découverte automatique des pages
│   └── sitemap.js            # Génère sitemap.xml et robots.txt au build
├── public/                   # Copié tel quel à la racine de dist/
│   ├── .htaccess             # ★ HTTPS, redirections 301, cache, sécurité
│   ├── assets/.htaccess      # Cache long pour les fichiers versionnés par Vite
│   ├── api/
│   │   ├── send.php          # ★ Réception des formulaires et envoi d'e-mail
│   │   ├── config.php        # ★ Destinataire, expéditeur, anti-spam
│   │   └── .htaccess         # Interdit l'accès direct à config.php
│   ├── icons.svg             # Sprite d'icônes (trait 24×24)
│   ├── favicon.ico, icon-*.png, apple-touch-icon.png, site.webmanifest
│   ├── og-image.jpg          # Aperçu lors d'un partage (réseaux sociaux, messageries)
│   └── logo-isorideaux.png   # Logo à URL fixe (données structurées)
└── src/                      # Racine Vite : 1 fichier .html = 1 page
    ├── index.html
    ├── professionnels/…/index.html
    ├── particuliers/index.html
    ├── devis/index.html …
    ├── partials/             # Fragments partagés (en-tête, pied de page, avis…)
    ├── assets/               # Images (WebP optimisés) et logo
    ├── styles/
    │   ├── main.css          # Point d'entrée (ordre des imports)
    │   ├── tokens.css        # ★ Couleurs, typographie, espacements, courbes d'animation
    │   ├── base.css, layout.css, motion.css, fonts.css
    │   └── components/       # buttons, header, footer, hero, cards, sections, faq, forms
    └── scripts/
        ├── main.js           # Chargé sur toutes les pages
        ├── modules/          # header, dropdown, mobile-menu, reveal, carousel, forms, quote-links
        ├── pages/devis.js    # Configurateur (chargé uniquement sur /devis/)
        └── data/catalogue.js # ★ Formats, matières et produits
```

Les fichiers marqués ★ sont ceux que l'on modifie le plus souvent.

---

## Gabarits HTML : partials et variables

Le plugin `vite-plugins/html-templates.js` ajoute un mini système de gabarits, actif en dev comme au build :

| Syntaxe                         | Effet                                                               |
| ------------------------------- | ------------------------------------------------------------------- |
| `<!-- @include header.html -->` | Insère `src/partials/header.html` (inclusions imbriquées possibles) |
| `{{ site.phone }}`              | Valeur issue de `site.config.js` (échappée en HTML)                 |
| `{{ page.url }}`                | URL canonique absolue de la page (`page.path` : chemin relatif)     |

Il se charge aussi, sans intervention :

- d'ajouter `aria-current="page"` sur les liens vers la page courante, et `aria-current="true"` vers sa
  section parente (c'est ce qui allume l'onglet « Professionnels » sur toutes les pages pro) ;
- d'insérer les espaces insécables de la typographie française avant `: ; ? !` et dans les guillemets ;
- de générer `og:title` / `og:description` à partir du `<title>` et de la meta description.

Une variable inconnue fait **échouer le build** : impossible de publier un `{{ … }}` oublié.

**Partials disponibles** : `head`, `header`, `footer`, `reassurance`, `steps`, `reviews`, `logos`,
`cta-devis`, `cta-particulier`.

### Ajouter une page

1. Créer `src/ma-page/index.html` (copier une page existante, par exemple `a-propos/index.html`).
2. Renseigner `<title>`, la meta description et, si la page appartient à un espace, `<body data-space="pro">`
   ou `<body data-space="particulier">`.
3. Ajouter le lien dans `src/partials/header.html` et/ou `footer.html`.

C'est tout : la page est détectée automatiquement par Vite, ajoutée au `sitemap.xml` et servie à l'URL
`/ma-page/`.

---

## Modifier le contenu courant

| Je veux changer…                        | Où                                                                     |
| --------------------------------------- | ---------------------------------------------------------------------- |
| Téléphone, e-mail, horaires, adresse    | `site.config.js` (mis à jour sur tout le site au prochain build)       |
| Domaine définitif du site               | `site.config.js` → `url`                                               |
| Destinataire des formulaires            | `public/api/config.php` → `recipient` (modifiable directement par FTP) |
| Couleurs, typographie, arrondis         | `src/styles/tokens.css`                                                |
| Avis clients                            | `src/partials/reviews.html`                                            |
| Références clients (défilement de noms) | `src/partials/logos.html`                                              |
| Gamme (formats / matières disponibles)  | voir ci-dessous                                                        |

### Gamme de produits

La disponibilité des matières par format est définie à trois endroits, à garder alignés :

1. `src/scripts/data/catalogue.js` — utilisé par le configurateur ;
2. le tableau de `src/professionnels/kit-rideau-lanieres/index.html` (et les pastilles des cartes PVC) ;
3. les libellés de `public/api/send.php` (`OPTION_LABELS`), qui valident les valeurs reçues.

### Images

Les photos sont en **WebP** dans `src/assets/` (Vite ajoute une empreinte au nom de fichier pour le cache).
Pour en ajouter une : l'exporter en WebP (qualité ~78, 1600 px de large pour une photo pleine largeur + une
version 800 px), puis l'utiliser avec `srcset` comme dans les pages existantes. Toujours renseigner `width`,
`height` (évite les sauts de mise en page) et un `alt` descriptif (vide si purement décorative).

---

## Formulaires (contact & devis)

```
navigateur ──(fetch, JSON)──▶ /api/send.php ──mail()──▶ contact@…
            ◀── { ok: true } ── redirection JS vers /merci/
```

- **Amélioration progressive** : sans JavaScript, le formulaire est posté normalement et le PHP redirige vers
  `/merci/` (ou affiche une page d'erreur listant les champs à corriger).
- **Validation** côté navigateur (messages en français, accessibles) **et** côté serveur (liste blanche des
  champs et des valeurs, bornes numériques, e-mail, code postal).
- **Anti-spam sans captcha** : champ piège invisible, délai minimal de remplissage (3 s), limitation à un
  envoi toutes les 30 s par adresse IP.
- **Sécurité** : en-têtes d'e-mail non injectables, `config.php` inaccessible depuis le web.
- Le configurateur n'envoie que les champs utiles au produit choisi (le serveur refait ce tri).

### Tester les formulaires en local

```bash
npm run build
php -d sendmail_path="tee -a /tmp/mails.log > /dev/null" -S 127.0.0.1:8080 -t dist
# → http://127.0.0.1:8080/devis/ ; les e-mails « envoyés » s'ajoutent dans /tmp/mails.log
```

### Délivrabilité

L'adresse `sender` de `config.php` doit appartenir au **domaine qui héberge le site** (par exemple
`no-reply@isorideaux.fr`) et ce domaine doit avoir un enregistrement SPF valide, sinon les e-mails risquent de
finir en spam. En cas de souci persistant, `send.php` peut être adapté pour passer par un SMTP authentifié
(PHPMailer) : seule la fonction `sendMail()` est à remplacer.

---

## Déploiement par FTP

1. **Construire** le site :
   ```bash
   npm run build
   ```
2. **Vérifier** si besoin avec `npm run preview`.
3. **Envoyer le contenu** du dossier `dist/` (et non le dossier lui-même) à la racine web de l'hébergement
   (souvent `public_html/` ou `www/`), avec FileZilla ou équivalent.
   - Activer l'affichage des fichiers cachés (FileZilla : _Serveur → Forcer l'affichage des fichiers cachés_)
     pour que `.htaccess`, `assets/.htaccess` et `api/.htaccess` soient bien envoyés.
   - Lors de la mise en ligne de la refonte, supprimer d'abord l'ancien WordPress (après sauvegarde !).
4. **Vérifier sur l'hébergement** : PHP 8.1 ou plus, certificat SSL actif, puis envoyer un message de test
   depuis `/contact/` et une demande depuis `/devis/`.
5. **Mises à jour suivantes** : relancer `npm run build` puis renvoyer `dist/`. Les fichiers de `dist/assets/`
   portent une empreinte : on peut supprimer les anciens sur le serveur sans risque.

> `public/api/config.php` est une simple configuration : pour changer le destinataire des e-mails, on peut le
> modifier directement sur le serveur, sans rebuild.

**Après la mise en ligne** : déclarer `https://<domaine>/sitemap.xml` dans Google Search Console, et mettre à
jour l'adresse du site sur la fiche Google Business Profile.

---

## Redirections depuis l'ancien site

`public/.htaccess` redirige (301) les anciennes adresses WordPress vers les nouvelles, pour conserver le
référencement et les liens existants :

| Ancienne URL                     | Nouvelle URL                                  |
| -------------------------------- | --------------------------------------------- |
| `/pvc-rideaux/`                  | `/a-propos/`                                  |
| `/rideau-laniere-pvc/`           | `/professionnels/kit-rideau-lanieres/`        |
| `/laniere-pvc/`                  | `/professionnels/lanieres-pvc/`               |
| `/rouleau-pvc-transparent/`      | `/professionnels/rouleaux-rails-accessoires/` |
| `/rideaux-de-soudure/`           | `/professionnels/rideaux-soudure/`            |
| `/rideau-chambre-froide/`        | `/professionnels/chambre-froide/`             |
| `/guide-dinstallation/`          | `/guide-installation/`                        |
| `/legal/`                        | `/mentions-legales/`                          |
| `/actualites/` et les 6 articles | page la plus proche (voir `.htaccess`)        |
| `/product/…`, panier, boutique   | rouleaux / devis                              |

Si le nom de domaine change (`pvcrideaux.fr` → `isorideaux.fr`), décommenter le bloc « Ancien domaine →
nouveau domaine » du `.htaccess` une fois les deux domaines pointés vers le même hébergement, puis mettre à
jour `url` dans `site.config.js`.

---

## SEO, performance, accessibilité

- **SEO** : une balise `<title>` et une meta description par page, URL canonique automatique, `sitemap.xml`
  et `robots.txt` générés au build, fil d'Ariane balisé schema.org, données structurées `LocalBusiness` sur
  l'accueil, balises Open Graph pour les partages.
- **Performance** : HTML statique, ~3 Ko de JS compressé sur les pages courantes, images WebP avec `srcset`
  et chargement différé, polices auto-hébergées limitées au sous-ensemble latin, cache long sur les fichiers
  versionnés, compression gzip.
- **RGPD** : aucun cookie, aucun service tiers chargé (pas de Google Fonts ni de carte intégrée) : aucun
  bandeau de consentement n'est nécessaire.
- **Accessibilité** : navigation complète au clavier, lien d'évitement, menu mobile en `<dialog>` natif
  (piège à focus, touche Échap), FAQ en `<details>` natifs, contrastes AA, messages d'erreur reliés aux
  champs, préférences « mouvement réduit » respectées.
- **En-têtes de sécurité** (`.htaccess`) : CSP stricte (`'self'` uniquement), `X-Content-Type-Options`,
  `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`. Si un outil tiers est ajouté plus tard
  (statistiques, chat…), son domaine devra être autorisé dans la `Content-Security-Policy`.

---

## Design system & animations

- **Couleurs** relevées sur le nouveau logo : marine `#003C8A` et bleu `#035AAE`, complétés d'un ambre réservé
  à l'espace particuliers. Toutes les valeurs sont des variables CSS dans `tokens.css`.
- **Typographies** : Montserrat (titres, proche du logo) et Inter (texte).
- **Motif de marque** : des « lanières » translucides (rappel du logo) décorent les cartes d'entrée, les heroes
  et les bandeaux. Au survol des cartes de l'accueil, elles s'écartent comme au passage d'une personne.

Les animations suivent des règles strictes (philosophie « design engineering » d'Emil Kowalski) :

- courbes personnalisées (`--ease-out`, `--ease-drawer`), jamais d'`ease-in` sur l'interface ;
- transitions limitées à `transform` / `opacity` (jamais `transition: all`), durées < 300 ms pour l'UI ;
- retour tactile `scale(0.97)` sur tous les boutons ;
- menu déroulant qui s'ouvre depuis son déclencheur, sans animation lorsqu'il est ouvert au clavier ;
- fermetures plus rapides que les ouvertures ;
- effets de survol réservés aux appareils à souris (`@media (hover: hover) and (pointer: fine)`) ;
- apparitions en cascade courtes (60 ms) et uniquement sous la ligne de flottaison ;
- `prefers-reduced-motion` : déplacements supprimés, fondus conservés.

---

## Points à valider avec la cliente

Contenus repris du site actuel ou à confirmer avant la mise en ligne :

- [ ] **Nom de domaine définitif** (`isorideaux.fr` ?) → `site.config.js` (`url`) et `config.php` (`sender`).
- [ ] **Adresse e-mail** de contact (actuellement `contact@pvcrideaux.fr`).
- [ ] **Mentions légales** : forme juridique, immatriculation (RCS / RM), n° de TVA intracommunautaire,
      directrice de la publication, hébergeur définitif (commentaire `TODO` dans la page).
- [ ] **Ancienneté** : l'ancien site indiquait à la fois « plus de 15 ans » et « plus de 20 ans » ; le nouveau
      site retient « plus de 15 ans ».
- [ ] **Références clients** (Coca-Cola, Aldi, Amazon, DHL…) : confirmer qu'elles peuvent être citées.
- [ ] **Avis clients** : repris mot pour mot de l'ancien site ; idéalement, les remplacer par des avis Google.
- [ ] **Tarif du rail** (22 € HT la section) : toujours d'actualité ?
- [ ] **Photos pour l'espace particuliers** (garage, atelier, cuisine d'été…) : seules des photos
      professionnelles et celle de l'écurie sont disponibles pour l'instant.
- [ ] **Logo vectoriel (SVG)** : le logo fourni est une image ; une version SVG serait plus nette.
- [ ] **Articles d'actualité** : les 6 articles de l'ancien site sont redirigés ; les migrer si souhaité.
- [ ] **CGV** : lien vers le document Google existant, à remplacer idéalement par une page dédiée.
- [ ] **Devis instantané / paiement en ligne** : l'ancien site calculait un prix et encaissait via PayPal.
      Le nouveau configurateur envoie une demande de devis ; un chiffrage automatique pourra être ajouté dès
      qu'une grille tarifaire sera fournie.

---

_Photos produits reprises du site pvcrideaux.fr (propriété de la cliente). Polices Inter et Montserrat sous
licence SIL Open Font License._
