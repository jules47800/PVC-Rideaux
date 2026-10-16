<?php

/**
 * Déconnexion (formulaire POST protégé par jeton, depuis l'en-tête de l'espace d'édition).
 */

declare(strict_types=1);

require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/admin.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && csrf_valid($_POST['_csrf'] ?? null)) {
    admin_logout();
    admin_redirect('/admin/login.php?deconnecte=1');
}

admin_redirect('/admin/');
