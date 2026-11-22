// Testo per la voce: i numeri diventano parole ("1.250" -> "milleduecentocinquanta"),
// così la sintesi vocale non legge le cifre una per una dopo il punto delle migliaia.

const UNITS = ['zero', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci',
  'undici', 'dodici', 'tredici', 'quattordici', 'quindici', 'sedici', 'diciassette', 'diciotto', 'diciannove'];
const TENS = ['', '', 'venti', 'trenta', 'quaranta', 'cinquanta', 'sessanta', 'settanta', 'ottanta', 'novanta'];

function below100(n) {
  if (n < 20) return UNITS[n];
  const u = n % 10;
  let t = TENS[Math.floor(n / 10)];
  if (u === 1 || u === 8) t = t.slice(0, -1); // ventuno, ventotto
  if (u === 0) return t;
  return t + (u === 3 ? 'tré' : UNITS[u]);
}

function below1000(n) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (!h) return below100(r);
  let head = h === 1 ? 'cento' : `${UNITS[h]}cento`;
  if (!r) return head;
  const tail = below100(r);
  if (tail.startsWith('o')) head = head.slice(0, -1); // centotto, centottanta
  return head + tail;
}

export function numberToWords(n) {
  if (!Number.isFinite(n)) return String(n);
  n = Math.floor(Math.abs(n));
  if (n < 1000) return below1000(n);
  if (n < 1e6) {
    const k = Math.floor(n / 1000);
    const r = n % 1000;
    return (k === 1 ? 'mille' : `${below1000(k)}mila`) + (r ? below1000(r) : '');
  }
  const m = Math.floor(n / 1e6);
  const r = n % 1e6;
  return (m === 1 ? 'un milione' : `${numberToWords(m)} milioni`) + (r ? ` ${numberToWords(r)}` : '');
}

// Sostituisce i numeri interi (anche con il punto delle migliaia) con le parole
export const spokenText = (text) =>
  text.replace(/\d{1,3}(?:\.\d{3})+(?!\d)|\d+/g, (m) => numberToWords(Number(m.replace(/\./g, ''))));
