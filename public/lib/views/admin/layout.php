<?php
/**
 * Gabarit des pages de l'espace d'édition.
 * @var string      $title
 * @var string|null $user        utilisateur connecté
 * @var string      $body        contenu de la page
 * @var array|null  $flash       message à afficher une fois ['type', 'message']
 * @var string|null $pageScript  script de la page (admin/assets/)
 */
$currentPath = parse_url($_SERVER['REQUEST_URI'] ?? '/admin/', PHP_URL_PATH);
$isCurrent = static fn (string $path): string => $currentPath === $path ? ' aria-current="page"' : '';
?>
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title><?= e($title) ?> · Espace d’édition IsoRideaux</title>
    <link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
    <link rel="stylesheet" href="/admin/assets/admin.css" />
    <?php if ($user): ?>
      <meta name="csrf-token" content="<?= e(csrf_token()) ?>" />
    <?php endif; ?>
    <?php if ($pageScript): ?>
      <script type="module" src="/admin/assets/<?= e($pageScript) ?>"></script>
    <?php endif; ?>
  </head>
  <body class="admin">
    <a class="skip-link" href="#contenu">Aller au contenu</a>
    <header class="admin-header">
      <a class="admin-brand" href="/admin/">
        <img src="/logo-isorideaux.png" width="600" height="204" alt="IsoRideaux" />
        <span>Espace d’édition</span>
      </a>
      <?php if ($user): ?>
        <nav class="admin-nav" aria-label="Espace d’édition">
          <a href="/admin/"<?= $isCurrent('/admin/') ?>>Articles</a>
          <a href="/admin/edit.php"<?= $currentPath === '/admin/edit.php' && !isset($_GET['slug']) ? ' aria-current="page"' : '' ?>>Nouvel article</a>
          <a href="/blog/" target="_blank" rel="noopener">Voir le blog <svg class="icon" aria-hidden="true"><use href="/icons.svg#i-external"></use></svg></a>
        </nav>
        <form class="admin-logout" method="post" action="/admin/logout.php">
          <input type="hidden" name="_csrf" value="<?= e(csrf_token()) ?>" />
          <button class="link-button" type="submit">Se déconnecter <span class="admin-logout__user">(<?= e($user) ?>)</span></button>
        </form>
      <?php endif; ?>
    </header>

    <main class="admin-main" id="contenu">
      <?php if ($flash): ?>
        <p class="notice notice--<?= e($flash['type']) ?>" role="status"><?= e($flash['message']) ?></p>
      <?php endif; ?>
      <?= $body ?>
    </main>
  </body>
</html>
