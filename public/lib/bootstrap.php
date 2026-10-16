<?php

/**
 * Point d'entrée commun du blog et de l'espace d'édition (PHP 8.1+, extension mbstring).
 *
 * Organisation sur le serveur (racine du site envoyée par FTP) :
 *   blog/              pages publiques du blog (rendues par PHP)
 *   admin/             espace d'édition (protégé par mot de passe)
 *   lib/               ce dossier : code partagé, jamais servi directement
 *   content/           articles enregistrés (créé automatiquement, jamais servi directement)
 *   content-initial/   articles livrés avec le site, copiés dans content/ au premier lancement
 *   uploads/blog/      images envoyées depuis l'espace d'édition
 */

declare(strict_types=1);

date_default_timezone_set('Europe/Paris');
mb_internal_encoding('UTF-8');

define('ROOT_DIR', dirname(__DIR__));
define('CONTENT_DIR', ROOT_DIR . '/content');
define('ARTICLES_DIR', CONTENT_DIR . '/articles');
define('TRASH_DIR', CONTENT_DIR . '/corbeille');
define('SEED_ARTICLES_DIR', ROOT_DIR . '/content-initial/articles');
define('UPLOADS_DIR', ROOT_DIR . '/uploads/blog');
define('UPLOADS_URL', '/uploads/blog');
define('LAYOUT_FILE', ROOT_DIR . '/blog/_layout.html');
define('NOT_FOUND_FILE', ROOT_DIR . '/404.html');

require_once __DIR__ . '/vendor/Parsedown.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/articles.php';
require_once __DIR__ . '/markdown.php';
require_once __DIR__ . '/layout.php';
require_once __DIR__ . '/auth.php';
