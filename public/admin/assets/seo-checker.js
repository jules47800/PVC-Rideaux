/**
 * Vérification SEO d'un article du blog.
 *
 * Utilisée en direct dans l'éditeur (editor.js) et sur le tableau de bord
 * (dashboard.js). Chaque point de contrôle a :
 *   - un état : « good » (vert), « improve » (orange) ou « bad » (rouge) ;
 *   - un poids (importance pour le référencement) ;
 *   - un titre et, s'il y a lieu, l'action concrète à mener, en français simple.
 * La note sur 100 est la moyenne pondérée des états (vert = 1, orange = 0,5, rouge = 0).
 *
 * L'analyse lit le Markdown de l'article : aucune requête au serveur.
 */

/** Pages du site vers lesquelles un article peut renvoyer (maillage interne). */
export const SITE_PAGES = [
  {
    url: '/professionnels/kit-rideau-lanieres/',
    label: 'Kits rideaux à lanières',
    terms: ['kit', 'rideau a laniere', 'porte a laniere', 'sur mesure'],
  },
  {
    url: '/professionnels/chambre-froide/',
    label: 'Chambre froide',
    terms: ['chambre froide', 'froid', 'polaire', 'refrigere', 'congel'],
  },
  {
    url: '/professionnels/rideaux-soudure/',
    label: 'Rideaux de soudure',
    terms: ['soudure', 'soudeur', '25980'],
  },
  {
    url: '/professionnels/lanieres-pvc/',
    label: 'Lanières de remplacement',
    terms: ['remplacement', 'remplacer', 'nervure', 'laniere au metre'],
  },
  {
    url: '/professionnels/rouleaux-rails-accessoires/',
    label: 'Rouleaux, rails & accessoires',
    terms: ['rouleau', 'rail', 'barre', 'crochet', 'accessoire'],
  },
  {
    url: '/professionnels/',
    label: 'Espace professionnels',
    terms: ['industrie', 'industriel', 'entrepot', 'logistique', 'quai', 'usine', 'entreprise'],
  },
  {
    url: '/particuliers/',
    label: 'Espace particuliers',
    terms: ['garage', 'maison', 'particulier', 'ecurie', 'chenil', 'veranda', 'insecte', 'mouche'],
  },
  {
    url: '/guide-installation/',
    label: 'Guide de pose',
    terms: ['installer', 'installation', 'pose', 'poser', 'fixation', 'mesurer'],
  },
  {
    url: '/devis/',
    label: 'Demande de devis',
    terms: ['devis', 'prix', 'tarif', 'cout', 'budget'],
  },
  { url: '/contact/', label: 'Contact', terms: ['contact', 'conseil'] },
];

const THRESHOLDS = {
  titleMin: 30,
  titleMax: 60,
  titleHardMax: 70,
  descriptionMin: 120,
  descriptionMax: 158,
  slugMax: 60,
  wordsGood: 700,
  wordsMin: 400,
  densityMax: 3,
  paragraphMaxWords: 120,
  sentenceMaxWords: 25,
  longSentencesRatio: 0.25,
  internalLinksGood: 2,
  staleMonths: 12,
};

const STATUS_VALUE = { good: 1, improve: 0.5, bad: 0 };

/** Poids cumulé des contrôles liés à l'expression clé (expression, unicité, titre, description, adresse, intro, intertitre, densité). */
const KEYWORD_DEPENDENT_WEIGHT = 3 + 3 + 3 + 2 + 1 + 2 + 1 + 1;

export const GROUPS = {
  keyword: 'Expression clé',
  google: 'Titre et description',
  content: 'Contenu',
  links: 'Liens et conversion',
  images: 'Images',
};

const STOPWORDS = new Set(
  'le la les l un une des de du d en et a au aux pour par sur avec sans dans ou vos votre nos notre son sa ses ce cette ces que qui quoi est sont pas plus se s qu y il elle on vous nous comment pourquoi quel quelle quels quelles'.split(
    ' ',
  ),
);

/* --------------------------------------------------------------------------
   Outils texte
   -------------------------------------------------------------------------- */

/** Minuscules, sans accents ni ponctuation : « L’Été ! » → « l ete » */
export function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Même règle que slugify() en PHP (lib/helpers.php). */
export function slugify(text, maxLength = 80) {
  let slug = normalize(text).replace(/ /g, '-');
  if (slug.length > maxLength) {
    slug = slug.slice(0, maxLength).replace(/-+$/, '');
    const lastDash = slug.lastIndexOf('-');
    if (lastDash > maxLength * 0.6) slug = slug.slice(0, lastDash);
  }
  return slug;
}

const words = (text) => normalize(text).split(' ').filter(Boolean);

/** Singulier approximatif (« rideaux » → « rideau », « lanières » → « laniere »). */
const stem = (word) => (word.length > 3 ? word.replace(/[sx]$/, '') : word);

const stemmed = (text) => ` ${words(text).map(stem).join(' ')} `;

/** Mots significatifs d'une expression (sans « de », « la »…). */
const significantTerms = (keyword) =>
  words(keyword)
    .filter((word) => !STOPWORDS.has(word))
    .map(stem);

/**
 * L'expression clé figure-t-elle dans le texte ?
 * @returns {'exact'|'partial'|'none'} exacte, tous ses mots importants présents, ou absente
 */
export function keywordPresence(text, keyword) {
  const phrase = stemmed(keyword);
  if (phrase.trim() === '') return 'none';
  const haystack = stemmed(text);
  if (haystack.includes(phrase)) return 'exact';
  const terms = significantTerms(keyword);
  const present = new Set(haystack.trim().split(' '));
  return terms.length > 0 && terms.every((term) => present.has(term)) ? 'partial' : 'none';
}

function countOccurrences(text, keyword) {
  const phrase = stemmed(keyword);
  if (phrase.trim() === '') return 0;
  const haystack = stemmed(text);
  let count = 0;
  for (
    let index = haystack.indexOf(phrase);
    index !== -1;
    index = haystack.indexOf(phrase, index + 1)
  ) {
    count += 1;
  }
  return count;
}

const countWords = (text) => text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;

const plural = (count, singular, pluralForm = `${singular}s`) =>
  `${count} ${count > 1 ? pluralForm : singular}`;

/* --------------------------------------------------------------------------
   Lecture du Markdown
   -------------------------------------------------------------------------- */

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const IMAGE_RE = /!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
const LINK_RE = /(?<!!)\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
const BLOCK_START_RE = /^\s*(#{1,6}\s|[-*+]\s|\d+[.)]\s|>|\||```|\[\[)/;

/** Texte brut d'un fragment Markdown (liens réduits à leur texte, images retirées). */
function toPlainText(markdown) {
  return markdown
    .replace(IMAGE_RE, ' ')
    .replace(LINK_RE, '$1')
    .replace(/\[\[[a-z]+\]\]/g, ' ')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+/gm, '')
    .replace(/[*_`|]/g, ' ');
}

/** Structure de l'article utile à l'analyse. */
export function parseMarkdown(markdown) {
  const source = String(markdown ?? '').replace(/\r\n?/g, '\n');
  const lines = source.split('\n');

  const headings = lines
    .map((line) => line.match(HEADING_RE))
    .filter(Boolean)
    .map((match) => ({ level: match[1].length, text: match[2] }));

  const images = [...source.matchAll(IMAGE_RE)].map((match) => ({
    alt: match[1].trim(),
    src: match[2],
  }));
  const links = [...source.matchAll(LINK_RE)].map((match) => ({ text: match[1], url: match[2] }));

  // Paragraphes : blocs de lignes consécutives qui ne sont ni titres, ni listes, ni citations…
  const paragraphs = [];
  let current = [];
  const flush = () => {
    if (current.length) paragraphs.push(toPlainText(current.join(' ')).trim());
    current = [];
  };
  lines.forEach((line) => {
    if (line.trim() === '' || BLOCK_START_RE.test(line)) flush();
    else current.push(line);
  });
  flush();

  const plainText = toPlainText(source).replace(/\s+/g, ' ').trim();
  const firstHeadingIndex = lines.findIndex((line) => HEADING_RE.test(line));
  const introSource =
    firstHeadingIndex === -1 ? source : lines.slice(0, firstHeadingIndex).join('\n');
  const intro = toPlainText(introSource).replace(/\s+/g, ' ').trim();

  return {
    headings,
    images,
    links,
    paragraphs: paragraphs.filter(Boolean),
    plainText,
    intro: intro || plainText.split(' ').slice(0, 100).join(' '),
    wordCount: countWords(plainText),
    hasQuoteBlock: /^\s*\[\[devis\]\]\s*$/m.test(source),
  };
}

/* --------------------------------------------------------------------------
   Analyse
   -------------------------------------------------------------------------- */

/**
 * @param {object} article  champs du formulaire : title, seoTitle, description, keyword,
 *                          slug, content, cover {src, alt}, status, updatedAt
 * @param {{ otherArticles?: object[], now?: Date }} [context]
 *   otherArticles : les autres articles du blog (doublons, liens vers le blog)
 * @returns {{ score: number, level: object, checks: object[], wordCount: number }}
 */
export function analyzeArticle(article, { otherArticles = [], now = new Date() } = {}) {
  const checks = [];
  const add = (group, id, weight, status, title, detail = '', extra = {}) =>
    checks.push({ group, id, weight, status, title, detail, ...extra });

  const doc = parseMarkdown(article.content);
  const keyword = (article.keyword ?? '').trim();
  const seoTitle = (article.seoTitle || article.title || '').trim();
  const description = (article.description ?? '').trim();
  const slug = (article.slug || slugify(article.title ?? '')).trim();
  const others = otherArticles.filter((other) => other.slug !== article.slug);

  /* — Expression clé — */
  if (keyword) {
    if (words(keyword).length > 6) {
      add(
        'keyword',
        'keyword',
        3,
        'improve',
        'Expression clé trop longue',
        'Visez 2 à 4 mots, comme une vraie recherche Google (ex. « rideau lanière garage »).',
      );
    } else {
      add('keyword', 'keyword', 3, 'good', `Expression clé : « ${keyword} »`);
    }

    const duplicate = others.find((other) => normalize(other.keyword ?? '') === normalize(keyword));
    if (duplicate) {
      add(
        'keyword',
        'keyword-unique',
        3,
        'bad',
        'Expression clé déjà utilisée',
        `« ${duplicate.title} » vise la même recherche : les deux articles se concurrencent dans Google. Choisissez une expression différente, ou complétez plutôt l’article existant.`,
        {
          link: {
            url: `/admin/edit.php?slug=${encodeURIComponent(duplicate.slug)}`,
            label: 'Ouvrir l’autre article',
          },
        },
      );
    } else {
      add('keyword', 'keyword-unique', 3, 'good', 'Expression clé propre à cet article');
    }

    const titleStart = seoTitle
      .split(/\s+/)
      .slice(0, words(keyword).length + 3)
      .join(' ');
    if (keywordPresence(seoTitle, keyword) === 'none') {
      add(
        'google',
        'keyword-title',
        3,
        'bad',
        'Expression clé absente du titre',
        `Ajoutez « ${keyword} » dans le titre (ou le « Titre pour Google »), de préférence au début.`,
      );
    } else if (keywordPresence(titleStart, keyword) === 'none') {
      add(
        'google',
        'keyword-title',
        3,
        'good',
        'Expression clé présente dans le titre',
        'Encore mieux : placez-la en tout début de titre.',
      );
    } else {
      add('google', 'keyword-title', 3, 'good', 'Expression clé au début du titre');
    }

    if (keywordPresence(description, keyword) === 'none') {
      add(
        'google',
        'keyword-description',
        2,
        'improve',
        'Expression clé absente de la description',
        `Glissez « ${keyword} » dans la description : Google l’affiche en gras dans les résultats.`,
      );
    } else {
      add('google', 'keyword-description', 2, 'good', 'Expression clé dans la description');
    }

    if (keywordPresence(slug.replace(/-/g, ' '), keyword) === 'none') {
      add(
        'google',
        'keyword-slug',
        1,
        'improve',
        'Expression clé absente de l’adresse',
        `Adresse conseillée : /blog/${slugify(keyword)}/`,
      );
    } else {
      add('google', 'keyword-slug', 1, 'good', 'Expression clé dans l’adresse');
    }

    if (keywordPresence(doc.intro, keyword) === 'none') {
      add(
        'content',
        'keyword-intro',
        2,
        'improve',
        'Expression clé absente de l’introduction',
        `Citez « ${keyword} » dès le premier paragraphe : c’est ce que Google et le lecteur lisent en premier.`,
      );
    } else {
      add('content', 'keyword-intro', 2, 'good', 'Expression clé dès l’introduction');
    }

    const headingTexts = doc.headings
      .filter((heading) => heading.level <= 3)
      .map((heading) => heading.text)
      .join(' . ');
    if (keywordPresence(headingTexts, keyword) === 'none') {
      add(
        'content',
        'keyword-heading',
        1,
        'improve',
        'Expression clé absente des intertitres',
        'Reprenez l’expression (ou une variante) dans au moins un intertitre H2.',
      );
    } else {
      add('content', 'keyword-heading', 1, 'good', 'Expression clé dans un intertitre');
    }

    const occurrences = countOccurrences(doc.plainText, keyword);
    // Densité : occurrences pour 100 mots (comme les outils SEO courants).
    const density = doc.wordCount ? (occurrences / doc.wordCount) * 100 : 0;
    if (occurrences === 0) {
      add(
        'content',
        'keyword-density',
        1,
        'improve',
        'Expression exacte jamais employée dans le texte',
        `Utilisez « ${keyword} » telle quelle 2 ou 3 fois, naturellement.`,
      );
    } else if (density > THRESHOLDS.densityMax) {
      add(
        'content',
        'keyword-density',
        1,
        'improve',
        `Expression clé trop répétée (${occurrences} fois)`,
        'Google peut y voir de la sur-optimisation : remplacez quelques occurrences par des synonymes.',
      );
    } else {
      add('content', 'keyword-density', 1, 'good', `Expression clé employée ${occurrences} fois`);
    }
  } else {
    // Sans expression clé, les contrôles qui en dépendent comptent comme non remplis :
    // ce point pèse autant qu'eux réunis.
    add(
      'keyword',
      'keyword',
      KEYWORD_DEPENDENT_WEIGHT,
      'bad',
      'Aucune expression clé',
      'Indiquez la recherche Google que l’article doit gagner (ex. « rideau lanière garage ») : la moitié de l’analyse s’appuie dessus.',
    );
  }

  /* — Titre, description, adresse — */
  const titleLength = seoTitle.length;
  if (titleLength === 0) {
    add('google', 'title-length', 2, 'bad', 'Titre manquant', 'Donnez un titre à l’article.');
  } else if (titleLength < THRESHOLDS.titleMin) {
    add(
      'google',
      'title-length',
      2,
      'improve',
      `Titre court (${titleLength} caractères)`,
      'Ajoutez un bénéfice ou une précision : 30 à 60 caractères.',
    );
  } else if (titleLength > THRESHOLDS.titleHardMax) {
    add(
      'google',
      'title-length',
      2,
      'bad',
      `Titre trop long (${titleLength} caractères)`,
      'Google le coupera après 60 caractères environ. Raccourcissez-le, ou remplissez « Titre pour Google ».',
    );
  } else if (titleLength > THRESHOLDS.titleMax) {
    add(
      'google',
      'title-length',
      2,
      'improve',
      `Titre un peu long (${titleLength} caractères)`,
      'Visez 60 caractères maximum, ou remplissez un « Titre pour Google » plus court.',
    );
  } else {
    add(
      'google',
      'title-length',
      2,
      'good',
      `Longueur du titre idéale (${titleLength} caractères)`,
    );
  }

  const descriptionLength = description.length;
  if (descriptionLength === 0) {
    add(
      'google',
      'description',
      2,
      'bad',
      'Description manquante',
      'Sans elle, Google affiche un extrait choisi au hasard. Résumez l’article en 120 à 155 caractères.',
    );
  } else if (descriptionLength < THRESHOLDS.descriptionMin) {
    add(
      'google',
      'description',
      2,
      'improve',
      `Description courte (${descriptionLength} caractères)`,
      'Complétez-la jusqu’à 120 à 155 caractères : bénéfice pour le lecteur, puis incitation (« Découvrez… »).',
    );
  } else if (descriptionLength > THRESHOLDS.descriptionMax) {
    add(
      'google',
      'description',
      2,
      'improve',
      `Description trop longue (${descriptionLength} caractères)`,
      'Google la coupera : restez sous 155 caractères.',
    );
  } else {
    add(
      'google',
      'description',
      2,
      'good',
      `Longueur de la description idéale (${descriptionLength} caractères)`,
    );
  }

  if (slug.length > THRESHOLDS.slugMax) {
    add(
      'google',
      'slug-length',
      1,
      'improve',
      `Adresse longue (${slug.length} caractères)`,
      'Gardez 3 à 6 mots, l’expression clé en tête.',
    );
  } else {
    add('google', 'slug-length', 1, 'good', 'Adresse courte et lisible');
  }

  /* — Contenu — */
  if (doc.wordCount >= THRESHOLDS.wordsGood) {
    add('content', 'length', 3, 'good', `${doc.wordCount} mots : contenu complet`);
  } else if (doc.wordCount >= THRESHOLDS.wordsMin) {
    add(
      'content',
      'length',
      3,
      'improve',
      `${doc.wordCount} mots : un peu court`,
      'Visez 700 mots ou plus : exemples concrets, chiffres, cas clients, questions fréquentes.',
    );
  } else {
    add(
      'content',
      'length',
      3,
      'bad',
      `${plural(doc.wordCount, 'mot')} : trop court pour se positionner`,
      'Google privilégie les contenus qui répondent complètement à la question : visez 700 mots ou plus.',
    );
  }

  const h1 = doc.headings.filter((heading) => heading.level === 1);
  const h2 = doc.headings.filter((heading) => heading.level === 2);
  if (h1.length) {
    add(
      'content',
      'no-h1',
      2,
      'bad',
      'Titre principal (H1) en double',
      'Le titre de l’article est déjà le titre principal : remplacez « # » par « ## » dans le texte.',
    );
  }

  if (h2.length >= 2) {
    add('content', 'headings', 2, 'good', `${h2.length} intertitres H2 : texte bien structuré`);
  } else {
    add(
      'content',
      'headings',
      2,
      h2.length === 1 ? 'improve' : 'bad',
      h2.length === 1 ? 'Un seul intertitre' : 'Aucun intertitre',
      'Découpez le texte avec des intertitres (bouton H2) tous les 200 à 300 mots : lecture plus facile, et Google comprend mieux le sujet.',
    );
  }

  const orderProblem = doc.headings.some((heading, index) => {
    const previousLevel = index === 0 ? 1 : doc.headings[index - 1].level;
    return heading.level > previousLevel + 1;
  });
  if (orderProblem) {
    add(
      'content',
      'heading-order',
      1,
      'improve',
      'Niveaux d’intertitres sautés',
      'Un H3 doit suivre un H2 (et un H4 un H3) : ne sautez pas de niveau.',
    );
  }

  if (doc.headings.some((heading) => heading.text.trim().endsWith('?'))) {
    add('content', 'question', 1, 'good', 'Au moins un intertitre sous forme de question');
  } else {
    add(
      'content',
      'question',
      1,
      'improve',
      'Aucun intertitre sous forme de question',
      'Ajoutez-en un (« Quelle épaisseur choisir ? ») : c’est ainsi que vos clients cherchent, et Google peut le reprendre dans « Autres questions posées ».',
    );
  }

  const longParagraphs = doc.paragraphs.filter(
    (paragraph) => countWords(paragraph) > THRESHOLDS.paragraphMaxWords,
  ).length;
  if (longParagraphs) {
    add(
      'content',
      'paragraphs',
      1,
      'improve',
      `${plural(longParagraphs, 'paragraphe')} trop long${longParagraphs > 1 ? 's' : ''}`,
      'Sur mobile, un bloc de plus de 120 mots décourage : coupez en paragraphes de 3 ou 4 phrases.',
    );
  } else if (doc.wordCount > 0) {
    add('content', 'paragraphs', 1, 'good', 'Paragraphes aérés');
  }

  const sentences = doc.paragraphs
    .flatMap((paragraph) => paragraph.split(/(?<=[.!?…])\s+/))
    .filter((sentence) => countWords(sentence) > 0);
  const longSentences = sentences.filter(
    (sentence) => countWords(sentence) > THRESHOLDS.sentenceMaxWords,
  ).length;
  if (sentences.length >= 5 && longSentences / sentences.length > THRESHOLDS.longSentencesRatio) {
    add(
      'content',
      'sentences',
      1,
      'improve',
      `${longSentences} phrases sur ${sentences.length} dépassent 25 mots`,
      'Raccourcissez les plus longues : une idée par phrase.',
    );
  } else if (sentences.length >= 5) {
    add('content', 'sentences', 1, 'good', 'Phrases faciles à lire');
  }

  /* — Liens et conversion — */
  const internalLinks = doc.links.filter(
    (link) => link.url.startsWith('/') || /^https?:\/\/(www\.)?isorideaux\.fr/i.test(link.url),
  );
  const linkedPaths = new Set(
    internalLinks.map((link) => link.url.replace(/^https?:\/\/[^/]+/i, '').split(/[?#]/)[0]),
  );
  const contentWords = stemmed(`${doc.plainText} ${keyword}`);
  const suggestions = [
    ...SITE_PAGES.filter((page) => page.url !== '/devis/' && page.url !== '/contact/'),
    ...others
      .filter((other) => other.state === 'published')
      .map((other) => ({
        url: `/blog/${other.slug}/`,
        label: other.title,
        terms: [other.keyword].filter(Boolean),
      })),
  ]
    .filter((page) => !linkedPaths.has(page.url))
    .filter((page) => page.terms.some((term) => contentWords.includes(stemmed(term))))
    .slice(0, 4)
    .map(({ url, label }) => ({ url, label }));

  if (internalLinks.length >= THRESHOLDS.internalLinksGood) {
    add(
      'links',
      'internal-links',
      2,
      'good',
      `${plural(internalLinks.length, 'lien')} vers d’autres pages du site`,
    );
  } else {
    add(
      'links',
      'internal-links',
      2,
      internalLinks.length === 1 ? 'improve' : 'bad',
      internalLinks.length === 1
        ? 'Un seul lien vers le site'
        : 'Aucun lien vers les autres pages du site',
      'Ajoutez 2 ou 3 liens vers vos pages produits ou d’autres articles : Google découvre et valorise mieux vos pages, et le lecteur avance vers l’achat.',
      { suggestions },
    );
  }

  const blogSlugs = new Set(otherArticles.map((other) => other.slug));
  const brokenLinks = internalLinks.filter((link) => {
    const match = link.url.match(/^\/blog\/([a-z0-9-]+)\/?$/);
    return match && !blogSlugs.has(match[1]) && match[1] !== article.slug;
  });
  if (brokenLinks.length) {
    add(
      'links',
      'broken-links',
      2,
      'bad',
      `${plural(brokenLinks.length, 'lien')} vers un article introuvable`,
      `Vérifiez : ${brokenLinks.map((link) => link.url).join(', ')}`,
    );
  }

  if (doc.hasQuoteBlock || linkedPaths.has('/devis/')) {
    add('links', 'cta', 2, 'good', 'Appel à demander un devis présent');
  } else {
    add(
      'links',
      'cta',
      2,
      'improve',
      'Aucun appel à demander un devis dans le texte',
      'Ajoutez un encart devis (bouton « + Encart devis ») au milieu ou à la fin : un lecteur convaincu doit pouvoir demander un prix en un clic.',
    );
  }

  /* — Images — */
  const coverSrc = article.cover?.src ?? '';
  const coverAlt = (article.cover?.alt ?? '').trim();
  if (!coverSrc) {
    add(
      'images',
      'cover',
      1,
      'improve',
      'Pas d’image de couverture',
      'Elle illustre l’article dans la liste du blog et lors des partages sur les réseaux sociaux.',
    );
  } else if (!coverAlt) {
    add(
      'images',
      'cover',
      1,
      'improve',
      'Image de couverture sans description',
      'Décrivez ce qu’elle montre (champ « Description de l’image »).',
    );
  } else {
    add('images', 'cover', 1, 'good', 'Image de couverture décrite');
  }

  const imagesWithoutAlt = doc.images.filter((image) => !image.alt).length;
  if (imagesWithoutAlt) {
    add(
      'images',
      'image-alt',
      1,
      'improve',
      `${plural(imagesWithoutAlt, 'image')} sans description`,
      'Écrivez la description entre les crochets : ![Rideau à lanières dans un garage](…)',
    );
  } else if (doc.images.length === 0 && doc.wordCount >= THRESHOLDS.wordsMin) {
    add(
      'images',
      'image-alt',
      1,
      'improve',
      'Aucune image dans le texte',
      'Illustrez avec une ou deux photos de vos installations (bouton « Image »).',
    );
  } else if (doc.images.length) {
    add('images', 'image-alt', 1, 'good', `${plural(doc.images.length, 'image')} avec description`);
  }

  /* — Fraîcheur (articles en ligne) — */
  if (article.status === 'published' && article.updatedAt) {
    const months = (now - new Date(article.updatedAt)) / (1000 * 60 * 60 * 24 * 30.4);
    if (months > THRESHOLDS.staleMonths) {
      add(
        'content',
        'freshness',
        1,
        'improve',
        `Pas mis à jour depuis ${Math.floor(months)} mois`,
        'Relisez l’article, actualisez chiffres et exemples, puis enregistrez : Google favorise les contenus à jour.',
      );
    }
  }

  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
  const earned = checks.reduce((sum, check) => sum + check.weight * STATUS_VALUE[check.status], 0);
  const score = totalWeight ? Math.round((earned / totalWeight) * 100) : 0;

  return { score, level: scoreLevel(score), checks, wordCount: doc.wordCount };
}

/** Appréciation d'une note. */
export function scoreLevel(score) {
  if (score >= 80) return { key: 'good', label: 'Très bien optimisé' };
  if (score >= 60) return { key: 'ok', label: 'Correct, quelques améliorations possibles' };
  if (score >= 40) return { key: 'improve', label: 'À améliorer' };
  return { key: 'bad', label: 'Insuffisant' };
}

/** Points à traiter, du plus important au moins important. */
export function prioritizedActions(checks) {
  const severity = { bad: 0, improve: 1 };
  return checks
    .filter((check) => check.status !== 'good')
    .sort((a, b) => severity[a.status] - severity[b.status] || b.weight - a.weight);
}
