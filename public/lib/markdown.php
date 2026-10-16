<?php

/**
 * Conversion Markdown → HTML des articles.
 *
 * Parsedown en mode sécurisé : le HTML saisi est échappé et les liens
 * dangereux (javascript:…) neutralisés. Le résultat est ensuite enrichi :
 * ancres sur les intertitres (sommaire), images en chargement différé,
 * liens externes ouverts dans un nouvel onglet, tableaux mis en forme.
 *
 * Raccourci : une ligne contenant seulement [[devis]] insère un encart
 * « Demander un devis » au milieu de l'article.
 */

declare(strict_types=1);

const MARKDOWN_DEVIS_BLOCK = <<<'HTML'
<aside class="post-inline-cta">
  <p><strong>Un projet de rideau à lanières ?</strong> Devis gratuit et sans engagement sous 24 h, livraison offerte.</p>
  <a class="btn btn--primary" href="/devis/">Demander mon devis <svg class="icon icon-arrow" aria-hidden="true"><use href="/icons.svg#i-arrow-right"></use></svg></a>
</aside>
HTML;

function markdown_to_html(string $markdown): string
{
    static $parser = null;
    if ($parser === null) {
        $parser = new Parsedown();
        $parser->setSafeMode(true);
        $parser->setBreaksEnabled(false);
    }

    $html = $parser->text($markdown);

    // Ancres stables sur les intertitres, pour le sommaire et les liens directs.
    $usedIds = [];
    $html = preg_replace_callback(
        '#<(h[23])>(.*?)</\1>#s',
        static function (array $match) use (&$usedIds): string {
            $base = slugify(html_entity_decode(strip_tags($match[2]), ENT_QUOTES | ENT_HTML5), 60) ?: 'section';
            $id = $base;
            for ($i = 2; isset($usedIds[$id]); $i++) {
                $id = "{$base}-{$i}";
            }
            $usedIds[$id] = true;
            return "<{$match[1]} id=\"{$id}\">{$match[2]}</{$match[1]}>";
        },
        $html,
    ) ?? $html;

    // Images : chargement différé, et dimensions réelles (images du site) pour
    // réserver leur place et éviter que le texte ne « saute » au chargement.
    $html = preg_replace_callback(
        '#<img src="([^"]+)"#',
        static function (array $match): string {
            $attributes = 'loading="lazy" decoding="async"';
            $path = html_entity_decode($match[1], ENT_QUOTES | ENT_HTML5);
            if (preg_match('#^/(?!/)[A-Za-z0-9/_.-]+$#', $path) && !str_contains($path, '..')) {
                $size = @getimagesize(ROOT_DIR . $path);
                if ($size !== false) {
                    $attributes .= " width=\"{$size[0]}\" height=\"{$size[1]}\"";
                }
            }
            return "<img {$attributes} src=\"{$match[1]}\"";
        },
        $html,
    ) ?? $html;

    $html = preg_replace(
        '#<a href="(https?://[^"]+)">#',
        '<a href="$1" target="_blank" rel="noopener">',
        $html,
    ) ?? $html;

    $html = str_replace('<p>[[devis]]</p>', MARKDOWN_DEVIS_BLOCK, $html);

    // Alignement des colonnes de tableau : classes plutôt que style en ligne (bloqué par la CSP).
    $html = preg_replace('# style="text-align: (left|center|right);"#', ' class="is-$1"', $html) ?? $html;

    return str_replace(
        ['<table>', '</table>'],
        ['<div class="table-wrap"><table class="spec-table">', '</table></div>'],
        $html,
    );
}

/** Intertitres de niveau 2 d'un HTML d'article : [['id' => …, 'text' => …], …] */
function markdown_headings(string $html): array
{
    preg_match_all('#<h2 id="([^"]+)">(.*?)</h2>#s', $html, $matches, PREG_SET_ORDER);
    return array_map(
        static fn (array $match): array => [
            'id' => $match[1],
            'text' => html_entity_decode(strip_tags($match[2]), ENT_QUOTES | ENT_HTML5),
        ],
        $matches,
    );
}
