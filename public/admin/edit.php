<?php

/**
 * Création et modification d'un article.
 *
 *   GET  edit.php                → nouvel article
 *   GET  edit.php?idee=3         → nouvel article pré-rempli depuis une idée (lib/ideas.php)
 *   GET  edit.php?slug=mon-titre → modification
 *   POST edit.php                → enregistrement (JSON pour le JavaScript, sinon page rechargée)
 */

declare(strict_types=1);

require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/admin.php';

admin_require_login();

$isPost = $_SERVER['REQUEST_METHOD'] === 'POST';
$originalSlug = (string) ($isPost ? ($_POST['originalSlug'] ?? '') : ($_GET['slug'] ?? ''));
$existing = $originalSlug !== '' ? article_load($originalSlug) : null;

if ($originalSlug !== '' && $existing === null) {
    if ($isPost && admin_wants_json()) {
        json_response(['ok' => false, 'message' => 'Article introuvable : il a peut-être été supprimé.'], 404);
    }
    admin_flash('error', 'Article introuvable : il a peut-être été supprimé.');
    admin_redirect('/admin/');
}

$errors = [];

if ($isPost) {
    if (!csrf_valid($_POST['_csrf'] ?? null)) {
        $errors['form'] = 'Votre session a expiré : reconnectez-vous dans un autre onglet, puis enregistrez à nouveau.';
        $article = $existing ?? article_normalize([]);
    } else {
        [$article, $errors] = admin_article_from_input($_POST, $existing);
    }

    if (!$errors) {
        $saved = article_save($article, $existing['slug'] ?? null);
        $message = admin_saved_message($saved);

        if (admin_wants_json()) {
            json_response(['ok' => true, 'message' => $message, 'article' => admin_article_payload($saved)]);
        }
        admin_flash('success', $message);
        admin_redirect('/admin/edit.php?slug=' . rawurlencode($saved['slug']));
    }

    if (admin_wants_json()) {
        json_response([
            'ok' => false,
            'message' => $errors['form'] ?? 'Certains champs sont à corriger.',
            'errors' => $errors,
        ], 422);
    }
} elseif ($existing !== null) {
    $article = $existing;
} else {
    $idea = ARTICLE_IDEAS[(int) ($_GET['idee'] ?? -1)] ?? null;
    $article = $idea ? article_from_idea($idea) : article_normalize(['status' => 'draft']);
}

admin_render($existing ? 'Modifier l’article' : 'Nouvel article', 'edit', [
    'article' => $article,
    'existing' => $existing,
    'errors' => $errors,
    'pageScript' => 'editor.js',
], $errors ? 422 : 200);
