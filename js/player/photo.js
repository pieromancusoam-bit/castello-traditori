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

// Ritaglio quadrato centrato. Il ritratto deve stare in un solo messaggio PeerJS:
// si prova con lati sempre più piccoli e qualità sempre più bassa finché ci sta.
export async function fileToPortrait(file) {
  const img = await loadImage(file);
  const w = img.width;
  const h = img.height;
  const side = Math.min(w, h);
  try {
    for (const size of NET.photoSizes) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      canvas.getContext('2d').drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size);
      for (let q = NET.photoQuality; q >= NET.photoMinQuality - 1e-9; q -= 0.08) {
        const data = canvas.toDataURL('image/jpeg', q);
        if (isValidPhoto(data)) return data;
      }
    }
  } finally {
    if (img.close) img.close();
  }
  throw new Error('photo-too-big');
}
