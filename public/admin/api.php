<?php

/**
 * Actions de l'espace d'édition appelées par le JavaScript (réponses JSON).
 *
 *   GET  api.php?action=articles  tous les articles (vérification SEO, liens internes)
 *   POST api.php?action=preview   aperçu HTML du Markdown            (champ content)
 *   POST api.php?action=upload    envoi d'une image                  (fichier image)
 *   POST api.php?action=delete    mise à la corbeille d'un article   (champ slug)
 *
 * Toute requête POST exige le jeton CSRF (en-tête X-CSRF-Token ou champ _csrf).
 * La suppression fonctionne aussi sans JavaScript (formulaire, puis redirection).
 */

declare(strict_types=1);

require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/admin.php';

$action = (string) ($_GET['action'] ?? '');

if (admin_user() === null) {
    json_response(['ok' => false, 'message' => 'Session expirée : reconnectez-vous.'], 401);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Fichier plus lourd que post_max_size : PHP vide $_POST et $_FILES.
    if (empty($_POST) && empty($_FILES) && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
        json_response(['ok' => false, 'message' => image_too_large_message()], 413);
    }
    if (!csrf_valid($_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['_csrf'] ?? null)) {
        json_response(['ok' => false, 'message' => 'Jeton de sécurité invalide : rechargez la page.'], 403);
    }
}

switch ($_SERVER['REQUEST_METHOD'] . ' ' . $action) {
    case 'GET articles':
        json_response(['ok' => true, 'articles' => array_map('admin_article_payload', articles_all())]);

    case 'POST preview':
        json_response(['ok' => true, 'html' => markdown_to_html((string) ($_POST['content'] ?? ''))]);

    case 'POST upload':
        try {
            json_response(['ok' => true] + image_store_upload($_FILES['image'] ?? []));
        } catch (InvalidArgumentException $exception) {
            json_response(['ok' => false, 'message' => $exception->getMessage()], 422);
        } catch (Throwable $exception) {
            error_log('[admin] Envoi d’image : ' . $exception->getMessage());
            json_response(['ok' => false, 'message' => 'L’image n’a pas pu être enregistrée sur le serveur.'], 500);
        }

    case 'POST delete':
        $slug = (string) ($_POST['slug'] ?? '');
        $deleted = article_delete($slug);
        $message = $deleted ? 'Article placé dans la corbeille.' : 'Article introuvable.';
        if (admin_wants_json()) {
            json_response(['ok' => $deleted, 'message' => $message], $deleted ? 200 : 404);
        }
        admin_flash($deleted ? 'success' : 'error', $message);
        admin_redirect('/admin/');

    default:
        json_response(['ok' => false, 'message' => 'Action inconnue.'], 404);
}
