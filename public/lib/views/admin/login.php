<?php
/**
 * Formulaire de connexion.
 * @var string      $username
 * @var string|null $error
 * @var bool        $loggedOut
 */
?>
<div class="auth-card">
  <h1>Connexion</h1>
  <p class="text-muted">Espace réservé à l’équipe IsoRideaux pour rédiger et publier les articles du blog.</p>

  <?php if ($error): ?>
    <p class="notice notice--error" role="alert"><?= e($error) ?></p>
  <?php elseif ($loggedOut): ?>
    <p class="notice notice--success" role="status">Vous êtes déconnecté.</p>
  <?php endif; ?>

  <form class="stack" method="post" action="/admin/login.php">
    <input type="hidden" name="_csrf" value="<?= e(csrf_token()) ?>" />
    <div class="field">
      <label for="username">Identifiant</label>
      <input class="input" id="username" name="username" type="text" autocomplete="username" required autofocus value="<?= e($username) ?>" />
    </div>
    <div class="field">
      <label for="password">Mot de passe</label>
      <input class="input" id="password" name="password" type="password" autocomplete="current-password" required />
    </div>
    <button class="btn btn--primary btn--block" type="submit">Se connecter</button>
  </form>
</div>
