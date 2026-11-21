// Piccoli aiuti per costruire le schermate senza framework.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Ogni testo che arriva da un giocatore passa da qui prima di finire nell'HTML
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const $ = (sel, root = document) => root.querySelector(sel);

export function setHtml(el, html) {
  if (el) el.innerHTML = html;
}

export function on(root, sel, event, handler) {
  root.addEventListener(event, (e) => {
    const target = e.target.closest(sel);
    if (target && root.contains(target)) handler(e, target);
  });
}

// ID e token casuali (crittografici: i token non devono essere indovinabili)
export function randomHex(bytes) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Numero casuale in [0, 1) per il codice stanza
export const cryptoRandom = () => {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] / 2 ** 32;
};
