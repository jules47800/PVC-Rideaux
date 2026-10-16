# Recommandations SEO — IsoRideaux

Document de travail pour la mise en ligne du nouveau site et les 12 mois qui suivent.
Il complète les outils intégrés au site :

- l’**espace d’édition** (`/admin/`), avec sa note SEO par article et ses actions à mener ;
- l’**audit des pages** (`npm run build && npm run seo`), qui contrôle titres, descriptions,
  H1, liens internes et images de toutes les pages statiques.

---

## 1. Point de départ : l’ancien site pvcrideaux.fr

Ce qui fonctionnait, et qui est conservé :

- des **titres de pages construits sur les bonnes expressions** : « Rideau PVC », « Rideau
  lanière PVC », « Lanière PVC », « Rouleau PVC transparent », « Rideaux de soudure »,
  « Rideau chambre froide » ;
- des **articles de blog** sur des sujets recherchés (portes à lanières, barre d’accrochage,
  soudure, été) ;
- une fiche Google (avis clients) et un domaine ancien.

Ce qui freinait le référencement :

| Problème relevé                                                                                         | Conséquence                                 |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Erreurs de copier-coller : titre « Nettoyage de toiture Dieppe », H1 « Plâtrier peintre autour de moi » | Google associe ces pages à d’autres métiers |
| Meta descriptions dupliquées ou absentes                                                                | Extraits choisis au hasard, moins de clics  |
| H1 absents ou en double                                                                                 | Sujet des pages moins clair pour Google     |
| Pages vides (« antistatiques », « chariot élévateur »)                                                  | Pages jugées de faible qualité              |
| Titres d’articles de plus de 100 caractères, sans description                                           | Titres coupés dans Google                   |
| Restes de boutique WooCommerce (`/product/…`, panier)                                                   | Pages orphelines, exploration inutile       |

## 2. Ce que la refonte règle déjà

- **Titres et descriptions** uniques et dimensionnés pour Google sur toutes les pages, en
  reprenant les expressions historiques (« Rideau PVC à lanières sur mesure », « Rideau
  lanière PVC : kit complet sur mesure », « Lanière PVC de remplacement… », « Rouleau PVC
  transparent… », « Rideaux de soudure PVC… », « Rideau chambre froide… »).
- **Un seul H1 par page**, fil d’Ariane balisé (BreadcrumbList), balise canonical, balises de
  partage (Open Graph) générées automatiquement.
- **Redirections 301** de toutes les anciennes adresses (`public/.htaccess`) : pages, boutique,
  et les 6 articles, désormais repris dans le blog (`/blog/…`) au lieu d’être perdus.
- **Données structurées** : LocalBusiness (avec l’ancien nom « PVC Rideaux » en
  `alternateName`, pour que Google relie les deux marques), WebSite, BlogPosting et
  BreadcrumbList sur chaque article.
- **Plan du site** en deux parties : pages statiques (générées au build) et articles (générés
  à la volée par PHP, toujours à jour) — `sitemap.xml` les référence tous les deux.
- **Performance** : HTML statique, polices hébergées sur le site et allégées, images WebP,
  aucun script tiers, cache et compression configurés. C’est un critère de classement
  (Core Web Vitals) et surtout de conversion sur mobile.
- **Blog administrable** avec vérification SEO intégrée : chaque article reçoit une note sur
  100 et une liste d’actions concrètes (voir § 5).
- Les **métadonnées des 6 articles repris** (titre pour Google, description, description des
  images) ont été réécrites : leur note passe de 72–86 à 80–89. Les actions restantes
  (liens internes, encart devis, longueur) sont listées dans le tableau de bord.

## 3. Plan d’action, par priorité

### P0 — Jour de la mise en ligne (indispensable)

1. **Domaine** : faire pointer isorideaux.fr vers l’hébergement, activer le certificat SSL,
   puis décommenter dans `.htaccess` la redirection pvcrideaux.fr → isorideaux.fr.
   **Conserver le domaine pvcrideaux.fr** (renouvellement automatique) : il porte des années
   de liens entrants et l’adresse e-mail actuelle.
2. **Google Search Console** :
   - ajouter les deux domaines (propriété de type « Domaine ») ;
   - envoyer `https://www.isorideaux.fr/sitemap.xml` ;
   - utiliser l’outil **« Changement d’adresse »** depuis pvcrideaux.fr vers isorideaux.fr.
3. **Vérifier les redirections** : passer la liste des anciennes adresses dans un crawler
   (Screaming Frog, gratuit jusqu’à 500 adresses) et contrôler qu’elles répondent toutes en
   301 vers une page en 200.
4. **Fiche Google Business Profile** : nom, site web, logo et photos à jour. Les avis
   existants sont conservés. Ajouter « Rideaux PVC », « Fabricant », etc. en catégories.
5. **Créer le compte de l’espace d’édition** (voir README) et vérifier qu’un article de test
   s’affiche, puis le supprimer.

### P1 — Une expression clé par page (semaine 1)

Chaque page vise une recherche principale ; deux pages ne doivent jamais viser la même
(elles se concurrenceraient). Volumes à confirmer dans Search Console après 2–3 mois, ou
avec Google Keyword Planner.

| Page                          | Expression principale   | Expressions secondaires                                 |
| ----------------------------- | ----------------------- | ------------------------------------------------------- |
| Accueil                       | rideau pvc              | rideau à lanières pvc, rideau lamelles pvc              |
| Kits rideaux à lanières       | rideau lanière pvc      | kit rideau lanière, porte à lanières pvc                |
| Lanières de remplacement      | lanière pvc             | lanière pvc au mètre, lanière de rechange               |
| Rouleaux, rails & accessoires | rouleau pvc transparent | rouleau lanière pvc, rail rideau lanière                |
| Rideaux de soudure            | rideau de soudure       | écran de soudure, rideau soudure EN ISO 25980           |
| Chambre froide                | rideau chambre froide   | lanière pvc polaire, store meuble réfrigéré             |
| Espace professionnels         | rideau pvc industriel   | rideau entrepôt, rideau quai de chargement              |
| Espace particuliers           | rideau lanière garage   | rideau pvc maison, rideau anti-mouches                  |
| Guide de pose                 | pose rideau à lanières  | installer rideau pvc, fixer rail rideau lanière         |
| Articles du blog              | une expression chacun   | voir l’espace d’édition (contrôle des doublons intégré) |

### P2 — Contenu : 2 articles par mois (mois 1 à 12)

- Partir des **12 idées** proposées dans le tableau de bord (expression clé et plan fournis).
- Calendrier saisonnier conseillé :
  - **mars–avril** : anti-mouches, écurie et chenil (recherches de printemps) ;
  - **mai–juin** : rideau PVC en été (mettre à jour l’article existant) ;
  - **septembre–novembre** : garage, quai de chargement, économies d’énergie en chambre froide ;
  - **toute l’année** : épaisseur des lanières, nervurée ou lisse, mesurer son ouverture,
    nettoyage, norme soudure, antistatique, chariot élévateur.
- **Objectif : note SEO ≥ 80** pour chaque article publié.
- **Mettre à jour les 6 anciens articles** dès le premier mois : ajouter 2–3 liens vers les
  pages produits, un encart devis (`[[devis]]`), un intertitre en question, compléter
  l’article « barre d’accrochage » (349 mots → 700+).
- Une fois par an, relire les 5 articles qui reçoivent le plus de visites (Search Console)
  et les actualiser.

### P3 — Référencement local (continu)

- Publier **une actualité ou une photo par semaine** sur la fiche Google (chantier, nouveau
  produit, conseil) : 10 minutes, effet direct sur la visibilité locale.
- **Demander un avis** après chaque livraison (le lien est déjà sur le site, page Contact et
  bloc avis) : viser 2 nouveaux avis par mois, et répondre à chacun.
- Harmoniser nom, adresse et téléphone sur les annuaires : PagesJaunes, Societe.com,
  Kompass, Europages, annuaire de la CCI Lot-et-Garonne.

### P4 — Liens entrants (mois 2 à 12)

- Annuaires professionnels de qualité : **Europages**, **Kompass**, **DirectIndustry**.
- Fournisseurs, installateurs et revendeurs partenaires : un lien depuis leur page
  « partenaires » ou une fiche produit.
- Presse régionale et CCI : l’histoire du changement de nom, la fabrication locale.
- Articles invités sur des blogs logistique, restauration ou agricoles (écuries, élevages).
- À éviter : achat de liens, échanges massifs, annuaires de mauvaise qualité.

### P5 — Technique (à faire une fois, puis surveiller)

- Activer **HSTS** dans `.htaccess` une fois le HTTPS validé sur tous les sous-domaines.
- Suivre les **Core Web Vitals** et les **pages non indexées** dans Search Console chaque mois.
- Après toute modification des pages : `npm run build && npm run seo` avant l’envoi FTP.
- Pas de balisage FAQ : Google ne l’affiche plus que pour les sites officiels et de santé.
  Les questions-réponses restent utiles pour les lecteurs et « Autres questions posées ».

### P6 — Mesurer

- **Search Console** (gratuit, sans cookie) : clics, impressions et position par expression ;
  suivre les 10 expressions du tableau P1.
- **Conversions** : chaque devis envoyé mène à `/merci/` ; suivre le nombre de visites de
  cette page.
- Outil de statistiques optionnel : **Matomo** ou **Plausible** (sans cookie, conformes RGPD
  sans bandeau). Leur domaine devra être ajouté à la `Content-Security-Policy` de
  `.htaccess` (`script-src` et `connect-src`).
- Indicateurs mensuels : clics organiques, devis reçus, part des devis venant de Google,
  note SEO moyenne du blog (tableau de bord).

## 4. Check-list d’un article

Reprise des contrôles de l’espace d’édition :

- [ ] Une **expression clé** de 2 à 4 mots, différente de celle des autres articles.
- [ ] **Titre** de 30 à 60 caractères, expression clé au début.
- [ ] **Description** de 120 à 155 caractères, avec l’expression clé et une incitation.
- [ ] **Adresse** courte contenant l’expression clé.
- [ ] Expression clé dans l’**introduction** et dans au moins un **intertitre**.
- [ ] **700 mots** ou plus, des **intertitres H2** tous les 200–300 mots, dont une **question**.
- [ ] Paragraphes de 3–4 phrases, phrases de moins de 25 mots.
- [ ] **2 ou 3 liens** vers les pages produits ou d’autres articles.
- [ ] Un **encart devis** (`[[devis]]`) au milieu ou à la fin.
- [ ] Une **image de couverture** et des images dans le texte, toutes **décrites**.
- [ ] Note SEO ≥ 80 avant de publier.

## 5. La vérification SEO de l’espace d’édition

Fichier `public/admin/assets/seo-checker.js` (seuils regroupés en tête de fichier).

| Contrôle                           | Vert                       | Orange / rouge                                | Poids |
| ---------------------------------- | -------------------------- | --------------------------------------------- | ----- |
| Expression clé renseignée          | 1 à 6 mots                 | absente (compte pour tous les contrôles liés) | 3     |
| Expression clé unique              | aucun autre article        | déjà utilisée (cannibalisation)               | 3     |
| Expression clé dans le titre       | présente                   | absente                                       | 3     |
| Longueur du titre                  | 30–60 caractères           | < 30, 61–70, > 70                             | 2     |
| Description                        | 120–158 caractères         | absente, trop courte, trop longue             | 2     |
| Expression clé dans la description | présente                   | absente                                       | 2     |
| Adresse                            | ≤ 60 car., expression      | trop longue, sans l’expression                | 1 + 1 |
| Longueur du texte                  | ≥ 700 mots                 | 400–699 / < 400                               | 3     |
| Expression clé dans l’introduction | présente                   | absente                                       | 2     |
| Intertitres H2                     | ≥ 2                        | 1 / 0                                         | 2     |
| Pas de H1 dans le texte            | —                          | « # » utilisé                                 | 2     |
| Expression clé dans un intertitre  | présente                   | absente                                       | 1     |
| Fréquence de l’expression          | 1 à 3 % des mots           | jamais / trop répétée                         | 1     |
| Intertitre en question             | au moins un                | aucun                                         | 1     |
| Paragraphes, phrases               | courts                     | > 120 mots / > 25 % de phrases > 25 mots      | 1 + 1 |
| Liens internes                     | ≥ 2 (+ suggestions)        | 1 / 0, lien vers un article inexistant        | 2     |
| Encart ou lien devis               | présent                    | absent                                        | 2     |
| Images                             | couverture + texte décrits | manquantes ou sans description                | 1 + 1 |
| Fraîcheur (articles en ligne)      | < 12 mois                  | non mis à jour depuis plus de 12 mois         | 1     |

Note = moyenne pondérée (vert = 1, orange = 0,5, rouge = 0). 80 et plus : très bien optimisé.
