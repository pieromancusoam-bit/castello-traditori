// Tiene lo schermo acceso (Wake Lock API).
// Il blocco si perde quando la pagina va in secondo piano, quando il telefono entra in
// risparmio energetico o quando il sistema lo revoca: lo richiediamo di nuovo
// - quando la pagina torna visibile,
// - a ogni tocco (Safari lo concede solo dentro un gesto dell'utente),
// - ogni tanto, finché non torna attivo.

let sentinel = null;
let wanted = false;
let pending = false;
let lastError = null;
const listeners = new Set();

export const wakeLockSupported = () => 'wakeLock' in navigator;

export function wakeLockStatus() {
  if (!wakeLockSupported()) return 'unsupported';
  return sentinel ? 'active' : 'inactive';
}

// Motivo dell'ultimo rifiuto (es. "NotAllowedError"), per i messaggi a schermo
export const wakeLockError = () => lastError;

export function onWakeLockChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const notify = () => listeners.forEach((cb) => cb(wakeLockStatus()));

async function acquire() {
  if (!wanted || !wakeLockSupported() || sentinel || pending || document.visibilityState !== 'visible') return;
  pending = true;
  try {
    const s = await navigator.wakeLock.request('screen');
    sentinel = s;
    lastError = null;
    s.addEventListener('release', () => {
      if (sentinel === s) sentinel = null;
      notify();
    });
  } catch (e) {
    sentinel = null; // es. risparmio energetico attivo, nessun tocco ancora (Safari), pagina non sicura
    lastError = (e && e.name) || 'Error';
  }
  pending = false;
  notify();
}

// Da chiamare preferibilmente dentro un tocco dell'utente (Safari)
export function keepAwake() {
  wanted = true;
  return acquire();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') acquire();
});
// Ogni tocco è un'occasione per riprenderlo (capture: prima di qualunque altro gestore)
for (const ev of ['pointerdown', 'keydown']) document.addEventListener(ev, () => { if (!sentinel) acquire(); }, true);
setInterval(() => { if (!sentinel) acquire(); }, 15000);
