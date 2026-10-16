<?php

/**
 * Configuration de l'envoi des formulaires (contact & devis).
 *
 * Ce fichier est protégé contre l'accès direct par api/.htaccess.
 * Après modification, il suffit de le renvoyer par FTP (pas besoin de rebuild).
 */

return [
    // Adresse qui reçoit les demandes.
    'recipient' => 'contact@pvcrideaux.fr',

    // Expéditeur technique des e-mails. Il doit appartenir au domaine qui
    // héberge le site, sinon les messages risquent de finir en spam.
    'sender' => 'no-reply@isorideaux.fr',

    'site_name' => 'IsoRideaux',

    // Page affichée après un envoi réussi (envoi sans JavaScript).
    'success_url' => '/merci/',

    // Délai minimum entre deux envois depuis la même adresse IP (secondes).
    'rate_limit_seconds' => 30,

    // Un humain met plus de quelques secondes à remplir un formulaire :
    // en dessous, l'envoi est considéré comme automatisé (secondes).
    'min_fill_seconds' => 3,
];
