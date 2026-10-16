<?php

/**
 * Stockage des articles du blog : un fichier JSON par article dans content/articles/.
 *
 * Champs d'un article :
 *   slug, title, seoTitle, description, keyword, excerpt, category,
 *   cover { src, alt }, content (Markdown), status (draft | published),
 *   publishedAt, updatedAt (ISO 8601), previousSlugs (anciennes adresses, redirigées en 301)
 *
 * Un article « published » dont la date de publication est dans le futur est
 * programmé : il n'apparaît qu'à partir de cette date.
 */

declare(strict_types=1);

const BLOG_CATEGORIES = [
    'conseils' => 'Conseils',
    'guides' => 'Guides pratiques',
    'professionnels' => 'Professionnels',
    'particuliers' => 'Particuliers',
    'actualites' => 'Actualités',
];

const ARTICLE_STATUSES = ['draft', 'published'];

const WORDS_PER_MINUTE = 200;

/** Dossier des articles ; au tout premier lancement, y copie les articles livrés avec le site. */
function articles_dir(): string
{
    if (!is_dir(ARTICLES_DIR)) {
        if (!mkdir(ARTICLES_DIR, 0755, true) && !is_dir(ARTICLES_DIR)) {
            throw new RuntimeException('Impossible de créer le dossier des articles.');
        }
        protect_directory(CONTENT_DIR);
    }

    $marker = CONTENT_DIR . '/.initialise';
    if (!is_file($marker)) {
        foreach (glob(SEED_ARTICLES_DIR . '/*.json') ?: [] as $seed) {
            $target = ARTICLES_DIR . '/' . basename($seed);
            if (!is_file($target)) {
                copy($seed, $target);
            }
        }
        write_file_atomic($marker, date(DATE_ATOM) . "\n");
    }

    return ARTICLES_DIR;
}

function article_path(string $slug): string
{
    return articles_dir() . "/{$slug}.json";
}

/** Valeurs par défaut et types garantis, quel que soit le contenu du fichier. */
function article_normalize(array $data): array
{
    $string = static fn ($value): string => is_string($value) ? $value : '';

    return [
        'slug' => $string($data['slug'] ?? ''),
        'title' => $string($data['title'] ?? ''),
        'seoTitle' => $string($data['seoTitle'] ?? ''),
        'description' => $string($data['description'] ?? ''),
        'keyword' => $string($data['keyword'] ?? ''),
        'excerpt' => $string($data['excerpt'] ?? ''),
        'category' => isset(BLOG_CATEGORIES[$data['category'] ?? '']) ? $data['category'] : 'conseils',
        'cover' => [
            'src' => $string($data['cover']['src'] ?? ''),
            'alt' => $string($data['cover']['alt'] ?? ''),
        ],
        'content' => $string($data['content'] ?? ''),
        'status' => in_array($data['status'] ?? '', ARTICLE_STATUSES, true) ? $data['status'] : 'draft',
        'publishedAt' => $string($data['publishedAt'] ?? ''),
        'updatedAt' => $string($data['updatedAt'] ?? ''),
        'previousSlugs' => array_values(array_filter((array) ($data['previousSlugs'] ?? []), 'is_string')),
    ];
}

function article_load(string $slug): ?array
{
    if (!is_valid_slug($slug)) {
        return null;
    }
    $path = article_path($slug);
    if (!is_file($path)) {
        return null;
    }
    $data = json_decode((string) file_get_contents($path), true);
    return is_array($data) ? article_normalize($data) : null;
}

/** Tous les articles (brouillons compris), du plus récent au plus ancien. */
function articles_all(): array
{
    $articles = [];
    foreach (glob(articles_dir() . '/*.json') ?: [] as $file) {
        $data = json_decode((string) file_get_contents($file), true);
        if (is_array($data)) {
            $articles[] = article_normalize($data);
        }
    }

    usort($articles, static fn (array $a, array $b): int => strcmp($b['publishedAt'] ?: $b['updatedAt'], $a['publishedAt'] ?: $a['updatedAt']));
    return $articles;
}

/** Articles visibles par le public. */
function articles_published(?string $category = null): array
{
    return array_values(array_filter(
        articles_all(),
        static fn (array $article): bool => article_is_public($article) && ($category === null || $article['category'] === $category),
    ));
}

function article_is_public(array $article): bool
{
    if ($article['status'] !== 'published' || $article['publishedAt'] === '') {
        return false;
    }
    $publishedAt = strtotime($article['publishedAt']);
    return $publishedAt !== false && $publishedAt <= time();
}

/** Ancienne adresse d'un article renommé (pour rediriger en 301). */
function article_find_by_previous_slug(string $slug): ?array
{
    foreach (articles_all() as $article) {
        if (in_array($slug, $article['previousSlugs'], true)) {
            return $article;
        }
    }
    return null;
}

/**
 * Enregistre un article. Si son adresse (slug) change, l'ancien fichier est
 * renommé et l'ancienne adresse conservée pour la redirection.
 */
function article_save(array $article, ?string $originalSlug = null): array
{
    $article = article_normalize($article);
    $now = date(DATE_ATOM);

    if ($originalSlug && $originalSlug !== $article['slug']) {
        $previous = article_load($originalSlug);
        if ($previous) {
            $article['previousSlugs'] = array_values(array_unique(array_merge(
                $previous['previousSlugs'],
                [$originalSlug],
            )));
            @unlink(article_path($originalSlug));
        }
    }

    $article['previousSlugs'] = array_values(array_diff($article['previousSlugs'], [$article['slug']]));
    if ($article['status'] === 'published' && $article['publishedAt'] === '') {
        $article['publishedAt'] = $now;
    }
    $article['updatedAt'] = $now;

    write_file_atomic(
        article_path($article['slug']),
        json_encode($article, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n",
    );

    return $article;
}

/** Suppression « douce » : l'article part à la corbeille (content/corbeille/). */
function article_delete(string $slug): bool
{
    $path = article_path($slug);
    if (!is_valid_slug($slug) || !is_file($path)) {
        return false;
    }
    if (!is_dir(TRASH_DIR)) {
        mkdir(TRASH_DIR, 0755, true);
    }
    return rename($path, TRASH_DIR . "/{$slug}-" . date('Ymd-His') . '.json');
}

function article_url(array $article): string
{
    return "/blog/{$article['slug']}/";
}

function article_seo_title(array $article): string
{
    return $article['seoTitle'] !== '' ? $article['seoTitle'] : $article['title'];
}

/** Texte brut du contenu (sans syntaxe Markdown). */
function article_plain_text(array $article): string
{
    $text = preg_replace('/!\[[^\]]*\]\([^)]*\)/', ' ', $article['content']) ?? '';
    $text = preg_replace('/\[([^\]]*)\]\([^)]*\)/', '$1', $text) ?? '';
    $text = preg_replace('/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/m', '', $text) ?? '';
    $text = str_replace(['**', '__', '`', '|'], ' ', $text);
    return trim(preg_replace('/\s+/', ' ', $text) ?? '');
}

function article_excerpt(array $article, int $length = 160): string
{
    if ($article['excerpt'] !== '') {
        return $article['excerpt'];
    }
    $text = article_plain_text($article);
    if (mb_strlen($text) <= $length) {
        return $text;
    }
    $cut = mb_substr($text, 0, $length);
    $lastSpace = mb_strrpos($cut, ' ');
    return rtrim(mb_substr($cut, 0, $lastSpace ?: $length), ' ,;:') . '…';
}

function article_description(array $article): string
{
    return $article['description'] !== '' ? $article['description'] : article_excerpt($article, 155);
}

function article_reading_time(array $article): int
{
    $words = str_word_count(strtr(article_plain_text($article), SLUG_TRANSLITERATION));
    return max(1, (int) round($words / WORDS_PER_MINUTE));
}

function article_category_label(array $article): string
{
    return BLOG_CATEGORIES[$article['category']] ?? '';
}

/** Image de couverture avec texte alternatif garanti. */
function article_cover(array $article): ?array
{
    if ($article['cover']['src'] === '') {
        return null;
    }
    return [
        'src' => $article['cover']['src'],
        'alt' => $article['cover']['alt'] !== '' ? $article['cover']['alt'] : $article['title'],
    ];
}

/** Données publiques d'un article (bloc « derniers articles », flux). */
function article_summary(array $article): array
{
    return [
        'title' => $article['title'],
        'url' => article_url($article),
        'excerpt' => article_excerpt($article, 140),
        'category' => $article['category'],
        'categoryLabel' => article_category_label($article),
        'date' => $article['publishedAt'],
        'dateLabel' => format_date_fr($article['publishedAt']),
        'readingTime' => article_reading_time($article),
        'cover' => article_cover($article),
    ];
}
