<?php

/**
 * Comptes de l'espace d'édition — MODÈLE.
 *
 * 1. Ouvrez https://www.isorideaux.fr/admin/ : tant que config.php n'existe pas,
 *    la page « Mise en service » calcule l'empreinte d'un mot de passe.
 *    (Ou, en ligne de commande : php -r "echo password_hash('mot de passe', PASSWORD_DEFAULT), PHP_EOL;")
 * 2. Copiez ce fichier en « config.php » dans ce même dossier admin/, remplacez
 *    l'identifiant et l'empreinte, puis envoyez-le par FTP.
 *
 * Le mot de passe lui-même n'est jamais écrit dans ce fichier : seule son
 * empreinte (« $2y$… ») y figure. config.php n'est pas versionné (.gitignore)
 * et ne doit pas être écrasé lors des mises à jour du site.
 */

return [
    'users' => [
        // 'identifiant' => 'empreinte du mot de passe',
        'exemple' => '$2y$10$remplacez.par.l.empreinte.generee.sur.la.page.de.mise.en.service',
    ],
];
