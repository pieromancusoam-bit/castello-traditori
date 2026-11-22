// Simboli della Catena della Memoria e disegno della Stima (SVG, niente immagini esterne).

import { MEMORY_SYMBOLS } from '../config/missions.js';
import { createRng } from '../engine/rng.js';

// Ogni simbolo: forma e colore diversi, riconoscibili anche da lontano
const SHAPES = [
  // Corona
  { color: '#e9c14f', svg: '<path d="M14 70 L20 34 L36 52 L50 26 L64 52 L80 34 L86 70 Z"/><rect x="14" y="72" width="72" height="10" rx="2"/>' },
  // Spada
  { color: '#c9d3e0', svg: '<path d="M47 10 L53 10 L54 62 L46 62 Z"/><rect x="32" y="62" width="36" height="7" rx="3"/><rect x="46" y="69" width="8" height="16"/><circle cx="50" cy="89" r="5"/>' },
  // Luna
  { color: '#9fb6ff', svg: '<path d="M60 14 A38 38 0 1 0 60 86 A44 44 0 0 1 60 14 Z"/>' },
  // Torre
  { color: '#d98a5b', svg: '<path d="M24 88 L24 30 L32 30 L32 20 L42 20 L42 30 L58 30 L58 20 L68 20 L68 30 L76 30 L76 88 Z"/><rect x="44" y="62" width="12" height="26" rx="6" fill="#1b1820"/>' },
  // Chiave
  { color: '#e6a33c', svg: '<circle cx="32" cy="50" r="18"/><circle cx="32" cy="50" r="8" fill="#1b1820"/><rect x="48" y="45" width="40" height="10"/><rect x="72" y="55" width="7" height="13"/><rect x="82" y="55" width="6" height="9"/>' },
  // Calice
  { color: '#e05a6a', svg: '<path d="M26 14 L74 14 L70 40 A20 20 0 0 1 30 40 Z"/><rect x="46" y="58" width="8" height="20"/><rect x="30" y="78" width="40" height="8" rx="3"/>' },
];

export function symbolSvg(index, cls = '') {
  const s = SHAPES[index];
  return `<svg class="symbol ${cls}" viewBox="0 0 100 100" fill="${s.color}" role="img" aria-label="${MEMORY_SYMBOLS[index]}">${s.svg}</svg>`;
}

export const symbolName = (index) => MEMORY_SYMBOLS[index];

// Disegno della Stima: `count` oggetti sparsi in una griglia con un po' di disordine.
// Le posizioni vengono dal seed: lo stesso seed dà sempre lo stesso disegno.
export function estimateSvg({ kind, count, seed }) {
  const W = 1600;
  const H = 900;
  const cols = 16;
  const rows = 9;
  const cw = W / cols;
  const ch = H / rows;
  const rng = createRng(seed);
  const cells = rng.shuffle(Array.from({ length: cols * rows }, (_, i) => i)).slice(0, count);
  const items = cells.map((c) => {
    const x = (c % cols) * cw + cw * (0.25 + rng.next() * 0.5);
    const y = Math.floor(c / cols) * ch + ch * (0.3 + rng.next() * 0.4);
    const k = 0.75 + rng.next() * 0.5;
    if (kind === 'coins') {
      const r = 22 * k;
      return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(0)}" fill="url(#coin)" stroke="#7a5a14" stroke-width="3"/>`;
    }
    const h = 46 * k;
    return `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})">
      <rect x="-8" y="${(-h / 2).toFixed(0)}" width="16" height="${h.toFixed(0)}" rx="3" fill="#efe3c2"/>
      <ellipse cx="0" cy="${(-h / 2 - 12).toFixed(0)}" rx="7" ry="13" fill="url(#flame)"/>
    </g>`;
  });
  return `<svg class="estimate-art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs>
      <radialGradient id="flame" cx="50%" cy="70%" r="60%"><stop offset="0" stop-color="#fff"/><stop offset="0.4" stop-color="#ffd23a"/><stop offset="1" stop-color="#ff6a1a" stop-opacity="0.2"/></radialGradient>
      <radialGradient id="coin" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#ffe9a0"/><stop offset="0.5" stop-color="#d4ae4a"/><stop offset="1" stop-color="#8a6a1e"/></radialGradient>
    </defs>
    <rect width="${W}" height="${H}" rx="24" fill="#1a1620"/>
    ${items.join('')}
  </svg>`;
}
