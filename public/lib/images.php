<?php

/**
 * Images envoyées depuis l'espace d'édition (couvertures et illustrations).
 *
 * - Formats acceptés : JPEG, PNG, WebP, GIF ; 8 Mo maximum (ou moins si
 *   l'hébergement impose une limite plus basse).
 * - Si l'extension GD est disponible (cas de la plupart des hébergements),
 *   l'image est redressée (photos de téléphone), réduite à 1600 px de large
 *   et convertie en WebP : des pages plus légères sans effort pour l'équipe.
 * - Rangement : uploads/blog/AAAA/MM/nom-de-l-image-1a2b3c.webp
 */

declare(strict_types=1);

const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const IMAGE_MAX_WIDTH = 1600;
const IMAGE_WEBP_QUALITY = 82;
const IMAGE_JPEG_QUALITY = 85;

const IMAGE_TYPES = [
    IMAGETYPE_JPEG => 'jpg',
    IMAGETYPE_PNG => 'png',
    IMAGETYPE_WEBP => 'webp',
    IMAGETYPE_GIF => 'gif',
];

/**
 * Enregistre une image reçue via $_FILES et renvoie son adresse publique.
 *
 * @return array{url: string, width: int, height: int}
 * @throws InvalidArgumentException message affichable à l'utilisateur
 */
function image_store_upload(array $file): array
{
    $error = $file['error'] ?? UPLOAD_ERR_NO_FILE;
    if ($error === UPLOAD_ERR_INI_SIZE || $error === UPLOAD_ERR_FORM_SIZE || ($file['size'] ?? 0) > image_max_upload_bytes()) {
        throw new InvalidArgumentException(image_too_large_message());
    }
    if ($error !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'] ?? '')) {
        throw new InvalidArgumentException('L’image n’a pas pu être envoyée, veuillez réessayer.');
    }

    $info = @getimagesize($file['tmp_name']);
    if ($info === false || !isset(IMAGE_TYPES[$info[2]])) {
        throw new InvalidArgumentException('Format non reconnu : utilisez une image JPEG, PNG, WebP ou GIF.');
    }

    $directory = UPLOADS_DIR . date('/Y/m');
    image_prepare_directory($directory);

    $baseName = slugify(pathinfo((string) ($file['name'] ?? ''), PATHINFO_FILENAME), 50) ?: 'image';
    $baseName .= '-' . bin2hex(random_bytes(3));

    $optimized = image_optimize($file['tmp_name'], $info[2], "{$directory}/{$baseName}");
    if ($optimized === null) {
        // Pas de GD (ou format non pris en charge) : fichier d'origine, déjà vérifié.
        $target = "{$directory}/{$baseName}." . IMAGE_TYPES[$info[2]];
        if (!move_uploaded_file($file['tmp_name'], $target)) {
            throw new RuntimeException('Impossible d’enregistrer l’image sur le serveur.');
        }
        $optimized = ['path' => $target, 'width' => $info[0], 'height' => $info[1]];
    }

    return [
        'url' => UPLOADS_URL . substr($optimized['path'], strlen(UPLOADS_DIR)),
        'width' => $optimized['width'],
        'height' => $optimized['height'],
    ];
}

/** Poids maximal réellement accepté : limite du site, ou celle de l'hébergement si elle est plus basse. */
function image_max_upload_bytes(): int
{
    $limits = [IMAGE_MAX_BYTES];
    foreach (['upload_max_filesize', 'post_max_size'] as $setting) {
        $bytes = ini_size_to_bytes((string) ini_get($setting));
        if ($bytes > 0) {
            $limits[] = $bytes;
        }
    }
    return min($limits);
}

function image_too_large_message(): string
{
    return sprintf('Image trop lourde : %s Mo maximum.', round(image_max_upload_bytes() / 1048576, 1));
}

/** « 8M » (format php.ini) → 8388608 */
function ini_size_to_bytes(string $value): int
{
    $value = trim($value);
    $number = (int) $value;
    return match (strtolower(substr($value, -1))) {
        'g' => $number * 1024 ** 3,
        'm' => $number * 1024 ** 2,
        'k' => $number * 1024,
        default => $number,
    };
}

/** Crée le dossier et interdit l'exécution de scripts dans uploads/. */
function image_prepare_directory(string $directory): void
{
    if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
        throw new RuntimeException('Impossible de créer le dossier des images.');
    }

    $htaccess = dirname(UPLOADS_DIR) . '/.htaccess';
    if (!is_file($htaccess)) {
        write_file_atomic($htaccess, implode("\n", [
            '# Images envoyées depuis l\'espace d\'édition : aucun script exécutable ici.',
            'Options -Indexes',
            '<FilesMatch "\.(php\d?|phtml|phar|cgi|pl|py|sh|html?)$">',
            '  Require all denied',
            '</FilesMatch>',
            '',
        ]));
    }
}

/**
 * Redresse, réduit et convertit l'image avec GD.
 *
 * @return array{path: string, width: int, height: int}|null null si GD n'est pas utilisable
 */
function image_optimize(string $source, int $type, string $targetWithoutExtension): ?array
{
    $loaders = [
        IMAGETYPE_JPEG => 'imagecreatefromjpeg',
        IMAGETYPE_PNG => 'imagecreatefrompng',
        IMAGETYPE_WEBP => 'imagecreatefromwebp',
    ];
    // Les GIF (souvent animés) sont conservés tels quels.
    $loader = $loaders[$type] ?? null;
    if ($loader === null || !function_exists($loader)) {
        return null;
    }

    $image = @$loader($source);
    if ($image === false) {
        return null;
    }

    if ($type === IMAGETYPE_JPEG) {
        $image = image_apply_exif_orientation($image, $source);
    }

    $width = imagesx($image);
    $height = imagesy($image);
    if ($width > IMAGE_MAX_WIDTH) {
        $height = (int) round($height * IMAGE_MAX_WIDTH / $width);
        $width = IMAGE_MAX_WIDTH;
        $resized = imagescale($image, $width, $height, IMG_BICUBIC);
        if ($resized !== false) {
            $image = $resized;
        }
    }

    if (function_exists('imagewebp')) {
        imagepalettetotruecolor($image);
        imagealphablending($image, true);
        imagesavealpha($image, true);
        $path = "{$targetWithoutExtension}.webp";
        $saved = imagewebp($image, $path, IMAGE_WEBP_QUALITY);
    } else {
        // JPEG : fond blanc sous les zones transparentes.
        $canvas = imagecreatetruecolor($width, $height);
        imagefill($canvas, 0, 0, imagecolorallocate($canvas, 255, 255, 255));
        imagecopy($canvas, $image, 0, 0, 0, 0, $width, $height);
        $path = "{$targetWithoutExtension}.jpg";
        $saved = imagejpeg($canvas, $path, IMAGE_JPEG_QUALITY);
    }

    return $saved ? ['path' => $path, 'width' => $width, 'height' => $height] : null;
}

/** Les photos de téléphone sont souvent enregistrées couchées, avec une indication EXIF. */
function image_apply_exif_orientation(GdImage $image, string $source): GdImage
{
    if (!function_exists('exif_read_data')) {
        return $image;
    }
    $orientation = (int) (@exif_read_data($source)['Orientation'] ?? 1);
    $angle = [3 => 180, 6 => -90, 8 => 90][$orientation] ?? 0;
    if ($angle === 0) {
        return $image;
    }
    $rotated = imagerotate($image, $angle, 0);
    return $rotated !== false ? $rotated : $image;
}
