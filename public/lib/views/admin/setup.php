<?php
/**
 * Mise en service : aide à créer admin/config.php (affiché tant qu'il n'existe pas).
 * Rien n'est enregistré sur le serveur : la page calcule seulement l'empreinte du mot de passe.
 * @var string      $username
 * @var string|null $hash
 * @var string|null $error
 * @var int         $minLength
 */
$configFile = "<?php\n\nreturn [\n    'users' => [\n        '{$username}' => '{$hash}',\n    ],\n];\n";
?>
<div class="auth-card auth-card--wide">
  <h1>Mise en service de l’espace d’édition</h1>
  <p class="text-muted">
    Aucun compte n’est encore configuré. Choisissez un identifiant et un mot de passe :
    cette page calcule l’<strong>empreinte</strong> du mot de passe, à copier dans le fichier
    <code>admin/config.php</code>. Le mot de passe lui-même n’est enregistré nulle part.
  </p>

  <?php if ($error): ?>
    <p class="notice notice--error" role="alert"><?= e($error) ?></p>
  <?php endif; ?>

  <?php if ($hash === null): ?>
    <form class="stack" method="post" action="/admin/login.php">
      <div class="field">
        <label for="username">Identifiant</label>
        <input class="input" id="username" name="username" type="text" autocomplete="username" required value="<?= e($username) ?>" />
      </div>
      <div class="field">
        <label for="password">Mot de passe <span class="text-muted">(<?= $minLength ?> caractères minimum)</span></label>
        <input class="input" id="password" name="password" type="password" autocomplete="new-password" minlength="<?= $minLength ?>" required />
      </div>
      <button class="btn btn--primary" type="submit">Générer le fichier de configuration</button>
    </form>
  <?php else: ?>
    <ol class="setup-steps">
      <li>Créez un fichier <code>config.php</code> dans le dossier <code>admin/</code> du site (par FTP), avec ce contenu :
        <textarea class="input code-block" rows="8" readonly aria-label="Contenu du fichier config.php"><?= e($configFile) ?></textarea>
      </li>
      <li>Rechargez cette page : le formulaire de connexion apparaît.</li>
      <li>Pour ajouter une personne plus tard, ajoutez une ligne <code>'identifiant' => 'empreinte',</code> dans ce même fichier.</li>
    </ol>
  <?php endif; ?>
</div>
