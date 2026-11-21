// Tiene lo schermo acceso (Wake Lock API). Il blocco si perde quando la pagina
// va in secondo piano: lo richiediamo di nuovo quando torna visibile.

let sentinel = null;
let wanted = false;
const listeners = new Set();

export const wakeLockSupported = () => 'wakeLock' in navigator;

export function wakeLockStatus() {
  if (!wakeLockSupported()) return 'unsupported';
  return sentinel ? 'active' : 'inactive';
}

export function onWakeLockChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const notify = () => listeners.forEach((cb) => cb(wakeLockStatus()));

async function acquire() {
  if (!wakeLockSupported() || sentinel || document.visibilityState !== 'visible') return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    sentinel.addEventListener('release', () => {
      sentinel = null;
      notify();
    });
  } catch {
    sentinel = null; // es. risparmio energetico attivo o pagina non sicura (http)
  }
  notify();
}

// Da chiamare preferibilmente dentro un tocco dell'utente (Safari)
export function keepAwake() {
  wanted = true;
  return acquire();
}

document.addEventListener('visibilitychange', () => {
  if (wanted && document.visibilityState === 'visible') acquire();
});
