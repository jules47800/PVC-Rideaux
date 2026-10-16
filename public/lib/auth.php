<?php

/**
 * Authentification de l'espace d'édition.
 *
 * - Comptes et mots de passe (hachés) dans admin/config.php (voir config.example.php).
 * - Session dédiée : cookie HttpOnly, SameSite=Strict, Secure en HTTPS,
 *   expiration après 2 h d'inactivité, identifiant régénéré à la connexion.
 * - Jeton CSRF sur toutes les actions qui modifient quelque chose.
 * - 5 essais de connexion ratés max. par adresse IP sur 15 minutes.
 */

declare(strict_types=1);

const ADMIN_SESSION_NAME = 'isorideaux_admin';
const ADMIN_CONFIG_FILE = ROOT_DIR . '/admin/config.php';
const ADMIN_IDLE_TIMEOUT = 2 * 3600;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_SECONDS = 15 * 60;

/** Empreinte bcrypt factice (mot de passe aléatoire inconnu) pour un temps de réponse constant. */
const DUMMY_PASSWORD_HASH = '$2y$10$eL5HUdSODcZwMrP8fxq17.hcTtHL6z8t6u2Xia0aXeiO7fFWMyXxy';

/** Configuration de l'espace d'édition, ou null si admin/config.php manque. */
function admin_config(): ?array
{
    static $config = false;
    if ($config === false) {
        $config = is_file(ADMIN_CONFIG_FILE) ? require ADMIN_CONFIG_FILE : null;
        if (!is_array($config) || empty($config['users']) || !is_array($config['users'])) {
            $config = null;
        }
    }
    return $config;
}

function admin_session_start(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    session_name(ADMIN_SESSION_NAME);
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => is_https(),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();

    $lastActivity = $_SESSION['last_activity'] ?? null;
    if (isset($_SESSION['user']) && is_int($lastActivity) && time() - $lastActivity > ADMIN_IDLE_TIMEOUT) {
        $_SESSION = [];
        session_regenerate_id(true);
    }
    $_SESSION['last_activity'] = time();
}

/** Utilisateur connecté, sans créer de session pour les simples visiteurs. */
function admin_user(): ?string
{
    if (session_status() !== PHP_SESSION_ACTIVE && !isset($_COOKIE[ADMIN_SESSION_NAME])) {
        return null;
    }
    admin_session_start();
    $user = $_SESSION['user'] ?? null;
    return is_string($user) && isset(admin_config()['users'][$user]) ? $user : null;
}

function admin_require_login(): string
{
    $user = admin_user();
    if ($user === null) {
        header('Location: /admin/login.php', true, 303);
        exit;
    }
    return $user;
}

function admin_login(string $user, string $password): bool
{
    $hash = admin_config()['users'][$user] ?? null;
    // Vérification factice si l'identifiant est inconnu : même durée de réponse.
    $valid = password_verify($password, is_string($hash) ? $hash : DUMMY_PASSWORD_HASH);
    if (!$valid || !is_string($hash)) {
        return false;
    }

    admin_session_start();
    session_regenerate_id(true);
    $_SESSION['user'] = $user;
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return true;
}

function admin_logout(): void
{
    admin_session_start();
    $_SESSION = [];
    setcookie(ADMIN_SESSION_NAME, '', ['expires' => time() - 3600, 'path' => '/', 'secure' => is_https(), 'httponly' => true, 'samesite' => 'Strict']);
    session_destroy();
}

function csrf_token(): string
{
    admin_session_start();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function csrf_valid(?string $token): bool
{
    return is_string($token) && $token !== '' && hash_equals(csrf_token(), $token);
}

/* --- Limitation des tentatives de connexion --- */

function login_attempts_file(): string
{
    return sys_get_temp_dir() . '/isorideaux-login-' . hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . ROOT_DIR);
}

function login_is_locked(): bool
{
    $data = json_decode((string) @file_get_contents(login_attempts_file()), true);
    return is_array($data)
        && ($data['count'] ?? 0) >= LOGIN_MAX_ATTEMPTS
        && time() - ($data['since'] ?? 0) < LOGIN_LOCK_SECONDS;
}

function login_register_failure(): void
{
    $file = login_attempts_file();
    $data = json_decode((string) @file_get_contents($file), true);
    if (!is_array($data) || time() - ($data['since'] ?? 0) >= LOGIN_LOCK_SECONDS) {
        $data = ['count' => 0, 'since' => time()];
    }
    $data['count']++;
    @file_put_contents($file, json_encode($data), LOCK_EX);
}

function login_clear_failures(): void
{
    @unlink(login_attempts_file());
}
