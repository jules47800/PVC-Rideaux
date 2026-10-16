<?php

/**
 * Connexion à l'espace d'édition.
 * Tant que admin/config.php n'existe pas, affiche la page de mise en service.
 */

declare(strict_types=1);

require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/admin.php';

const SETUP_MIN_PASSWORD_LENGTH = 12;

if (admin_config() === null) {
    $username = slugify((string) ($_POST['username'] ?? ''), 30);
    $password = (string) ($_POST['password'] ?? '');
    $error = null;
    $hash = null;

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if ($username === '') {
            $error = 'Choisissez un identifiant (lettres et chiffres).';
        } elseif (mb_strlen($password) < SETUP_MIN_PASSWORD_LENGTH) {
            $error = 'Le mot de passe doit faire au moins ' . SETUP_MIN_PASSWORD_LENGTH . ' caractères.';
        } else {
            $hash = password_hash($password, PASSWORD_DEFAULT);
        }
    }

    admin_render('Mise en service', 'setup', [
        'username' => $username,
        'hash' => $hash,
        'error' => $error,
        'minLength' => SETUP_MIN_PASSWORD_LENGTH,
    ]);
}

if (admin_user() !== null) {
    admin_redirect('/admin/');
}

$username = trim((string) ($_POST['username'] ?? ''));
$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_valid($_POST['_csrf'] ?? null)) {
        $error = 'La page a expiré : veuillez réessayer.';
    } elseif (login_is_locked()) {
        $error = 'Trop de tentatives : réessayez dans 15 minutes.';
    } elseif (admin_login($username, (string) ($_POST['password'] ?? ''))) {
        login_clear_failures();
        admin_redirect('/admin/');
    } else {
        login_register_failure();
        $error = 'Identifiant ou mot de passe incorrect.';
    }
}

admin_render('Connexion', 'login', [
    'username' => $username,
    'error' => $error,
    'loggedOut' => isset($_GET['deconnecte']),
]);
