/**
 * Préparation des images dans le navigateur, avant envoi : redressement
 * (photos de téléphone), redimensionnement et conversion en WebP (JPEG si le
 * navigateur ne sait pas produire de WebP). Les fonctions Vercel n'ont ainsi
 * qu'à enregistrer un fichier léger.
 *
 *   couverture : recadrée au centre au format 1200 × 630 (partages, cartes du blog)
 *   illustration : 1600 px de large au plus, proportions conservées
 */
const COVER = { width: 1200, height: 630 };
const MAX_INLINE_WIDTH = 1600;
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const toBlob = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * @param {File} file
 * @param {{ cover?: boolean }} [options]
 * @returns {Promise<{ blob: Blob, name: string, width: number, height: number }>}
 */
export async function prepareImage(file, { cover = false } = {}) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Format non reconnu : utilisez une image JPEG, PNG ou WebP.');
  }
  if (file.size > MAX_SOURCE_BYTES) throw new Error('Image trop lourde (25 Mo maximum).');

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  let crop = { x: 0, y: 0, width: bitmap.width, height: bitmap.height };
  let size;

  if (cover) {
    const ratio = COVER.width / COVER.height;
    crop =
      bitmap.width / bitmap.height > ratio
        ? {
            ...crop,
            width: Math.round(bitmap.height * ratio),
            x: Math.round((bitmap.width - bitmap.height * ratio) / 2),
          }
        : {
            ...crop,
            height: Math.round(bitmap.width / ratio),
            y: Math.round((bitmap.height - bitmap.width / ratio) / 2),
          };
    size = { ...COVER };
  } else {
    const width = Math.min(MAX_INLINE_WIDTH, bitmap.width);
    size = { width, height: Math.round((bitmap.height * width) / bitmap.width) };
  }

  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, size.width, size.height);
  bitmap.close();

  let blob = await toBlob(canvas, 'image/webp', 0.82);
  if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', 0.85);

  return { blob, name: file.name, ...size };
}
