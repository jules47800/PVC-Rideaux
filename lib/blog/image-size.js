/**
 * Dimensions d'une image (PNG, JPEG, WebP, GIF) lues dans l'en-tête du
 * fichier, sans dépendance. Sert au build pour renseigner width / height des
 * images des articles (évite les sauts de mise en page) et de l'image de partage.
 */
import { closeSync, openSync, readSync } from 'node:fs';

const HEADER_BYTES = 64 * 1024;

function readHeader(path) {
  const buffer = Buffer.alloc(HEADER_BYTES);
  const fd = openSync(path, 'r');
  try {
    const length = readSync(fd, buffer, 0, HEADER_BYTES, 0);
    return buffer.subarray(0, length);
  } finally {
    closeSync(fd);
  }
}

function jpegSize(buffer) {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    // Marqueurs SOF0 à SOF15 (hors DHT, JPG, DAC) : dimensions de l'image.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

function webpSize(buffer) {
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8X') {
    return { width: buffer.readUIntLE(24, 3) + 1, height: buffer.readUIntLE(27, 3) + 1 };
  }
  return null;
}

/** @returns {{ width: number, height: number } | null} */
export function imageSize(path) {
  let buffer;
  try {
    buffer = readHeader(path);
  } catch {
    return null;
  }

  if (buffer.length < 30) return null;
  if (buffer.toString('ascii', 1, 4) === 'PNG') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return jpegSize(buffer);
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return webpSize(buffer);
  }
  if (buffer.toString('ascii', 0, 3) === 'GIF') {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  }
  return null;
}
