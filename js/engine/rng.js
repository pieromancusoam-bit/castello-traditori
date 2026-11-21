// Generatore pseudo-casuale con seed (mulberry32). Lo stato è un intero a 32 bit
// che si salva nella partita: dopo "Riprendi" le estrazioni continuano da dove erano.

export function createRng(state) {
  let s = state >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    // intero in [0, n)
    int: (n) => Math.floor(next() * n),
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    // copia mescolata (Fisher-Yates)
    shuffle(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    get state() {
      return s;
    },
  };
}
