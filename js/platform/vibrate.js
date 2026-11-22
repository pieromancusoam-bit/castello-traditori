// Vibrazione del telefono; dove non esiste (iPhone) un breve lampo dello schermo.

import { SHOW } from '../config/show-config.js';

export function buzz(kind) {
  const pattern = SHOW.vibrate[kind];
  if (!pattern) return;
  try {
    if (navigator.vibrate && navigator.vibrate(pattern)) return;
  } catch { /* niente */ }
  flash();
}

function flash() {
  const el = document.createElement('div');
  el.className = 'buzz-flash';
  el.style.animationDuration = `${SHOW.flashMs}ms`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), SHOW.flashMs + 50);
}
