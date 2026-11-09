/**
 * Espace d'édition en anglais (par défaut) ou en français.
 *
 * Le code et les messages du serveur restent écrits en français : ce module
 * traduit l'interface à l'affichage (textes, attributs, messages, conseils
 * SEO) grâce au dictionnaire ci-dessous. « {} » marque une partie variable,
 * elle-même traduite si elle figure au dictionnaire (« 3 mots » → « 3 words »).
 * Le contenu des articles (blocs, aperçu, titres) n'est jamais traduit.
 *
 * Choix mémorisé par navigateur ; boutons FR / EN dans l'en-tête de l'admin.
 */

const STORAGE_KEY = 'isorideaux-admin-lang';

export const lang = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'fr' ? 'fr' : 'en';
  } catch {
    return 'en';
  }
})();

export const locale = lang === 'fr' ? 'fr-FR' : 'en-GB';

/* prettier-ignore */
const EN = {
  /* — En-tête, navigation, titres de pages — */
  'Aller au contenu': 'Skip to content',
  'Espace d’édition': 'Editing area',
  'Articles': 'Articles',
  'Nouvel article': 'New article',
  'Voir le blog': 'View the blog',
  'Se déconnecter': 'Log out',
  'Articles · Espace d’édition IsoRideaux': 'Articles · IsoRideaux editing area',
  'Article · Espace d’édition IsoRideaux': 'Article · IsoRideaux editing area',
  'Connexion · Espace d’édition IsoRideaux': 'Log in · IsoRideaux editing area',

  /* — Connexion et mise en service — */
  'Connexion': 'Log in',
  'Espace réservé à l’équipe IsoRideaux pour rédiger et publier les articles du blog.': 'For the IsoRideaux team to write and publish blog articles.',
  'Vous êtes déconnecté.': 'You are logged out.',
  'Identifiant': 'Username',
  'Mot de passe': 'Password',
  'Se connecter': 'Log in',
  'Trop de tentatives : réessayez dans 15 minutes.': 'Too many attempts: try again in 15 minutes.',
  'Identifiant ou mot de passe incorrect.': 'Incorrect username or password.',
  'Mise en service de l’espace d’édition': 'Editing area setup',
  'Aucun compte n’est encore configuré. Choisissez un identifiant et un mot de passe : cette page calcule,': 'No account is set up yet. Choose a username and a password: this page computes,',
  'dans votre navigateur': 'in your browser',
  ', l’empreinte du mot de passe et une clé de session, à enregistrer dans les variables d’environnement du projet Vercel. Le mot de passe n’est envoyé nulle part.': ', the password hash and a session key to store in the Vercel project’s environment variables. The password is never sent anywhere.',
  'Lettres minuscules, chiffres et tirets (ex. sandrine).': 'Lowercase letters, digits and hyphens (e.g. sandrine).',
  '(12 caractères minimum)': '(at least 12 characters)',
  'Générer la configuration': 'Generate the configuration',
  'Calcul en cours…': 'Computing…',
  'Variables d’environnement à ajouter': 'Environment variables to add',
  'Dans Vercel, ouvrez le projet →': 'In Vercel, open the project →',
  'et ajoutez ces deux variables (environnement « Production », et « Preview » si besoin) :': 'and add these two variables (“Production” environment, and “Preview” if needed):',
  'En local, ajoutez les mêmes lignes au fichier': 'Locally, add the same lines to the file',
  'Ajoutez aussi': 'Also add',
  '(voir le README) pour que les articles puissent être enregistrés.': '(see the README) so that articles can be saved.',
  'Redéployez le site (': 'Redeploy the site (',
  '), puis rechargez cette page.': '), then reload this page.',
  'Pour ajouter une personne plus tard : générez sa ligne et ajoutez-la à': 'To add someone later: generate their line and append it to',
  ', séparée par une virgule.': ', separated by a comma.',

  /* — Tableau de bord — */
  'Articles du blog': 'Blog articles',
  'Rédigez, publiez et améliorez vos articles. Chaque article reçoit une note SEO et une liste d’actions concrètes.': 'Write, publish and improve your articles. Each article gets an SEO score and a list of concrete actions.',
  'en ligne': 'live',
  'programmé(s)': 'scheduled',
  'brouillon(s)': 'drafts',
  'note SEO moyenne': 'average SEO score',
  'Actions prioritaires': 'Priority actions',
  'Les corrections qui feront le plus progresser vos articles en ligne, par ordre d’importance.': 'The fixes that will improve your live articles the most, in order of importance.',
  'Tous les articles': 'All articles',
  'Chargement des articles…': 'Loading articles…',
  'Aucun article pour l’instant.': 'No articles yet.',
  'Rédigez le premier': 'Write the first one',
  'ou partez d’une idée ci-dessous.': 'or start from an idea below.',
  'Article': 'Article',
  'État': 'Status',
  'Date': 'Date',
  'Note SEO': 'SEO score',
  'Actions': 'Actions',
  'Modifier': 'Edit',
  'Voir': 'View',
  'Supprimer': 'Delete',
  'Sans titre': 'Untitled',
  '{} · « {} »': '{} · “{}”',
  'Idées d’articles': 'Article ideas',
  'Des sujets recherchés par vos clients, avec leur expression clé et un plan prêt à remplir. Pensez à vérifier le volume de recherche de l’expression (Search Console, Keyword Planner) avant de rédiger.': 'Topics your customers search for, with their keyword and an outline ready to fill in. Check the keyword’s search volume (Search Console, Keyword Planner) before writing.',
  'Expression clé :': 'Keyword:',
  'Rédiger cet article': 'Write this article',
  'Les bons réflexes pour un article bien référencé': 'Good habits for a well-ranked article',
  'Une expression clé par article': 'One keyword per article',
  ', celle que tape votre client dans Google (« rideau lanière chambre froide »), et jamais la même que celle d’un autre article.': ', the one your customer types into Google (“rideau lanière chambre froide”), never the same as another article’s.',
  'Un titre accrocheur': 'A catchy title',
  ': l’expression clé au début, un bénéfice concret, une longueur adaptée (l’aperçu Google vous guide).': ': the keyword first, a concrete benefit, the right length (the Google preview guides you).',
  'Au moins 700 mots': 'At least 700 words',
  'découpés en intertitres (H2) clairs, dont une ou deux questions que se posent vos clients.': 'split by clear headings (H2), including one or two questions your customers ask.',
  'Des liens': 'Links',
  'vers 2 ou 3 pages du site (produits, guide de pose) et vers le devis : c’est ce qui transforme un lecteur en client.': 'to 2 or 3 pages of the site (products, installation guide) and to the quote form: that is what turns a reader into a customer.',
  'Des images': 'Images',
  'avec une description (texte alternatif) : l’éditeur les compresse automatiquement.': 'with a description (alt text): the editor compresses them automatically.',
  'Mettez à jour': 'Update',
  'vos meilleurs articles chaque année : Google privilégie les contenus récents.': 'your best articles every year: Google favours recent content.',
  'Placer « {} » dans la corbeille ? Il ne sera plus visible sur le site.': 'Move “{}” to the bin? It will no longer be visible on the site.',
  'Article placé dans la corbeille. Il disparaîtra du site d’ici une à deux minutes.': 'Article moved to the bin. It will disappear from the site within one or two minutes.',
  'Article placé dans la corbeille.': 'Article moved to the bin.',

  /* — Catégories et états — */
  'Conseils': 'Tips',
  'Guides pratiques': 'How-to guides',
  'Professionnels': 'Professionals',
  'Particuliers': 'Homeowners',
  'Actualités': 'News',
  'Brouillon': 'Draft',
  'Programmé': 'Scheduled',
  'En ligne': 'Live',
  'Publié': 'Published',

  /* — Éditeur : barre, publication, champs — */
  'Chargement de l’article…': 'Loading the article…',
  'Article introuvable : il a peut-être été supprimé ou renommé.': 'Article not found: it may have been deleted or renamed.',
  'Note SEO :': 'SEO score:',
  'Note SEO : voir les actions à mener': 'SEO score: see the actions to take',
  'Voir sur le site': 'View on the site',
  'Enregistrer': 'Save',
  'Enregistrer le brouillon': 'Save draft',
  'Programmer': 'Schedule',
  'Mettre à jour': 'Update',
  'Publier': 'Publish',
  'Enregistrement…': 'Saving…',
  'Non enregistré': 'Not saved',
  'Une version non enregistrée de cet article a été retrouvée sur cet ordinateur (': 'An unsaved version of this article was found on this computer (',
  'Reprendre cette version': 'Restore this version',
  'Ignorer': 'Dismiss',
  'Titre de l’article': 'Article title',
  'Mode d’édition': 'Editing mode',
  'Écrire': 'Write',
  'Aperçu': 'Preview',
  'Rien à afficher pour l’instant.': 'Nothing to show yet.',
  'Mise en forme du texte sélectionné': 'Format the selected text',
  'Mettre en gras le texte sélectionné (Ctrl B)': 'Make the selected text bold (Ctrl B)',
  'Mettre en italique le texte sélectionné (Ctrl I)': 'Make the selected text italic (Ctrl I)',
  'Transformer le texte sélectionné en lien (Ctrl K)': 'Turn the selected text into a link (Ctrl K)',
  'G': 'B',
  'Gras': 'Bold',
  'Italique': 'Italic',
  'Lien': 'Link',
  'Contenu de l’article': 'Article content',
  'Ajouter un bloc': 'Add a block',
  'Le bloc s’ajoute sous celui où vous êtes en train d’écrire.': 'The block is added below the one you are writing in.',
  '{} mot': '{} word',
  '{} mots': '{} words',
  'Entrée': 'Enter',
  'Maj': 'Shift',
  'nouveau paragraphe ·': 'new paragraph ·',
  'retour à la ligne · sélectionnez du texte pour le mettre en gras ou en faire un lien': 'line break · select text to make it bold or turn it into a link',
  'Apparence dans Google': 'How it looks in Google',
  'Aperçu du résultat Google': 'Google result preview',
  'Expression clé principale': 'Main keyword',
  'ex. rideau lanière chambre froide': 'e.g. rideau lanière chambre froide',
  'La recherche Google que cet article doit gagner : 2 à 4 mots, différente pour chaque article.': 'The Google search this article should win: 2 to 4 words, different for each article.',
  'Titre pour Google': 'Title for Google',
  '(facultatif)': '(optional)',
  'Par défaut, le titre de l’article': 'Defaults to the article title',
  'Idéalement 50 à 60 caractères, l’expression clé au début. « | IsoRideaux » n’est pas ajouté automatiquement.': 'Ideally 50 to 60 characters, keyword first. “| IsoRideaux” is not added automatically.',
  'Description pour Google': 'Description for Google',
  '120 à 155 caractères : ce que le lecteur va apprendre, avec l’expression clé, et une incitation à cliquer.': '120 to 155 characters: what the reader will learn, with the keyword, and a reason to click.',
  'Description de l’article…': 'Article description…',
  'Adresse de la page': 'Page address',
  'Courte, en minuscules, avec l’expression clé. Remplie automatiquement d’après le titre.': 'Short, lowercase, with the keyword. Filled in automatically from the title.',
  'Courte, en minuscules, avec l’expression clé.': 'Short, lowercase, with the keyword.',
  'Courte, en minuscules, avec l’expression clé. Si vous la changez, l’ancienne adresse redirigera vers la nouvelle.': 'Short, lowercase, with the keyword. If you change it, the old address will redirect to the new one.',
  'Résumé': 'Summary',
  'Affiché sur les cartes d’articles. Sinon, le début de l’article est utilisé.': 'Shown on article cards. Otherwise, the start of the article is used.',
  'Publication': 'Publishing',
  'Date de publication': 'Publication date',
  'Vide : date du jour à la publication. Une date future programme l’article : les articles programmés sont mis en ligne chaque matin.': 'Empty: today’s date when published. A future date schedules the article: scheduled articles go live every morning.',
  'Catégorie': 'Category',
  'Image de couverture': 'Cover image',
  'Aucune image': 'No image',
  'Choisir une image': 'Choose an image',
  'Remplacer': 'Replace',
  'Retirer': 'Remove',
  'Envoi en cours…': 'Uploading…',
  'Recadrée au format paysage (1200 × 630 px) et compressée automatiquement.': 'Cropped to landscape (1200 × 630 px) and compressed automatically.',
  'Description de l’image': 'Image description',
  'ex. Rideau à lanières dans un entrepôt': 'e.g. Strip curtain in a warehouse',
  'Pour les malvoyants et Google : décrivez ce que montre l’image.': 'For visually impaired readers and Google: describe what the image shows.',
  'Analyse en cours…': 'Analysing…',
  'Insérer un lien': 'Insert a link',
  'Texte du lien': 'Link text',
  'Adresse': 'Address',
  '/professionnels/… ou https://…': '/professionnels/… or https://…',
  'Commencez à taper pour voir les pages du site et vos articles.': 'Start typing to see the site’s pages and your articles.',
  'Annuler': 'Cancel',
  'Insérer le lien': 'Insert link',
  'Article : {}': 'Article: {}',

  /* — Blocs — */
  'Paragraphe': 'Paragraph',
  'Intertitre': 'Heading',
  'Sous-intertitre': 'Subheading',
  'Liste': 'List',
  'Liste à puces': 'Bulleted list',
  'Liste numérotée': 'Numbered list',
  'Citation': 'Quote',
  'Citation / encadré': 'Quote / callout',
  'Image': 'Image',
  'Encart devis': 'Quote request box',
  'Mise en forme avancée': 'Advanced formatting',
  'Écrivez votre texte ici…': 'Write your text here…',
  'Intertitre : le thème de la partie qui suit': 'Heading: the topic of the section below',
  'Citation, témoignage ou point important…': 'Quote, testimonial or key point…',
  'Changer le type de bloc': 'Change the block type',
  'Type de bloc': 'Block type',
  'Monter le bloc': 'Move the block up',
  'Descendre le bloc': 'Move the block down',
  'Supprimer le bloc': 'Delete the block',
  'Supprimer ce bloc et son contenu ?': 'Delete this block and its content?',
  'ex. Rideau à lanières à l’entrée d’un garage': 'e.g. Strip curtain at a garage entrance',
  'Description de l’image (obligatoire pour Google)': 'Image description (required for Google)',
  'Remplacer l’image': 'Replace the image',
  'Envoi de l’image en cours…': 'Uploading the image…',
  'Échec de l’envoi : {}': 'Upload failed: {}',
  'Tableau ou mise en forme spéciale : laissez ce bloc tel quel si vous ne savez pas le modifier.': 'Table or special formatting: leave this block as it is if you are not sure how to edit it.',

  /* — Enregistrement et mise en ligne (messages du serveur compris) — */
  'Brouillon enregistré : il n’est pas visible sur le site.': 'Draft saved: it is not visible on the site.',
  'Article programmé : il sera mis en ligne le {}.': 'Article scheduled: it will go live on {}.',
  'Article enregistré.': 'Article saved.',
  '{} Mise en ligne en cours (environ une minute)…': '{} Publishing (about a minute)…',
  '{} C’est en ligne.': '{} It’s live.',
  '{} La mise en ligne prend plus de temps que prévu : vérifiez dans quelques minutes.': '{} Publishing is taking longer than expected: check again in a few minutes.',
  '{} (site local mis à jour)': '{} (local site updated)',
  'Le titre est obligatoire.': 'The title is required.',
  'Adresse invalide : lettres minuscules, chiffres et tirets uniquement (80 caractères max.).': 'Invalid address: lowercase letters, digits and hyphens only (80 characters max.).',
  'L’adresse « {} » est réservée : choisissez-en une autre.': 'The address “{}” is reserved: choose another one.',
  'Un autre article utilise déjà cette adresse.': 'Another article already uses this address.',
  'L’image doit être envoyée sur le site avec le bouton « Choisir une image ».': 'The image must be uploaded with the “Choose an image” button.',
  'Date de publication invalide.': 'Invalid publication date.',
  'Article trop long.': 'Article too long.',
  'Article introuvable : il a peut-être été supprimé.': 'Article not found: it may have been deleted.',
  'Article introuvable.': 'Article not found.',
  'Cet article a été modifié entre-temps (autre onglet ou autre personne). Copiez votre texte, rechargez la page, puis reportez vos changements.': 'This article was changed in the meantime (another tab or another person). Copy your text, reload the page, then reapply your changes.',
  'Certains champs sont à corriger.': 'Some fields need fixing.',
  'Image vide.': 'Empty image.',
  'Image trop lourde, même après compression (3 Mo maximum).': 'Image too large, even after compression (3 MB max).',
  'Image trop lourde (25 Mo maximum).': 'Image too large (25 MB max).',
  'Format non reconnu : utilisez une image JPEG, PNG ou WebP.': 'Unrecognised format: use a JPEG, PNG or WebP image.',
  'Lecture de l’image impossible.': 'Could not read the image.',
  'Requête refusée.': 'Request refused.',
  'Espace d’édition non configuré.': 'Editing area not configured.',
  'Session expirée : reconnectez-vous.': 'Session expired: please log in again.',
  'Dépôt GitHub inconnu : renseignez GITHUB_CONTENT_REPO.': 'Unknown GitHub repository: set GITHUB_CONTENT_REPO.',
  'Enregistrement impossible : la variable GITHUB_CONTENT_TOKEN n’est pas configurée sur Vercel.': 'Cannot save: the GITHUB_CONTENT_TOKEN variable is not set on Vercel.',
  'Format de requête attendu : JSON.': 'Expected request format: JSON.',
  'Requête trop volumineuse.': 'Request too large.',
  'Requête illisible.': 'Unreadable request.',
  'Erreur interne du serveur. Merci de réessayer.': 'Internal server error. Please try again.',
  'Connexion impossible : vérifiez votre accès à Internet.': 'Cannot connect: check your internet access.',
  'Erreur du serveur ({}).': 'Server error ({}).',

  /* — Note SEO — */
  'Très bien optimisé': 'Very well optimised',
  'Correct, quelques améliorations possibles': 'Good, a few possible improvements',
  'À améliorer': 'To improve',
  'Insuffisant': 'Insufficient',
  'À corriger': 'To fix',
  'Validé': 'Passed',
  'À corriger :': 'To fix:',
  'À améliorer :': 'To improve:',
  'Validé :': 'Passed:',
  '+ {}': '+ {}',
  'Expression clé': 'Keyword',
  'Titre et description': 'Title and description',
  'Contenu': 'Content',
  'Liens et conversion': 'Links and conversion',
  'Images': 'Images',
  '{} action à mener': '{} action to take',
  '{} actions à mener': '{} actions to take',
  '{} point validé': '{} check passed',
  '{} points validés': '{} checks passed',
  'Tout est en ordre : bravo !': 'Everything is in order: well done!',
  'Pages à lier :': 'Pages to link:',
  'Insérer un lien vers {} à l’endroit du curseur': 'Insert a link to {} at the cursor',
  'Ouvrir l’autre article': 'Open the other article',
  'Expression clé trop longue': 'Keyword too long',
  'Visez 2 à 4 mots, comme une vraie recherche Google (ex. « rideau lanière garage »).': 'Aim for 2 to 4 words, like a real Google search (e.g. “rideau lanière garage”).',
  'Expression clé : « {} »': 'Keyword: “{}”',
  'Expression clé déjà utilisée': 'Keyword already used',
  '« {} » vise la même recherche : les deux articles se concurrencent dans Google. Choisissez une expression différente, ou complétez plutôt l’article existant.': '“{}” targets the same search: the two articles compete in Google. Choose a different keyword, or expand the existing article instead.',
  'Expression clé propre à cet article': 'Keyword unique to this article',
  'Expression clé absente du titre': 'Keyword missing from the title',
  'Ajoutez « {} » dans le titre (ou le « Titre pour Google »), de préférence au début.': 'Add “{}” to the title (or the “Title for Google”), preferably at the start.',
  'Expression clé présente dans le titre': 'Keyword in the title',
  'Encore mieux : placez-la en tout début de titre.': 'Even better: put it at the very start of the title.',
  'Expression clé au début du titre': 'Keyword at the start of the title',
  'Expression clé absente de la description': 'Keyword missing from the description',
  'Glissez « {} » dans la description : Google l’affiche en gras dans les résultats.': 'Work “{}” into the description: Google shows it in bold in the results.',
  'Expression clé dans la description': 'Keyword in the description',
  'Expression clé absente de l’adresse': 'Keyword missing from the address',
  'Adresse conseillée : {}': 'Suggested address: {}',
  'Expression clé dans l’adresse': 'Keyword in the address',
  'Expression clé absente de l’introduction': 'Keyword missing from the introduction',
  'Citez « {} » dès le premier paragraphe : c’est ce que Google et le lecteur lisent en premier.': 'Mention “{}” in the first paragraph: it is what Google and readers read first.',
  'Expression clé dès l’introduction': 'Keyword in the introduction',
  'Expression clé absente des intertitres': 'Keyword missing from the headings',
  'Reprenez l’expression (ou une variante) dans au moins un intertitre H2.': 'Use the keyword (or a variant) in at least one H2 heading.',
  'Expression clé dans un intertitre': 'Keyword in a heading',
  'Expression exacte jamais employée dans le texte': 'Exact keyword never used in the text',
  'Utilisez « {} » telle quelle 2 ou 3 fois, naturellement.': 'Use “{}” as is 2 or 3 times, naturally.',
  'Expression clé trop répétée ({} fois)': 'Keyword repeated too often ({} times)',
  'Google peut y voir de la sur-optimisation : remplacez quelques occurrences par des synonymes.': 'Google may see it as over-optimisation: replace some occurrences with synonyms.',
  'Expression clé employée {} fois': 'Keyword used {} times',
  'Aucune expression clé': 'No keyword',
  'Indiquez la recherche Google que l’article doit gagner (ex. « rideau lanière garage ») : la moitié de l’analyse s’appuie dessus.': 'Enter the Google search the article should win (e.g. “rideau lanière garage”): half of the analysis relies on it.',
  'Titre manquant': 'Title missing',
  'Donnez un titre à l’article.': 'Give the article a title.',
  'Titre court ({} caractères)': 'Short title ({} characters)',
  'Ajoutez un bénéfice ou une précision : 30 à 60 caractères.': 'Add a benefit or a detail: 30 to 60 characters.',
  'Titre trop long ({} caractères)': 'Title too long ({} characters)',
  'Google le coupera après 60 caractères environ. Raccourcissez-le, ou remplissez « Titre pour Google ».': 'Google will cut it after about 60 characters. Shorten it, or fill in “Title for Google”.',
  'Titre un peu long ({} caractères)': 'Title a bit long ({} characters)',
  'Visez 60 caractères maximum, ou remplissez un « Titre pour Google » plus court.': 'Aim for 60 characters max, or fill in a shorter “Title for Google”.',
  'Longueur du titre idéale ({} caractères)': 'Ideal title length ({} characters)',
  'Description manquante': 'Description missing',
  'Sans elle, Google affiche un extrait choisi au hasard. Résumez l’article en 120 à 155 caractères.': 'Without it, Google shows a random snippet. Summarise the article in 120 to 155 characters.',
  'Description courte ({} caractères)': 'Short description ({} characters)',
  'Complétez-la jusqu’à 120 à 155 caractères : bénéfice pour le lecteur, puis incitation (« Découvrez… »).': 'Expand it to 120–155 characters: the reader’s benefit, then a call to action (“Find out…”).',
  'Description trop longue ({} caractères)': 'Description too long ({} characters)',
  'Google la coupera : restez sous 155 caractères.': 'Google will cut it: stay under 155 characters.',
  'Longueur de la description idéale ({} caractères)': 'Ideal description length ({} characters)',
  'Adresse longue ({} caractères)': 'Long address ({} characters)',
  'Gardez 3 à 6 mots, l’expression clé en tête.': 'Keep 3 to 6 words, keyword first.',
  'Adresse courte et lisible': 'Short, readable address',
  '{} : contenu complet': '{}: comprehensive content',
  '{} : un peu court': '{}: a bit short',
  'Visez 700 mots ou plus : exemples concrets, chiffres, cas clients, questions fréquentes.': 'Aim for 700 words or more: concrete examples, figures, customer cases, FAQs.',
  '{} : trop court pour se positionner': '{}: too short to rank',
  'Google privilégie les contenus qui répondent complètement à la question : visez 700 mots ou plus.': 'Google favours content that fully answers the question: aim for 700 words or more.',
  'Titre principal (H1) en double': 'Duplicate main title (H1)',
  'Le titre de l’article est déjà le titre principal : remplacez « # » par « ## » dans le texte.': 'The article title is already the main title: replace “#” with “##” in the text.',
  '{} intertitres H2 : texte bien structuré': '{} H2 headings: well-structured text',
  'Un seul intertitre': 'Only one heading',
  'Aucun intertitre': 'No headings',
  'Découpez le texte avec des intertitres (bloc « Intertitre ») tous les 200 à 300 mots : lecture plus facile, et Google comprend mieux le sujet.': 'Break up the text with headings (Heading block) every 200 to 300 words: easier to read, and Google understands the topic better.',
  'Niveaux d’intertitres sautés': 'Skipped heading levels',
  'Un H3 doit suivre un H2 (et un H4 un H3) : ne sautez pas de niveau.': 'An H3 must follow an H2 (and an H4 an H3): do not skip levels.',
  'Au moins un intertitre sous forme de question': 'At least one heading phrased as a question',
  'Aucun intertitre sous forme de question': 'No heading phrased as a question',
  'Ajoutez-en un (« Quelle épaisseur choisir ? ») : c’est ainsi que vos clients cherchent, et Google peut le reprendre dans « Autres questions posées ».': 'Add one (“Quelle épaisseur choisir ?”): that is how your customers search, and Google may feature it in “People also ask”.',
  '{} trop long': '{} too long',
  '{} trop longs': '{} too long',
  'Sur mobile, un bloc de plus de 120 mots décourage : coupez en paragraphes de 3 ou 4 phrases.': 'On mobile, a block of more than 120 words is off-putting: split it into paragraphs of 3 or 4 sentences.',
  'Paragraphes aérés': 'Well-spaced paragraphs',
  '{} phrases sur {} dépassent 25 mots': '{} of {} sentences exceed 25 words',
  'Raccourcissez les plus longues : une idée par phrase.': 'Shorten the longest ones: one idea per sentence.',
  'Phrases faciles à lire': 'Easy-to-read sentences',
  '{} vers d’autres pages du site': '{} to other pages of the site',
  'Un seul lien vers le site': 'Only one link to the site',
  'Aucun lien vers les autres pages du site': 'No links to other pages of the site',
  'Ajoutez 2 ou 3 liens vers vos pages produits ou d’autres articles : Google découvre et valorise mieux vos pages, et le lecteur avance vers l’achat.': 'Add 2 or 3 links to your product pages or other articles: Google finds and values your pages better, and readers move towards buying.',
  '{} vers un article introuvable': '{} to an article that does not exist',
  'Appel à demander un devis présent': 'Call to request a quote present',
  'Aucun appel à demander un devis dans le texte': 'No call to request a quote in the text',
  'Ajoutez un encart devis (bloc « Encart devis ») au milieu ou à la fin : un lecteur convaincu doit pouvoir demander un prix en un clic.': 'Add a quote request box (“Quote request box” block) in the middle or at the end: a convinced reader must be able to ask for a price in one click.',
  'Pas d’image de couverture': 'No cover image',
  'Elle illustre l’article dans la liste du blog et lors des partages sur les réseaux sociaux.': 'It illustrates the article in the blog list and when shared on social media.',
  'Image de couverture sans description': 'Cover image without a description',
  'Décrivez ce qu’elle montre (champ « Description de l’image »).': 'Describe what it shows (“Image description” field).',
  'Image de couverture décrite': 'Cover image described',
  '{} sans description': '{} without a description',
  'Remplissez le champ « Description de l’image » sous chaque image.': 'Fill in the “Image description” field under each image.',
  'Aucune image dans le texte': 'No images in the text',
  'Illustrez avec une ou deux photos de vos installations (bloc « Image »).': 'Illustrate with one or two photos of your installations (“Image” block).',
  '{} avec description': '{} with a description',
  'Pas mis à jour depuis {} mois': 'Not updated for {} months',
  'Relisez l’article, actualisez chiffres et exemples, puis enregistrez : Google favorise les contenus à jour.': 'Reread the article, update figures and examples, then save: Google favours up-to-date content.',

  /* — Unités (parties variables des messages) — */
  '{} paragraphe': '{} paragraph',
  '{} paragraphes': '{} paragraphs',
  '{} lien': '{} link',
  '{} liens': '{} links',
  '{} image': '{} image',
  '{} images': '{} images',

  /* — Pages du site proposées en lien — */
  'Kits rideaux à lanières': 'Strip curtain kits',
  'Chambre froide': 'Cold room',
  'Rideaux de soudure': 'Welding curtains',
  'Lanières de remplacement': 'Replacement strips',
  'Rouleaux, rails & accessoires': 'Rolls, rails & accessories',
  'Espace professionnels': 'Professionals area',
  'Espace particuliers': 'Homeowners area',
  'Guide de pose': 'Installation guide',
  'Demande de devis': 'Quote request',
  'Contact': 'Contact',
};

/* --------------------------------------------------------------------------
   Traduction
   -------------------------------------------------------------------------- */

const normalize = (text) => text.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const exact = new Map();
const patterns = [];
for (const [fr, en] of Object.entries(EN)) {
  const key = normalize(fr);
  if (key.includes('{}')) {
    const source = key.split('{}').map(escapeRegExp).join('([\\s\\S]+?)');
    patterns.push({ re: new RegExp(`^${source}$`), en, weight: key.replace(/\{\}/g, '').length });
  } else {
    exact.set(key, en);
  }
}
patterns.sort((a, b) => b.weight - a.weight);

const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];
const FRENCH_DATE = new RegExp(
  `^(\\d{1,2})(?:er)? (${MONTHS.join('|')}) (\\d{4})(?: à (\\d{1,2})[:h](\\d{2}))?$`,
);

function translateDate(text) {
  const match = text.match(FRENCH_DATE);
  if (!match) return undefined;
  const [, day, month, year, hour, minute] = match;
  const date = new Date(
    Number(year),
    MONTHS.indexOf(month),
    Number(day),
    Number(hour ?? 0),
    Number(minute ?? 0),
  );
  return date.toLocaleString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(hour ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

function lookup(core) {
  const hit = exact.get(core) ?? translateDate(core);
  if (hit !== undefined) return hit;
  for (const { re, en } of patterns) {
    const match = core.match(re);
    if (match) {
      let index = 1;
      return en.replace(/\{\}/g, () => t(match[index++]));
    }
  }
  return undefined;
}

/** Texte de l'interface dans la langue choisie (inchangé s'il n'est pas au dictionnaire). */
export function t(text) {
  if (lang === 'fr' || typeof text !== 'string' || !/[A-Za-zÀ-ÿ]/.test(text)) return text;
  const [, before, core, after] = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const hit = lookup(normalize(core));
  return hit === undefined ? text : `${before}${hit}${after}`;
}

/* --------------------------------------------------------------------------
   Traduction de la page (y compris ce que les scripts ajoutent ensuite)
   -------------------------------------------------------------------------- */

const ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'label', 'data-placeholder'];
// Contenu de l'article : jamais traduit.
const SKIP = '[contenteditable], .md-editor__preview, [data-no-i18n], script, style, textarea';

function translateText(node) {
  if (node.parentElement?.closest(SKIP)) return;
  const translated = t(node.data);
  if (translated !== node.data) node.data = translated;
}

function translateAttributes(element) {
  if (element.closest('.md-editor__preview, [data-no-i18n]')) return;
  ATTRIBUTES.forEach((name) => {
    const value = element.getAttribute(name);
    if (!value) return;
    const translated = t(value);
    if (translated !== value) element.setAttribute(name, translated);
  });
}

function translateTree(root) {
  if (root.nodeType === Node.TEXT_NODE) return translateText(root);
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  translateAttributes(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) translateText(node);
    else translateAttributes(node);
  }
}

function initLanguageSwitch() {
  document.querySelectorAll('[data-lang]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
    button.addEventListener('click', () => {
      if (button.dataset.lang === lang) return;
      try {
        localStorage.setItem(STORAGE_KEY, button.dataset.lang);
      } catch {
        // Stockage indisponible : la langue par défaut reste affichée.
      }
      window.location.reload();
    });
  });
}

initLanguageSwitch();
document.documentElement.lang = lang;
if (lang === 'en') {
  document.title = t(document.title);
  translateTree(document.body);
  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'characterData') translateText(mutation.target);
      else if (mutation.type === 'attributes') translateAttributes(mutation.target);
      else mutation.addedNodes.forEach(translateTree);
    });
  }).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRIBUTES,
  });
}
