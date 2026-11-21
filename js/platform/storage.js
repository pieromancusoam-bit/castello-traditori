// Accesso protetto a localStorage / sessionStorage: in navigazione privata
// o con i dati bloccati può lanciare errori, e il gioco non deve rompersi.

function make(getArea) {
  return {
    get(key, fallback = null) {
      try {
        const raw = getArea().getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        getArea().setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try { getArea().removeItem(key); } catch { /* niente */ }
    },
  };
}

export const local = make(() => window.localStorage);
export const session = make(() => window.sessionStorage);

// Chiavi usate dall'app
export const KEYS = {
  room: (code) => `castello:stanza:${code}`,
  lastRoom: 'castello:ultima-stanza',
  peerServer: 'castello:server-aggancio',
  player: 'castello:giocatore',
};
