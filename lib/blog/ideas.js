/**
 * Idées d'articles proposées dans l'espace d'édition (tableau de bord).
 *
 * Chaque idée vise une recherche Google précise (« keyword ») et suit un plan
 * prêt à remplir. Les expressions sont choisies d'après le vocabulaire des
 * clients et des concurrents : leurs volumes de recherche restent à valider
 * (Google Search Console, Keyword Planner, Ubersuggest…) avant rédaction.
 *
 * Pour en ajouter : copier un bloc, garder une expression clé différente de
 * celles des articles existants (sinon les pages se concurrencent).
 */
import { normalizeArticle, normalizeText } from './model.js';

export const ARTICLE_IDEAS = [
  {
    title: 'Quelle épaisseur de lanière PVC choisir ? Le guide selon votre ouverture',
    keyword: 'épaisseur lanière pvc',
    category: 'guides',
    why: 'Question n° 1 avant achat : capte des visiteurs prêts à commander.',
    outline: [
      'Les épaisseurs disponibles (2, 3 et 4 mm)',
      'Quelle largeur de lanière pour quelle hauteur ?',
      'Le recouvrement entre lanières',
      'Cas pratiques : garage, entrepôt, chambre froide',
      'Quelle épaisseur choisir pour mon projet ?',
    ],
  },
  {
    title: 'Rideau à lanières pour chambre froide : combien d’énergie économisée ?',
    keyword: 'rideau lanière chambre froide',
    category: 'professionnels',
    why: 'Argument économique fort pour les restaurateurs et la logistique du froid.',
    outline: [
      'Pourquoi une chambre froide perd-elle autant de froid ?',
      'Ce que change un rideau à lanières polaire',
      'Estimer les économies sur votre facture',
      'PVC polaire ou standard : lequel choisir ?',
      'Entretien et hygiène en milieu alimentaire',
    ],
  },
  {
    title: 'Rideau de soudure : ce que dit la norme EN ISO 25980',
    keyword: 'norme rideau de soudure',
    category: 'professionnels',
    why: 'Requête réglementaire : rassure les responsables sécurité et les acheteurs.',
    outline: [
      'Que couvre la norme EN ISO 25980 ?',
      'Les couleurs de rideaux et leur niveau de protection',
      'Rideau de soudure ou écran mobile ?',
      'Les obligations de l’employeur',
      'Comment vérifier qu’un rideau est conforme ?',
    ],
  },
  {
    title: 'Isoler un quai de chargement avec un rideau à lanières',
    keyword: 'rideau quai de chargement',
    category: 'professionnels',
    why: 'Usage logistique fréquent, peu traité par les concurrents.',
    outline: [
      'Les pertes de chaleur sur un quai ouvert',
      'Rideau à lanières, porte rapide ou sas : comparatif',
      'Lanières nervurées pour le passage des transpalettes',
      'Dimensionner le rideau de votre quai',
      'Installation et entretien',
    ],
  },
  {
    title: 'Lanière PVC nervurée ou lisse : laquelle choisir ?',
    keyword: 'lanière pvc nervurée',
    category: 'guides',
    why: 'Comparatif produit qui aide à choisir et renvoie vers la page Lanières.',
    outline: [
      'Lanière lisse : les usages',
      'Lanière nervurée : résistance à l’usure',
      'Le cas des chariots élévateurs',
      'Tableau comparatif',
      'Notre conseil selon votre activité',
    ],
  },
  {
    title: 'Rideau PVC antistatique : pour quelles industries ?',
    keyword: 'rideau pvc antistatique',
    category: 'professionnels',
    why: 'L’ancien site avait une page vide sur ce sujet : on récupère la recherche.',
    outline: [
      'Qu’est-ce qu’un PVC antistatique ?',
      'Électronique, pharmacie, salles propres : les usages',
      'Les normes à connaître',
      'Comment l’installer ?',
    ],
  },
  {
    title: 'Rideau à lanières et chariot élévateur : bien choisir pour durer',
    keyword: 'rideau pvc chariot élévateur',
    category: 'professionnels',
    why: 'Ancienne page vide de pvcrideaux.fr : intention d’achat directe.',
    outline: [
      'Pourquoi les lanières s’usent vite au passage des chariots',
      'Épaisseur, nervures et recouvrement adaptés',
      'Lanières décrochables : remplacer sans démonter',
      'Combien de temps dure un rideau ?',
    ],
  },
  {
    title: 'Rideau à lanières pour garage : isoler sans fermer la porte',
    keyword: 'rideau lanière garage',
    category: 'particuliers',
    why: 'Recherche n° 1 des particuliers : alimente l’espace Particuliers.',
    outline: [
      'Pourquoi installer un rideau dans son garage ?',
      'Froid, poussière, insectes : ce qu’il arrête',
      'Mesurer l’ouverture de votre garage',
      'La pose en 30 minutes',
      'Quel budget prévoir ?',
    ],
  },
  {
    title: 'Comment mesurer son ouverture pour un rideau à lanières ?',
    keyword: 'mesurer rideau à lanières',
    category: 'guides',
    why: 'Lève le principal frein à la demande de devis.',
    outline: [
      'Les outils nécessaires',
      'Mesurer la largeur et la hauteur',
      'Pose en applique ou en tableau ?',
      'Les erreurs fréquentes',
      'Envoyer vos mesures pour un devis',
    ],
  },
  {
    title: 'Rideau anti-mouches en PVC : efficace pour la maison et les commerces ?',
    keyword: 'rideau anti mouche pvc',
    category: 'particuliers',
    why: 'Recherche saisonnière (printemps-été) : à publier en avril.',
    outline: [
      'Comment un rideau à lanières arrête les insectes',
      'Lanières transparentes ou teintées ?',
      'Cuisine, véranda, commerce : les usages',
      'Entretien au fil de la saison',
    ],
  },
  {
    title: 'Rideau à lanières pour écurie et chenil : protéger les animaux',
    keyword: 'rideau pvc écurie',
    category: 'particuliers',
    why: 'Niche peu concurrentielle, clientèle fidèle (éleveurs, centres équestres).',
    outline: [
      'Courants d’air, mouches, poussière : les besoins d’une écurie',
      'Quel PVC résiste aux animaux ?',
      'Hauteur et fixation adaptées',
      'Nettoyage et désinfection',
    ],
  },
  {
    title: 'Comment nettoyer et entretenir un rideau à lanières PVC ?',
    keyword: 'nettoyer rideau pvc',
    category: 'conseils',
    why: 'Question récurrente des clients : fidélise et amène des commandes de lanières.',
    outline: [
      'À quelle fréquence nettoyer ?',
      'Les produits à utiliser (et à éviter)',
      'Nettoyer sans décrocher les lanières',
      'Quand remplacer une lanière ?',
    ],
  },
];

/** Idées dont l'expression clé n'est pas déjà visée par un article : [[numéro, idée]]. */
export function availableIdeas(articles) {
  const used = new Set(articles.map((article) => normalizeText(article.keyword)));
  return ARTICLE_IDEAS.map((idea, index) => [index, idea]).filter(
    ([, idea]) => !used.has(normalizeText(idea.keyword)),
  );
}

/** Brouillon pré-rempli à partir d'une idée : titre, expression clé, plan en intertitres. */
export function articleFromIdea(idea) {
  const sections = idea.outline.map((heading) => `## ${heading}\n\nÀ rédiger.\n`).join('\n');
  return normalizeArticle({
    title: idea.title,
    keyword: idea.keyword,
    category: idea.category,
    content: `Introduction : présentez le problème du lecteur et citez « ${idea.keyword} » dès les premières lignes.\n\n${sections}\n[[devis]]\n`,
    status: 'draft',
  });
}
