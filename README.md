# IsoRideaux — site vitrine

Refonte du site **pvcrideaux.fr**, qui devient **IsoRideaux** : rideaux à lanières PVC sur mesure.

Le site s'organise désormais autour de **deux espaces distincts**, accessibles dès l'arrivée :

- **Espace professionnels** : entrepôts, industrie, chambres froides, soudure, commerces ;
- **Espace particuliers** : garage, atelier, cuisine d'été, écurie, abri de jardin.

Projet statique construit avec [Vite](https://vite.dev), sans framework, pensé pour un **hébergement mutualisé
classique déployé par FTP** (Apache / LiteSpeed + PHP pour les formulaires, le blog et son espace d'édition).

Il comprend aussi un **blog** que la cliente alimente elle-même depuis un **espace d'édition** simple
(`/admin/`), avec une **vérification SEO** qui note chaque article et liste les actions à mener.
La stratégie de référencement est détaillée dans [`docs/recommandations-seo.md`](docs/recommandations-seo.md).

---

## Sommaire

1. [Démarrage rapide](#démarrage-rapide)
2. [Choix techniques](#choix-techniques)
3. [Plan du site](#plan-du-site)
4. [Structure du projet](#structure-du-projet)
5. [Gabarits HTML : partials et variables](#gabarits-html--partials-et-variables)
6. [Modifier le contenu courant](#modifier-le-contenu-courant)
7. [Configurateur de devis](#configurateur-de-devis)
8. [Conversion](#conversion)
9. [Formulaires (contact & devis)](#formulaires-contact--devis)
10. [Blog](#blog)
11. [Espace d'édition](#espace-dédition)
12. [Déploiement par FTP](#déploiement-par-ftp)
13. [Redirections depuis l'ancien site](#redirections-depuis-lancien-site)
14. [SEO, performance, accessibilité](#seo-performance-accessibilité)
15. [Design system & animations](#design-system--animations)
16. [Points à valider avec la cliente](#points-à-valider-avec-la-cliente)

---

## Démarrage rapide

**Prérequis** : Node.js 20.19+ (ou 22.12+) et npm. PHP 8.1+ (extensions `mbstring` et `gd`) pour tester en
local le blog, l'espace d'édition et les formulaires.

```bash
npm install        # installe Vite, Prettier et les polices
npm run dev        # serveur de développement : http://localhost:5173
npm run build      # génère le site final dans dist/
npm run preview    # sert dist/ en local pour vérification (sans PHP)
npm run serve:php  # sert dist/ avec PHP : blog, espace d'édition, formulaires → http://localhost:8000
npm run seo        # audit SEO des pages générées (après un build)
npm run format     # formate JS / CSS / JSON / Markdown (Prettier)
```

En développement, les formulaires **simulent** l'envoi : les données envoyées s'affichent dans la console du
navigateur et l'on est redirigé vers la page « Merci ». Les adresses gérées par PHP (`/blog/`, `/admin/`,
`/api/`, `/uploads/`) sont transmises par Vite à `npm run serve:php` s'il tourne (après un `npm run build`).

---

## Choix techniques

**Le site n'est pas une application JavaScript.** Chaque page est un vrai fichier HTML, généré au build et
lisible tel quel par Google comme par un navigateur sans JavaScript. Vite n'est qu'un **outil de construction** :
il assemble les fragments communs (en-tête, pied de page…), optimise les images et les styles, puis produit un
dossier `dist/` de fichiers statiques à envoyer par FTP. Côté serveur, seuls tournent de petits scripts PHP :
les formulaires, le blog et son espace d'édition.

| Décision                                         | Pourquoi                                                                                                                                                                                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Site statique multi-pages (plutôt que WordPress) | Hébergement FTP simple et bon marché, pages très rapides, aucune base de données ni extension à mettre à jour, surface d'attaque minimale.                                                                                           |
| Pas de framework (React, Vue…)                   | Un site vitrine a peu d'interactions : un framework ajouterait 40 à 100 Ko de JS et imposerait un rendu serveur pour le référencement. Ici, le HTML porte le contenu, et le JS ne fait qu'**améliorer** l'expérience.                |
| JavaScript « vanilla », en petits modules        | ~3,5 Ko compressés sur les pages courantes (menus, apparitions, carrousel, validation des formulaires). Le configurateur (~6 Ko) n'est chargé que sur `/devis/`.                                                                     |
| Amélioration progressive                         | Sans JS, tout reste lisible et les formulaires fonctionnent (envoi classique, redirection PHP). Avec JS, on ajoute le confort : envoi sans rechargement, parcours pas à pas, aperçu en direct.                                       |
| Vite                                             | Serveur de développement avec rechargement instantané, gabarits (partials), minification, noms de fichiers versionnés pour le cache, sitemap automatique.                                                                            |
| PHP pour les formulaires                         | Disponible sur tous les hébergements mutualisés ; pas besoin de serveur Node ni de service tiers payant.                                                                                                                             |
| Blog en PHP, articles en fichiers JSON           | La cliente publie seule, sans rebuild ni FTP. Pas de base de données : un article = un fichier, facile à sauvegarder et à restaurer. Le blog reprend le gabarit généré par Vite (en-tête, styles) : une seule source pour le design. |
| Espace d'édition sur mesure (plutôt qu'un CMS)   | Exactement les champs utiles (et la vérification SEO), rien à mettre à jour, aucune extension vulnérable, même hébergement.                                                                                                          |

**Contrepartie** : les pages vitrines (accueil, produits…) restent modifiées dans le HTML puis `npm run build` ;
seul le blog est éditable en ligne. C'est volontaire : ces pages changent rarement et leur mise en page est
travaillée finement.

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
| `/devis/`                                       | Configurateur pas à pas, une question par écran           | —            |
| `/guide-installation/`                          | Guide de pose avec les 12 schémas d'accrochage            | —            |
| `/a-propos/`, `/contact/`, `/mentions-legales/` | Pages institutionnelles                                   | —            |
| `/blog/`, `/blog/<article>/`                    | Blog (rendu par PHP), filtres par catégorie, flux RSS     | —            |
| `/admin/`                                       | Espace d'édition du blog (protégé, non indexé)            | —            |
| `/merci/`, `/404.html`                          | Pages techniques (non indexées)                           | —            |

**Orientation des visiteurs** : une barre « Professionnels | Particuliers » est présente en haut de **toutes**
les pages (le modèle familier des sites bancaires). L'espace courant y est souligné automatiquement, et
l'accueil propose deux grandes cartes d'entrée. Chaque espace a sa couleur d'accent : bleu marine pour les
professionnels, ambre chaleureux pour les particuliers.

Sur les pages d'un espace (`<body data-space="…">`) ou d'un produit (`<body data-product="…">`), les liens et
mini-formulaires « Devis » transmettent automatiquement le profil et le produit au configurateur, qui saute
alors les questions déjà connues.

---

## Structure du projet

```
.
├── site.config.js            # ★ Coordonnées, horaires, URL du site, infos légales
├── vite.config.js            # Configuration Vite (multi-pages, plugins)
├── vite-plugins/
│   ├── html-templates.js     # Partials, variables {{ }}, aria-current, typographie FR, Open Graph
│   ├── pages.js              # Découverte automatique des pages
│   └── sitemap.js            # Génère sitemap.xml (index), sitemap-pages.xml et robots.txt
├── tools/
│   ├── php-router.php        # Règles .htaccess pour le serveur PHP local (npm run serve:php)
│   └── seo-audit.mjs         # Audit SEO des pages générées (npm run seo)
├── docs/
│   └── recommandations-seo.md  # ★ Audit, plan d'action SEO, check-list des articles
├── public/                   # Copié tel quel à la racine de dist/
│   ├── .htaccess             # ★ HTTPS, redirections 301, adresses du blog, cache, sécurité
│   ├── assets/.htaccess      # Cache long pour les fichiers versionnés par Vite
│   ├── api/
│   │   ├── send.php          # ★ Réception des formulaires et envoi d'e-mail
│   │   ├── config.php        # ★ Destinataire, expéditeur, anti-spam
│   │   └── .htaccess         # Interdit l'accès direct à config.php
│   ├── blog/                 # Pages publiques du blog : liste, article, RSS, sitemap, derniers articles (JSON)
│   │   └── images/           # Couvertures des articles repris de l'ancien site
│   ├── admin/                # Espace d'édition : tableau de bord, éditeur, connexion, API JSON
│   │   ├── assets/           # Styles et scripts (vérification SEO : seo-checker.js)
│   │   └── config.example.php  # Modèle du fichier des comptes (config.php, créé sur le serveur)
│   ├── lib/                  # Code PHP partagé (jamais servi) : articles, Markdown, gabarit, sécurité, images
│   │   ├── ideas.php         # ★ Idées d'articles proposées dans le tableau de bord
│   │   ├── views/            # Gabarits PHP du blog et de l'espace d'édition
│   │   └── vendor/           # Parsedown (Markdown, licence MIT)
│   ├── content-initial/      # Articles livrés avec le site, copiés dans content/ au premier lancement
│   ├── icons.svg             # Sprite d'icônes (trait 24×24)
│   ├── favicon.ico, icon-*.png, apple-touch-icon.png, site.webmanifest
│   ├── og-image.jpg          # Aperçu lors d'un partage (réseaux sociaux, messageries)
│   └── logo-isorideaux.png   # Logo à URL fixe (données structurées)
└── src/                      # Racine Vite : 1 fichier .html = 1 page
    ├── index.html
    ├── professionnels/…/index.html
    ├── particuliers/index.html
    ├── devis/index.html …
    ├── blog/_layout.html     # Gabarit des pages du blog (complété par PHP)
    ├── partials/             # Fragments partagés (en-tête, pied de page, avis…)
    ├── assets/               # Images (WebP optimisés) et logo
    ├── styles/
    │   ├── main.css          # Point d'entrée (ordre des imports)
    │   ├── tokens.css        # ★ Couleurs, typographie, espacements, courbes d'animation
    │   ├── base.css, layout.css, motion.css, fonts.css
    │   └── components/       # buttons, header, footer, hero, cards, sections, faq, forms,
    │                         # funnel (configurateur), conversion (estimation, barre mobile), blog
    └── scripts/
        ├── main.js           # Chargé sur toutes les pages
        ├── modules/          # header, dropdown, mobile-menu, mobile-cta, reveal, carousel,
        │                     # forms, quote-links, curtain-preview (aperçu SVG du rideau),
        │                     # latest-posts (derniers articles du blog)
        ├── pages/devis.js    # Configurateur pas à pas (chargé uniquement sur /devis/)
        └── data/catalogue.js # ★ Formats, matières et produits
```

Les fichiers marqués ★ sont ceux que l'on modifie le plus souvent.

Créés **sur le serveur** par l'espace d'édition (jamais dans le dépôt, jamais écrasés) : `content/` (articles
et corbeille), `uploads/blog/` (images envoyées) et `admin/config.php` (comptes).

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
`latest-posts`, `cta-devis`, `cta-particulier`, `cta-note`, `quick-quote`, `mobile-cta`, et pour le
configurateur `header-focus`, `footer-minimal`, `funnel-nav`.

### Ajouter une page

1. Créer `src/ma-page/index.html` (copier une page existante, par exemple `a-propos/index.html`).
2. Renseigner `<title>`, la meta description et, si la page appartient à un espace, `<body data-space="pro">`
   ou `<body data-space="particulier">`.
3. Ajouter le lien dans `src/partials/header.html` et/ou `footer.html`.

C'est tout : la page est détectée automatiquement par Vite, ajoutée au `sitemap.xml` et servie à l'URL
`/ma-page/`.

---

## Modifier le contenu courant

| Je veux changer…                       | Où                                                                     |
| -------------------------------------- | ---------------------------------------------------------------------- |
| Téléphone, e-mail, horaires, adresse   | `site.config.js` (mis à jour sur tout le site au prochain build)       |
| Domaine définitif du site              | `site.config.js` → `url`                                               |
| Destinataire des formulaires           | `public/api/config.php` → `recipient` (modifiable directement par FTP) |
| Couleurs, typographie, arrondis        | `src/styles/tokens.css`                                                |
| Avis clients                           | `src/partials/reviews.html`                                            |
| Logos « Ils nous font confiance »      | `src/partials/logos.html` (images dans `src/assets/partners/`)         |
| Articles du blog                       | espace d'édition `/admin/` (voir [Espace d'édition](#espace-dédition)) |
| Idées d'articles proposées             | `public/lib/ideas.php`                                                 |
| Gamme (formats / matières disponibles) | voir ci-dessous                                                        |

### Gamme de produits

La disponibilité des formats par matière est définie à trois endroits, à garder alignés :

1. `src/scripts/data/catalogue.js` — utilisé par le configurateur ;
2. le tableau de `src/professionnels/kit-rideau-lanieres/index.html` (et les pastilles des cartes PVC) ;
3. les libellés de `public/api/send.php` (`OPTION_LABELS`), qui valident les valeurs reçues.

### Images

Les photos sont en **WebP** dans `src/assets/` (Vite ajoute une empreinte au nom de fichier pour le cache).
Pour en ajouter une : l'exporter en WebP (qualité ~78, 1600 px de large pour une photo pleine largeur + une
version 800 px), puis l'utiliser avec `srcset` comme dans les pages existantes. Toujours renseigner `width`,
`height` (évite les sauts de mise en page) et un `alt` descriptif (vide si purement décorative).

---

## Configurateur de devis

`/devis/` est un parcours **façon Typeform** : une question par écran, pensé pour donner envie d'aller au bout.

| Étape       | Affichée pour          | Détails                                                                     |
| ----------- | ---------------------- | --------------------------------------------------------------------------- |
| Accueil     | arrivée directe        | promesse (2 minutes, gratuit…), reprise d'une demande en cours              |
| Profil      | tous                   | professionnel / particulier                                                 |
| Besoin      | tous                   | porte, chambre froide, soudure, lanières, rouleaux, rail                    |
| Mesures     | selon le produit       | dimensions + exemples en un clic, lanières, rail…                           |
| Matière     | si plusieurs possibles | vignettes ; seules les matières compatibles avec le produit sont proposées  |
| Format      | si plusieurs possibles | format **conseillé selon la hauteur**, présélectionné                       |
| Rouleaux    | rouleaux               | 25 / 50 m (soudure : 25 m uniquement)                                       |
| Options     | portes, froid, soudure | chevauchement ; bordures rouges (professionnels uniquement)                 |
| Coordonnées | tous                   | récapitulatif avec liens « Modifier » ; société demandée aux pros seulement |

**Mécaniques « gamifiées »** : barre de progression, « Question 3 sur 6 », passage automatique à la question
suivante après un clic, raccourcis clavier (lettres A, B, C… et Entrée), compteurs − / +, aperçu SVG du rideau
qui se dessine en direct (proportions, couleur de la matière, bordures rouges) avec surface et nombre de
sections de rail, léger balancement des lanières quand on change de matière.

**Ce qui réduit l'abandon** :

- en-tête « mode focus » sans menu (seulement le logo, le téléphone et « Quitter ») ;
- les questions déjà connues sont sautées (arrivée depuis une page produit, une estimation, une reprise) ;
- les étapes à réponse unique sont résolues automatiquement (ex. soudure : matière et format) ;
- la configuration (jamais les coordonnées) est mémorisée 30 jours dans le navigateur pour « Reprendre ma
  demande » ;
- après « Modifier » depuis le récapitulatif, « Continuer » ramène directement à la dernière étape ;
- sur mobile, les boutons restent collés en bas de l'écran, à portée de pouce.

**Paramètres d'URL** : `?profil=pro&produit=kit&type=standard&format=200x2&largeur=1200&hauteur=2400`.

Sans JavaScript, toutes les étapes s'affichent l'une sous l'autre et la demande s'envoie normalement.

---

## Conversion

- **Estimation rapide** dans le hero de l'accueil (largeur + hauteur → configurateur pré-rempli), reprise de
  l'ancien calculateur de pvcrideaux.fr ; même principe dans les bandeaux « Un projet ? » de chaque page.
- **Barre d'action collante sur mobile** (« Appeler » / « Devis gratuit en 2 min »), qui apparaît dès que le
  haut de page est dépassé.
- **Réassurance au plus près des boutons** : « Gratuit · Sans engagement · Réponse sous 24 h ».
- **Page « Merci »** qui annonce la suite (étude, devis sous 24 h, fabrication et livraison offerte).
- **Mesure** : chaque demande aboutit sur `/merci/?demande=devis` ou `/merci/?demande=contact`, une URL à
  déclarer comme objectif de conversion si un outil de statistiques est ajouté (penser alors à la CSP).

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

## Blog

Les pages du blog sont rendues **à la volée par PHP**, dans le même habillage que le reste du site :

```
src/blog/_layout.html ──(npm run build)──▶ blog/_layout.html (en-tête, styles, scripts, pied de page)
                                                  │
content/articles/*.json ──▶ blog/index.php, blog/article.php ──▶ page HTML complète
```

- **Adresses** (règles dans `.htaccess`) : `/blog/` (liste, `?categorie=…`, `?page=2`), `/blog/<article>/`,
  `/blog/feed.xml` (RSS), `/sitemap-blog.xml` (référencé par `/sitemap.xml`).
- **Articles** : un fichier JSON par article dans `content/articles/` (titre, expression clé, titre et
  description pour Google, catégorie, couverture, contenu en **Markdown**, état, dates). Au tout premier
  lancement, les 6 articles de l'ancien site (`content-initial/`) y sont copiés.
- **Programmation** : un article « Publié » avec une date future n'apparaît qu'à cette date.
- **Changement d'adresse** : l'ancienne adresse d'un article renommé redirige en 301 vers la nouvelle.
- **Brouillons** : 404 pour le public ; aperçu (non indexé) pour l'équipe connectée.
- **SEO** : titre et description dédiés, canonical, Open Graph (`og:type=article`, image de couverture),
  données structurées `BlogPosting` et `BreadcrumbList`, sommaire automatique (à partir de 3 intertitres),
  articles liés, catégories filtrées en `noindex,follow`.
- **Conversion** : encart devis en fin d'article (avec estimation largeur × hauteur), et encart au fil du texte
  avec le raccourci `[[devis]]`.
- **Derniers articles sur le site** : le bloc « Nos derniers conseils » (`src/partials/latest-posts.html`,
  accueil et espaces) charge `/blog/latest.php`, en privilégiant les articles de l'espace de la page.
- **Sécurité** : Markdown en mode sécurisé (HTML saisi échappé), dossiers `lib/`, `content/` et
  `content-initial/` inaccessibles depuis le web, aucun script exécutable dans `uploads/`.

---

## Espace d'édition

Adresse : **`/admin/`**. Pensé pour une utilisation sans connaissance technique.

### Créer le premier compte

1. Ouvrir `https://<domaine>/admin/` : tant qu'aucun compte n'existe, une page **« Mise en service »**
   demande un identifiant et un mot de passe (12 caractères minimum) et affiche le contenu du fichier à créer.
2. Créer `admin/config.php` sur le serveur avec ce contenu (par FTP), puis recharger la page.
   Modèle : [`public/admin/config.example.php`](public/admin/config.example.php). En ligne de commande,
   l'empreinte d'un mot de passe s'obtient aussi avec :
   ```bash
   php -r "echo password_hash('le mot de passe', PASSWORD_DEFAULT), PHP_EOL;"
   ```
3. Plusieurs comptes : une ligne `'identifiant' => 'empreinte',` par personne.

Le mot de passe n'est jamais stocké, seulement son empreinte (bcrypt). `config.php` est ignoré par Git.

### Fonctionnalités

- **Tableau de bord** : articles en ligne / programmés / brouillons, note SEO de chaque article et note
  moyenne, **actions prioritaires** sur les articles en ligne, **12 idées d'articles** (expression clé et plan
  prêts à remplir), rappel des bons réflexes.
- **Éditeur** : barre d'outils Markdown (intertitres, gras, listes, citation, lien, image, encart devis),
  raccourcis `Ctrl B / I / K`, `Ctrl S` pour enregistrer, onglet **Aperçu** (rendu identique au site), adresse
  générée d'après le titre, **aperçu du résultat Google** avec compteurs de caractères, choix de la catégorie,
  date de publication (programmation), image de couverture.
- **Vérification SEO en direct** (`public/admin/assets/seo-checker.js`) : une note sur 100 et, pour chaque
  point, l'action concrète à mener (expression clé dans le titre, longueur, intertitres, liens internes avec
  **pages suggérées à lier en un clic**, encart devis, images décrites, doublons d'expression entre articles,
  fraîcheur…). Le détail des contrôles est dans [`docs/recommandations-seo.md`](docs/recommandations-seo.md#5-la-vérification-seo-de-lespace-dédition).
- **Images** : envoyées depuis l'éditeur, redressées, réduites à 1 600 px et converties en WebP
  (`uploads/blog/AAAA/MM/`), 8 Mo maximum.
- **Suppression** : l'article part dans `content/corbeille/` ; pour le restaurer, le replacer par FTP dans
  `content/articles/`.

### Sécurité

Session dédiée (cookie `HttpOnly`, `SameSite=Strict`, `Secure` en HTTPS, expiration après 2 h d'inactivité),
jeton CSRF sur toute action, 5 essais de connexion par adresse IP puis blocage 15 minutes, pages
`noindex`, `config.php` inaccessible depuis le web, conflit détecté si un article a été modifié entre-temps
dans un autre onglet. L'interface respecte la même CSP stricte que le site (aucun script ni style en ligne).

### Tester en local

```bash
npm run build
npm run serve:php                       # http://localhost:8000/admin/
```

`tools/php-router.php` reproduit les règles de `.htaccess` (adresses du blog, redirections, dossiers
interdits, CSP). Créer le compte de test dans **`dist/admin/config.php`** (et non dans `public/admin/`, pour
ne jamais l'envoyer sur le serveur). Les articles et images de test sont créés dans `dist/` et effacés au
prochain build.

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
   - **Ne jamais supprimer ni écraser sur le serveur** : `content/` (articles), `uploads/` (images du blog)
     et `admin/config.php` (comptes). Ils n'existent que sur le serveur ; toujours lancer `npm run build`
     juste avant l'envoi (il vide `dist/` de tout fichier de test local).
   - **Sauvegarde** : télécharger régulièrement `content/` et `uploads/` (quelques Mo).
4. **Vérifier sur l'hébergement** : PHP 8.1 ou plus (extensions `mbstring` et `gd`), certificat SSL actif,
   puis envoyer un message de test depuis `/contact/` et une demande depuis `/devis/`, et créer le compte de
   l'espace d'édition (voir plus haut).
5. **Mises à jour suivantes** : relancer `npm run build` puis renvoyer `dist/`. Les fichiers de `dist/assets/`
   portent une empreinte : on peut supprimer les anciens sur le serveur sans risque.

> `public/api/config.php` est une simple configuration : pour changer le destinataire des e-mails, on peut le
> modifier directement sur le serveur, sans rebuild.

**Après la mise en ligne** : suivre la liste « P0 » de [`docs/recommandations-seo.md`](docs/recommandations-seo.md)
(Search Console, outil de changement d'adresse, fiche Google, vérification des redirections).

---

## Redirections depuis l'ancien site

`public/.htaccess` redirige (301) les anciennes adresses WordPress vers les nouvelles, pour conserver le
référencement et les liens existants :

| Ancienne URL                   | Nouvelle URL                                  |
| ------------------------------ | --------------------------------------------- |
| `/pvc-rideaux/`                | `/a-propos/`                                  |
| `/rideau-laniere-pvc/`         | `/professionnels/kit-rideau-lanieres/`        |
| `/laniere-pvc/`                | `/professionnels/lanieres-pvc/`               |
| `/rouleau-pvc-transparent/`    | `/professionnels/rouleaux-rails-accessoires/` |
| `/rideaux-de-soudure/`         | `/professionnels/rideaux-soudure/`            |
| `/rideau-chambre-froide/`      | `/professionnels/chambre-froide/`             |
| `/guide-dinstallation/`        | `/guide-installation/`                        |
| `/legal/`                      | `/mentions-legales/`                          |
| `/actualites/`, `/feed/`       | `/blog/`, `/blog/feed.xml`                    |
| les 6 anciens articles         | `/blog/<article>/` (articles repris)          |
| `/product/…`, panier, boutique | rouleaux / devis                              |

Si le nom de domaine change (`pvcrideaux.fr` → `isorideaux.fr`), décommenter le bloc « Ancien domaine →
nouveau domaine » du `.htaccess` une fois les deux domaines pointés vers le même hébergement, puis mettre à
jour `url` dans `site.config.js`.

---

## SEO, performance, accessibilité

- **SEO** : une balise `<title>` et une meta description par page (expressions historiques de pvcrideaux.fr
  conservées), URL canonique automatique, `sitemap.xml` (index des pages statiques et des articles) et
  `robots.txt` générés au build, fil d'Ariane balisé schema.org, données structurées `LocalBusiness` (avec
  l'ancien nom « PVC Rideaux ») et `WebSite` sur l'accueil, balises Open Graph pour les partages.
  `npm run seo` contrôle titres, descriptions, H1, canonical, textes alternatifs, JSON-LD et liens internes de
  toutes les pages générées. Plan d'action complet : [`docs/recommandations-seo.md`](docs/recommandations-seo.md).
- **Performance** : HTML statique, ~3,5 Ko de JS compressé sur les pages courantes (~6 Ko de plus sur le
  configurateur), images WebP avec `srcset`
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
- [ ] **Articles du blog** : les 6 articles de l'ancien site sont repris (métadonnées SEO réécrites) ; à
      relire, et à enrichir selon les actions du tableau de bord (liens, encart devis).
- [ ] **Idées d'articles** : vérifier le volume de recherche des expressions proposées (`public/lib/ideas.php`).
- [ ] **Comptes de l'espace d'édition** : qui publie ? (un compte par personne).
- [ ] **CGV** : lien vers le document Google existant, à remplacer idéalement par une page dédiée.
- [ ] **Devis instantané / paiement en ligne** : l'ancien site calculait un prix et encaissait via PayPal.
      Le nouveau configurateur envoie une demande de devis ; un prix indicatif pourra s'afficher dans l'aperçu
      dès qu'une grille tarifaire sera fournie.
- [ ] **Exemples de dimensions** du configurateur (porte 900 × 2100, garage 2400 × 2000, quai 3000 × 3000) :
      à ajuster selon les demandes les plus fréquentes.

---

_Photos produits reprises du site pvcrideaux.fr (propriété de la cliente). Polices Inter et Montserrat sous
licence SIL Open Font License._
