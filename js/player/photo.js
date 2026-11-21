// Ritratto del giocatore: dalla foto scattata (o scelta) a un piccolo JPEG quadrato.
// La foto resta sul Wi-Fi di casa: va solo al master, mai agli altri telefoni.

import { NET } from '../config/net-config.js';
import { isValidPhoto } from '../net/protocol.js';

async function loadImage(file) {
  // createImageBitmap rispetta l'orientamento EXIF nei browser recenti
  if (window.createImageBitmap) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch { /* si prova con <img> */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Ritaglio quadrato centrato, lato NET.photoSize; abbassa la qualità se serve
export async function fileToPortrait(file) {
  const img = await loadImage(file);
  const w = img.width;
  const h = img.height;
  const side = Math.min(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = NET.photoSize;
  canvas.height = NET.photoSize;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, NET.photoSize, NET.photoSize);
  if (img.close) img.close();

  for (let q = NET.photoQuality; q >= 0.3; q -= 0.1) {
    const data = canvas.toDataURL('image/jpeg', q);
    if (isValidPhoto(data)) return data;
  }
  throw new Error('photo-too-big');
}
