# IsoRideaux — site vitrine

Refonte du site **pvcrideaux.fr**, qui devient **IsoRideaux** : rideaux à lanières PVC sur mesure.

Le site s'organise autour de **deux espaces distincts**, accessibles dès l'arrivée :

- **Espace professionnels** : entrepôts, industrie, chambres froides, soudure, commerces ;
- **Espace particuliers** : garage, atelier, cuisine d'été, écurie, abri de jardin.

Site statique construit avec [Vite](https://vite.dev), sans framework, **hébergé sur Vercel** : pages HTML
générées au build, et quelques fonctions serveur (formulaires, espace d'édition).

Il comprend un **blog** que la cliente alimente elle-même depuis un **espace d'édition** simple (`/admin/`),
avec une **vérification SEO** qui note chaque article et liste les actions à mener. La stratégie de
référencement est détaillée dans [`docs/recommandations-seo.md`](docs/recommandations-seo.md).

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
12. [Hébergement sur Vercel](#hébergement-sur-vercel)
13. [Redirections depuis l'ancien site](#redirections-depuis-lancien-site)
14. [SEO, performance, accessibilité](#seo-performance-accessibilité)
15. [Design system & animations](#design-system--animations)
16. [Points à valider avec la cliente](#points-à-valider-avec-la-cliente)

---

## Démarrage rapide

**Prérequis** : Node.js 20.19+ (ou 22.12+) et npm.

```bash
npm install                 # dépendances
cp .env.example .env.local  # variables locales (facultatif, voir plus bas)
npm run dev                 # site + fonctions + espace d'édition : http://localhost:5173
npm run build               # génère le site final dans dist/
npm run preview             # sert dist/ (avec les fonctions) pour vérification
npm run seo                 # audit SEO des pages générées et notes des articles (après un build)
npm run admin:password -- sandrine   # empreinte d'un mot de passe pour l'espace d'édition
npm run format              # formate JS / CSS / JSON / Markdown (Prettier)
```

`npm run dev` exécute aussi les fonctions de `api/` (plugin `vite-plugins/dev-api.js`), comme sur Vercel :

- **formulaires** : sans SMTP configuré, l'e-mail « envoyé » s'affiche dans le terminal ;
- **espace d'édition** : avec `ADMIN_USERS` et `ADMIN_SECRET` dans `.env.local`, il fonctionne en local, et
  enregistre les articles directement dans `content/` (les pages du blog se regénèrent aussitôt).

---

## Choix techniques

**Le site n'est pas une application JavaScript.** Chaque page est un vrai fichier HTML, généré au build et
lisible tel quel par Google comme par un navigateur sans JavaScript. Vite n'est qu'un **outil de construction** :
il assemble les fragments communs (en-tête, pied de page…), génère les pages du blog, optimise images et styles,
puis produit un dossier `dist/` de fichiers statiques que Vercel sert depuis son réseau mondial. Côté serveur, seules
quelques **fonctions Vercel** tournent à la demande : formulaires et espace d'édition.

| Décision                                         | Pourquoi                                                                                                                                                                                                                               |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Site statique multi-pages (plutôt que WordPress) | Pages très rapides, aucune base de données ni extension à mettre à jour, surface d'attaque minimale, hébergement Vercel sans serveur à administrer.                                                                                    |
| Pas de framework (React, Vue…)                   | Un site vitrine a peu d'interactions : un framework ajouterait 40 à 100 Ko de JS et imposerait un rendu serveur pour le référencement. Ici, le HTML porte le contenu, et le JS ne fait qu'**améliorer** l'expérience.                  |
| JavaScript « vanilla », en petits modules        | ~3,5 Ko compressés sur les pages courantes (menus, apparitions, carrousel, validation des formulaires). Le configurateur (~6 Ko) n'est chargé que sur `/devis/`.                                                                       |
| Amélioration progressive                         | Sans JS, tout reste lisible et les formulaires fonctionnent (envoi classique, redirection). Avec JS, on ajoute le confort : envoi sans rechargement, parcours pas à pas, aperçu en direct.                                             |
| Fonctions Vercel (API web standard)              | Formulaires et espace d'édition sans serveur à maintenir ; `Request` / `Response` standard, exécutables aussi en local par Vite. Exécutées à Paris (`cdg1`).                                                                           |
| Articles dans le dépôt Git, blog généré au build | Pas de base de données ni de service supplémentaire : un article = un fichier JSON versionné (historique, retour arrière, sauvegarde gratuite). Le blog est fait de vraies pages statiques, les plus rapides et les mieux référencées. |
| Espace d'édition sur mesure (plutôt qu'un CMS)   | Exactement les champs utiles et la vérification SEO, rien à mettre à jour, aucun service tiers. Il enregistre les articles via l'API GitHub ; Vercel redéploie le site en une minute environ.                                          |

**Contreparties** : une publication est visible après le redéploiement (environ une minute, suivi dans l'espace
d'édition) ; les pages vitrines (accueil, produits…) restent modifiées dans le code puis déployées, car elles
changent rarement et leur mise en page est travaillée finement.

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
| `/blog/`, `/blog/<article>/`                    | Blog (généré au build), catégories, flux RSS              | —            |
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
├── vite.config.js            # Configuration Vite (multi-pages, génération du blog, plugins)
├── vercel.json               # ★ Redirections 301, en-têtes de sécurité, cache, tâche planifiée
├── .env.example              # Variables d'environnement (formulaires, espace d'édition)
├── content/
│   └── articles/*.json       # ★ Articles du blog (un fichier par article, nom = adresse)
├── api/                      # Fonctions Vercel (une URL par fichier)
│   ├── send.js               # Formulaires → e-mail (SMTP)
│   ├── admin/                # Espace d'édition : session, login, logout, articles, upload
│   └── cron/publish.js       # Mise en ligne quotidienne des articles programmés
├── lib/                      # Code partagé (fonctions, build, navigateur)
│   ├── blog/                 # Modèle d'article, Markdown, gabarits et génération du blog,
│   │                         # vérification SEO (seo-checker.js), idées d'articles (ideas.js)
│   ├── admin/                # Authentification, stockage (GitHub ou fichiers locaux), articles
│   ├── forms.js, mailer.js   # Validation des formulaires, envoi SMTP
│   └── http.js               # Réponses JSON, limitation de fréquence
├── vite-plugins/
│   ├── html-templates.js     # Partials, variables { }, aria-current, typographie FR, Open Graph
│   ├── pages.js              # Découverte automatique des pages
│   ├── blog.js               # Flux RSS, build-info.json, regénération du blog en dev
│   ├── dev-api.js            # Exécute les fonctions de api/ dans `npm run dev` / `preview`
│   └── sitemap.js            # Génère sitemap.xml et robots.txt
├── tools/
│   ├── seo-audit.mjs         # Audit SEO (npm run seo)
│   ├── admin-password.mjs    # Empreinte d'un mot de passe (npm run admin:password)
│   └── vercel-ignore-build.mjs  # Saute les déploiements inutiles (brouillons, images)
├── docs/
│   └── recommandations-seo.md  # ★ Audit, plan d'action SEO, check-list des articles
├── public/                   # Copié tel quel à la racine du site
│   ├── blog/images/          # Couvertures des articles repris de l'ancien site
│   ├── uploads/blog/         # Images envoyées depuis l'espace d'édition (créé à l'usage)
│   ├── icons.svg, favicons, og-image.jpg, logo-isorideaux.png, site.webmanifest
└── src/                      # Racine Vite : 1 fichier .html = 1 page
    ├── index.html, professionnels/…, particuliers/, devis/, contact/ …
    ├── admin/                # Espace d'édition : pages, styles et scripts
    ├── blog/                 # GÉNÉRÉ depuis content/ (non versionné)
    ├── partials/             # Fragments partagés (blog/ : généré, non versionné)
    ├── assets/               # Images (WebP optimisés), logos partenaires
    ├── styles/               # tokens.css ★, base, layout, motion, components/ (… blog)
    └── scripts/
        ├── main.js           # Chargé sur toutes les pages
        ├── modules/          # header, dropdown, mobile-menu, mobile-cta, reveal, carousel,
        │                     # forms, quote-links, curtain-preview (aperçu SVG du rideau)
        ├── pages/devis.js    # Configurateur pas à pas (chargé uniquement sur /devis/)
        └── data/catalogue.js # ★ Formats, matières et produits
```

Les fichiers marqués ★ sont ceux que l'on modifie le plus souvent.

---

## Gabarits HTML : partials et variables

Le plugin `vite-plugins/html-templates.js` ajoute un mini système de gabarits, actif en dev comme au build :

| Syntaxe                                | Effet                                                                            |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| `<!-- @include header.html -->`        | Insère `src/partials/header.html` (inclusions imbriquées possibles)              |
| `{{ site.phone }}`                     | Valeur issue de `site.config.js` (échappée en HTML)                              |
| `{{ page.url }}`                       | URL canonique absolue de la page (`page.path` : chemin relatif)                  |
| `<!-- @page {"ogType": "article"} -->` | Variables propres à la page (type et image de partage), utilisé par les articles |

Il se charge aussi, sans intervention :

- d'ajouter `aria-current="page"` sur les liens vers la page courante, et `aria-current="true"` vers sa
  section parente (c'est ce qui allume l'onglet « Professionnels » sur toutes les pages pro) ;
- d'insérer les espaces insécables de la typographie française avant `: ; ? !` et dans les guillemets ;
- de générer `og:title` / `og:description` à partir du `<title>` et de la meta description.

Une variable inconnue fait **échouer le build** : impossible de publier un `{{ … }}` oublié.

**Partials disponibles** : `head`, `header`, `footer`, `reassurance`, `steps`, `reviews`, `logos`,
`cta-devis`, `cta-particulier`, `cta-note`, `quick-quote`, `mobile-cta`, pour le configurateur
`header-focus`, `footer-minimal`, `funnel-nav`, et pour l'espace d'édition `admin/head`, `admin/header`.
Les partials `blog/latest-posts*.html` (« Nos derniers conseils ») sont **générés** à partir des articles.

### Ajouter une page

1. Créer `src/ma-page/index.html` (copier une page existante, par exemple `a-propos/index.html`).
2. Renseigner `<title>`, la meta description et, si la page appartient à un espace, `<body data-space="pro">`
   ou `<body data-space="particulier">`.
3. Ajouter le lien dans `src/partials/header.html` et/ou `footer.html`.

C'est tout : la page est détectée automatiquement par Vite, ajoutée au `sitemap.xml` et servie à l'URL
`/ma-page/`.

---

## Modifier le contenu courant

| Je veux changer…                       | Où                                                                          |
| -------------------------------------- | --------------------------------------------------------------------------- |
| Téléphone, e-mail, horaires, adresse   | `site.config.js` (mis à jour sur tout le site au prochain build)            |
| Domaine définitif du site              | `site.config.js` → `url`                                                    |
| Destinataire des formulaires           | variable `MAIL_TO` sur Vercel (voir [Hébergement](#hébergement-sur-vercel)) |
| Couleurs, typographie, arrondis        | `src/styles/tokens.css`                                                     |
| Avis clients                           | `src/partials/reviews.html`                                                 |
| Logos « Ils nous font confiance »      | `src/partials/logos.html` (images dans `src/assets/partners/`)              |
| Articles du blog                       | espace d'édition `/admin/` (voir [Espace d'édition](#espace-dédition))      |
| Idées d'articles proposées             | `lib/blog/ideas.js`                                                         |
| Gamme (formats / matières disponibles) | voir ci-dessous                                                             |

### Gamme de produits

La disponibilité des formats par matière est définie à trois endroits, à garder alignés :

1. `src/scripts/data/catalogue.js` — utilisé par le configurateur ;
2. le tableau de `src/professionnels/kit-rideau-lanieres/index.html` (et les pastilles des cartes PVC) ;
3. les libellés de `lib/forms.js` (`OPTION_LABELS`), qui valident les valeurs reçues.

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
navigateur ──(fetch)──▶ /api/send (api/send.js) ──SMTP──▶ boîte de réception (MAIL_TO)
            ◀── { ok: true } ── redirection JS vers /merci/
```

- **Amélioration progressive** : sans JavaScript, le formulaire est posté normalement et la fonction redirige
  vers `/merci/` (ou affiche une page d'erreur listant les champs à corriger).
- **Validation** côté navigateur (messages en français, accessibles) **et** côté serveur (`lib/forms.js` : liste
  blanche des champs et des valeurs, bornes numériques, e-mail, code postal).
- **Anti-spam sans captcha** : champ piège invisible, délai minimal de remplissage (3 s), un envoi toutes les
  30 s par adresse IP (par instance de fonction ; le pare-feu Vercel peut compléter).
- Le configurateur n'envoie que les champs utiles au produit choisi (le serveur refait ce tri).

**Envoi des e-mails** (`lib/mailer.js`, nodemailer) : n'importe quelle boîte SMTP convient — celle du nom de
domaine (OVH, Gandi, Hostinger…), Google Workspace, Microsoft 365, ou un service d'envoi (Brevo, Resend…).
Variables `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_TO`, `MAIL_FROM` (voir `.env.example`).
`MAIL_FROM` doit appartenir au domaine de la boîte SMTP, avec un enregistrement SPF/DKIM valide, sinon les
messages risquent de finir en spam.

En local, sans `SMTP_HOST`, l'e-mail s'affiche dans le terminal de `npm run dev`.

---

## Blog

Les pages du blog sont **générées au build** à partir de `content/articles/*.json` (`lib/blog/generate.js`),
puis traitées comme toutes les autres pages (partials, typographie, Open Graph, sitemap) :

| Adresse                        | Contenu                                                                   |
| ------------------------------ | ------------------------------------------------------------------------- |
| `/blog/`, `/blog/page/2/`      | Liste des articles (9 par page)                                           |
| `/blog/categorie/<catégorie>/` | Articles d'une catégorie (`noindex,follow` : ne concurrence pas la liste) |
| `/blog/<article>/`             | Article : sommaire (dès 3 intertitres), articles liés, encart devis       |
| `/blog/<ancienne-adresse>/`    | Redirection vers la nouvelle adresse d'un article renommé                 |
| `/blog/feed.xml`               | Flux RSS                                                                  |

- **Article** : un fichier JSON (titre, expression clé, titre et description pour Google, catégorie,
  couverture, contenu en **Markdown**, état, dates). Le nom du fichier donne l'adresse.
- **Brouillons** : jamais publiés. **Articles programmés** (« Publié » avec une date future) : mis en ligne par
  la tâche planifiée quotidienne (`api/cron/publish.js`, voir [Hébergement](#hébergement-sur-vercel)).
- **SEO** : titre et description dédiés, canonical, Open Graph (`og:type=article`, image de couverture et ses
  dimensions), données structurées `BlogPosting` et `BreadcrumbList`, date de modification dans le sitemap.
- **Conversion** : encart devis en fin d'article (estimation largeur × hauteur), et encart au fil du texte avec
  le raccourci `[[devis]]`. Le bloc « Nos derniers conseils » (accueil et espaces) est généré au build, en
  privilégiant les articles de l'espace de la page.
- **Sécurité** : Markdown sans HTML (échappé) ni liens `javascript:` (`lib/blog/markdown.js`) ; les `{ }`
  saisis dans un article ne sont jamais interprétés comme des variables.

---

## Espace d'édition

Adresse : **`/admin/`**. Pensé pour une utilisation sans connaissance technique.

### Fonctionnalités

- **Tableau de bord** : articles en ligne / programmés / brouillons, note SEO de chaque article et note
  moyenne, **actions prioritaires** sur les articles en ligne, **12 idées d'articles** (expression clé et plan
  prêts à remplir), rappel des bons réflexes.
- **Éditeur** : barre d'outils Markdown (intertitres, gras, listes, citation, lien, image, encart devis),
  raccourcis `Ctrl B / I / K`, `Ctrl S` pour enregistrer, onglet **Aperçu** (même rendu que le site), adresse
  générée d'après le titre, **aperçu du résultat Google** avec compteurs de caractères, catégorie, date de
  publication (programmation), image de couverture.
- **Vérification SEO en direct** (`lib/blog/seo-checker.js`) : une note sur 100 et, pour chaque point, l'action
  concrète à mener (expression clé dans le titre, longueur, intertitres, liens internes avec **pages suggérées
  à lier en un clic**, encart devis, images décrites, doublons d'expression entre articles, fraîcheur…).
  Détail : [`docs/recommandations-seo.md`](docs/recommandations-seo.md#5-la-vérification-seo-de-lespace-dédition).
- **Images** : redressées, redimensionnées et converties en WebP **dans le navigateur** (couverture recadrée
  en 1200 × 630, illustrations 1600 px max.), puis enregistrées dans `public/uploads/blog/AAAA/MM/`.
- **Publication** : chaque enregistrement est un commit sur GitHub ; l'éditeur suit le redéploiement et
  indique « C'est en ligne » (via `/build-info.json`). Les brouillons et les images seules ne déclenchent
  aucun déploiement (`tools/vercel-ignore-build.mjs`).
- **Suppression** : l'article part dans `content/corbeille/` ; pour le restaurer, le replacer dans
  `content/articles/` (ou annuler le commit sur GitHub).
- **Conflits** : si l'article a été modifié entre-temps (autre onglet, autre personne), l'enregistrement est
  refusé au lieu d'écraser le travail de l'autre.

### Créer les comptes

1. Ouvrir `https://<domaine>/admin/` : tant qu'aucun compte n'existe, la page **« Mise en service »** calcule,
   dans le navigateur, l'empreinte du mot de passe et une clé de session. (Ou :
   `npm run admin:password -- identifiant`.)
2. Ajouter dans Vercel (**Settings → Environment Variables**) :
   - `ADMIN_USERS` = `identifiant:empreinte` (plusieurs comptes séparés par des virgules) ;
   - `ADMIN_SECRET` = la clé de session (32 caractères ou plus).
3. Redéployer. Le mot de passe n'est stocké nulle part, seulement son empreinte (PBKDF2-SHA256).

### Brancher GitHub (enregistrement des articles)

1. Sur GitHub : **Settings → Developer settings → Fine-grained tokens → Generate new token**, accès limité au
   dépôt du site, permission **Contents : Read and write**, expiration la plus longue possible (noter la date
   de renouvellement).
2. Dans Vercel : variable `GITHUB_CONTENT_TOKEN`. Le dépôt et la branche sont déduits du déploiement
   (`GITHUB_CONTENT_REPO`, `GITHUB_CONTENT_BRANCH` pour les forcer).

Les commits portent le nom de la personne connectée (« sandrine (espace d'édition) »). Pensez à faire
`git pull` avant de travailler sur le code : la cliente a pu publier entre-temps.

### Sécurité

Cookie de session signé, `HttpOnly`, `SameSite=Strict`, `Secure`, limité à `/api/admin`, expirant après 2 h
d'inactivité (12 h au plus) ; requêtes refusées si elles viennent d'un autre site ; 5 essais de connexion par
adresse IP puis blocage 15 minutes ; pages `noindex` ; même CSP stricte que le site (aucun script ni style en
ligne). Le jeton GitHub ne quitte jamais les fonctions serveur.

---

## Hébergement sur Vercel

### Mise en place (une fois)

1. **Importer le dépôt** dans Vercel (Add New → Project). La configuration est lue dans `vercel.json` :
   framework Vite, `npm run build`, dossier `dist/`, fonctions de `api/` exécutées à Paris.
2. **Variables d'environnement** (Settings → Environment Variables), décrites dans `.env.example` :

   | Variable                                           | Rôle                                                  |
   | -------------------------------------------------- | ----------------------------------------------------- |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Boîte d'envoi des formulaires                         |
   | `MAIL_TO`, `MAIL_FROM`                             | Destinataire des demandes, expéditeur                 |
   | `ADMIN_USERS`, `ADMIN_SECRET`                      | Comptes de l'espace d'édition                         |
   | `GITHUB_CONTENT_TOKEN`                             | Enregistrement des articles dans le dépôt             |
   | `DEPLOY_HOOK_URL`                                  | Settings → Git → Deploy Hooks (branche de production) |
   | `CRON_SECRET`                                      | Protège la tâche planifiée (valeur aléatoire)         |

3. **Domaines** (Settings → Domains) : ajouter `www.isorideaux.fr` (domaine principal) et `isorideaux.fr`,
   puis `pvcrideaux.fr` et `www.pvcrideaux.fr` en **redirection 308 vers `www.isorideaux.fr`** : les anciennes
   adresses (voir plus bas) arrivent ainsi sur les bonnes pages. Conserver le nom de domaine pvcrideaux.fr.
4. **Tâche planifiée** : déclarée dans `vercel.json` (chaque jour à 5 h UTC) ; elle redéploie le site quand un
   article programmé arrive à sa date.

### Au quotidien

- **Code** : chaque `git push` sur la branche de production déploie le site ; chaque branche ou pull request
  obtient une adresse d'aperçu (l'espace d'édition y enregistre sur cette branche).
- **Articles** : publiés par la cliente depuis `/admin/`, sans intervention.
- **Sauvegarde** : tout le contenu est dans Git (articles, images) ; rien d'autre à sauvegarder.
- **Offre** : l'offre Hobby (gratuite) est réservée à un usage non commercial ; un site d'entreprise relève de
  l'offre Pro (qui permet aussi des tâches planifiées plus fréquentes et des règles de pare-feu).

---

## Redirections depuis l'ancien site

`vercel.json` redirige (308, permanent) les anciennes adresses WordPress vers les nouvelles, pour conserver le
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

Les changements d'adresse d'articles faits dans l'espace d'édition sont gérés par le blog lui-même.

---

## SEO, performance, accessibilité

- **SEO** : une balise `<title>` et une meta description par page (expressions historiques de pvcrideaux.fr
  conservées), URL canonique automatique, `sitemap.xml` (pages et articles, sans les pages `noindex`) et
  `robots.txt` générés au build, fil d'Ariane balisé schema.org, données structurées `LocalBusiness` (avec
  l'ancien nom « PVC Rideaux ») et `WebSite` sur l'accueil, balises Open Graph pour les partages.
  `npm run seo` contrôle titres, descriptions, H1, canonical, textes alternatifs, JSON-LD et liens internes de
  toutes les pages générées, et affiche la note de chaque article. Plan d'action complet :
  [`docs/recommandations-seo.md`](docs/recommandations-seo.md).
- **Performance** : HTML statique servi par le CDN de Vercel, ~3,5 Ko de JS compressé sur les pages courantes,
  images WebP avec `srcset` et chargement différé, polices auto-hébergées limitées au sous-ensemble latin, cache
  long sur les fichiers versionnés.
- **RGPD** : aucun cookie (hors session de l'espace d'édition), aucun service tiers chargé (pas de Google Fonts
  ni de carte intégrée) : aucun bandeau de consentement n'est nécessaire. Fonctions exécutées à Paris.
- **Accessibilité** : navigation complète au clavier, lien d'évitement, menu mobile en `<dialog>` natif
  (piège à focus, touche Échap), FAQ en `<details>` natifs, contrastes AA, messages d'erreur reliés aux
  champs, préférences « mouvement réduit » respectées.
- **En-têtes de sécurité** (`vercel.json`) : CSP stricte (`'self'` uniquement), `X-Content-Type-Options`,
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

- [ ] **Nom de domaine définitif** (`isorideaux.fr` ?) → `site.config.js` (`url`) et variable `MAIL_FROM`.
- [ ] **Adresse e-mail** de contact (actuellement `contact@pvcrideaux.fr`).
- [ ] **Mentions légales** : forme juridique, immatriculation (RCS / RM), n° de TVA intracommunautaire,
      directrice de la publication (commentaire `TODO` dans la page). Hébergeur : Vercel Inc., adresse à
      confirmer sur [vercel.com/legal](https://vercel.com/legal) (`site.config.js` → `legal`).
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
- [ ] **Idées d'articles** : vérifier le volume de recherche des expressions proposées (`lib/blog/ideas.js`).
- [ ] **Comptes de l'espace d'édition** : qui publie ? (un compte par personne).
- [ ] **Boîte e-mail d'envoi** (SMTP) pour les formulaires : celle du nom de domaine, ou un service d'envoi.
- [ ] **Offre Vercel** : l'offre gratuite (Hobby) est réservée aux projets non commerciaux ; un site
      d'entreprise relève de l'offre Pro.
- [ ] **CGV** : lien vers le document Google existant, à remplacer idéalement par une page dédiée.
- [ ] **Devis instantané / paiement en ligne** : l'ancien site calculait un prix et encaissait via PayPal.
      Le nouveau configurateur envoie une demande de devis ; un prix indicatif pourra s'afficher dans l'aperçu
      dès qu'une grille tarifaire sera fournie.
- [ ] **Exemples de dimensions** du configurateur (porte 900 × 2100, garage 2400 × 2000, quai 3000 × 3000) :
      à ajuster selon les demandes les plus fréquentes.

---

_Photos produits reprises du site pvcrideaux.fr (propriété de la cliente). Polices Inter et Montserrat sous
licence SIL Open Font License._

---

_Photos produits reprises du site pvcrideaux.fr (propriété de la cliente). Polices Inter et Montserrat sous
licence SIL Open Font License._
