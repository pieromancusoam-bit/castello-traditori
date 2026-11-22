// Stemmi araldici disegnati in SVG: scudo con campo colorato e una figura.
// Disegni originali, semplici, leggibili anche piccoli. Nessuna immagine esterna.

import { AVATARS } from '../config/avatars.js';

const SHIELD = 'M8 8H92V54C92 86 72 106 50 114C28 106 8 86 8 54Z';

// Punti di una stella o di un sole intorno a (cx, cy)
function star(cx, cy, n, outer, inner, rot = -90) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = ((rot + (i * 180) / n) * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

// Figure: f = colore del campo (per i "buchi"), il resto usa currentColor
const CHARGES = {
  torre: (f) => `<path d="M28 34h9v6h6v-6h14v6h6v-6h9v14h-4v44H32V48h-4z"/>
    <path fill="${f}" d="M44 92V79a6 6 0 0 1 12 0v13zM47 54h6v10h-6z"/>`,
  chiave: () => `<circle cx="50" cy="32" r="10" fill="none" stroke="currentColor" stroke-width="6"/>
    <rect x="47" y="41" width="6" height="50"/><rect x="53" y="76" width="11" height="5"/><rect x="53" y="85" width="8" height="5"/>`,
  corona: () => `<path d="M26 78L29 42L40 60L50 36L60 60L71 42L74 78Z"/><rect x="25" y="81" width="50" height="9" rx="2"/>
    <circle cx="29" cy="39" r="4"/><circle cx="50" cy="33" r="4"/><circle cx="71" cy="39" r="4"/>`,
  spada: () => `<path d="M47 28L50 18L53 28V78H47Z"/><rect x="34" y="78" width="32" height="6" rx="3"/>
    <rect x="47" y="84" width="6" height="12"/><circle cx="50" cy="100" r="5"/>`,
  stella: () => `<polygon points="${star(50, 60, 5, 30, 12)}"/>`,
  luna: (f) => `<circle cx="48" cy="60" r="28"/><circle cx="60" cy="54" r="24" fill="${f}"/>`,
  sole: (f) => `<polygon points="${star(50, 60, 12, 32, 18, -90)}"/><circle cx="50" cy="60" r="15" stroke="${f}" stroke-width="2.5"/>`,
  rosa: (f) => `${[0, 72, 144, 216, 288].map((a) => {
    const r = (a - 90) * Math.PI / 180;
    return `<circle cx="${(50 + 13 * Math.cos(r)).toFixed(1)}" cy="${(60 + 13 * Math.sin(r)).toFixed(1)}" r="12"/>`;
  }).join('')}<circle cx="50" cy="60" r="7" fill="${f}"/><circle cx="50" cy="60" r="3.5"/>`,
  albero: () => `<rect x="46" y="68" width="8" height="26"/><path d="M38 94h24l-6-4H44z"/>
    <circle cx="50" cy="44" r="17"/><circle cx="35" cy="58" r="13"/><circle cx="65" cy="58" r="13"/>`,
  calice: () => `<path d="M31 30H69C69 56 61 67 50 67C39 67 31 56 31 30Z"/><rect x="47" y="66" width="6" height="18"/>
    <ellipse cx="50" cy="89" rx="17" ry="5"/>`,
  ancora: () => `<circle cx="50" cy="27" r="6" fill="none" stroke="currentColor" stroke-width="5"/>
    <rect x="47" y="33" width="6" height="58"/><rect x="35" y="40" width="30" height="5" rx="2"/>
    <path d="M28 68Q30 93 50 93Q70 93 72 68" fill="none" stroke="currentColor" stroke-width="6"/>
    <path d="M21 72L28 60L35 72Z"/><path d="M65 72L72 60L79 72Z"/>`,
  giglio: () => `<path d="M50 20C61 35 61 55 50 70C39 55 39 35 50 20Z"/>
    <path d="M47 66C31 72 18 55 28 42C32 53 39 59 47 60Z"/><path d="M53 66C69 72 82 55 72 42C68 53 61 59 53 60Z"/>
    <rect x="33" y="64" width="34" height="7" rx="2"/><path d="M44 71L50 94L56 71Z"/>`,
  croce: () => '<path d="M43 26H57L54 50L78 47V65L54 62L57 92H43L46 62L22 65V47L46 50Z"/>',
  pesce: (f) => `<ellipse cx="45" cy="60" rx="23" ry="13"/><path d="M64 60L82 46V74Z"/><circle cx="33" cy="57" r="2.8" fill="${f}"/>`,
  corvo: (f) => `<ellipse cx="55" cy="62" rx="22" ry="12" transform="rotate(22 55 62)"/><circle cx="36" cy="45" r="10"/>
    <path d="M27 42L13 47L27 51Z"/><path d="M70 70L88 88L64 80Z"/>
    <path d="M50 74L47 92M58 76L60 92" stroke="currentColor" stroke-width="3"/><circle cx="34" cy="43" r="2.4" fill="${f}"/>`,
  serpente: (f) => `<path d="M62 28C38 26 34 46 50 54C66 62 64 82 42 86C33 88 28 85 26 80" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>
    <ellipse cx="68" cy="28" rx="9" ry="6"/><path d="M76 28L84 25M76 28L84 31" stroke="currentColor" stroke-width="2"/><circle cx="70" cy="26" r="1.8" fill="${f}"/>`,
  gufo: (f) => `<ellipse cx="50" cy="64" rx="20" ry="27"/><path d="M33 46L34 28L45 40Z"/><path d="M67 46L66 28L55 40Z"/>
    <circle cx="42" cy="52" r="7.5" fill="${f}"/><circle cx="58" cy="52" r="7.5" fill="${f}"/>
    <circle cx="42" cy="52" r="3.2"/><circle cx="58" cy="52" r="3.2"/><path d="M47 59H53L50 66Z" fill="${f}"/>`,
  aquila: () => `<ellipse cx="50" cy="62" rx="8" ry="18"/><circle cx="50" cy="38" r="7"/><path d="M50 36L58 39L50 42Z"/>
    <path d="M44 54L16 34L21 46L14 51L23 58L16 65L27 68L44 66Z"/><path d="M56 54L84 34L79 46L86 51L77 58L84 65L73 68L56 66Z"/>
    <path d="M44 78L40 95L50 89L60 95L56 78Z"/>`,
  cervo: () => `<path d="M41 50H59L56 75L50 86L44 75Z"/><path d="M41 52L32 46L40 58Z"/><path d="M59 52L68 46L60 58Z"/>
    <path d="M44 50C41 38 33 31 27 20M35 35L25 37M39 42L30 47M56 50C59 38 67 31 73 20M65 35L75 37M61 42L70 47" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>`,
  farfalla: (f) => `<ellipse cx="35" cy="46" rx="15" ry="17" transform="rotate(-20 35 46)"/><ellipse cx="65" cy="46" rx="15" ry="17" transform="rotate(20 65 46)"/>
    <ellipse cx="38" cy="72" rx="10" ry="13" transform="rotate(20 38 72)"/><ellipse cx="62" cy="72" rx="10" ry="13" transform="rotate(-20 62 72)"/>
    <rect x="47" y="36" width="6" height="46" rx="3" stroke="${f}" stroke-width="2"/>
    <path d="M48 37L40 24M52 37L60 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`,
};

// SVG di uno stemma (null se l'avatar non esiste: si usano le iniziali)
export function avatarSvg(id, cls = 'crest') {
  const a = AVATARS[id];
  if (!a) return null;
  return `<svg class="${cls}" viewBox="0 0 100 120" role="img" aria-label="${a.name}">
    <path d="${SHIELD}" fill="${a.field}"/>
    <g fill="currentColor" color="${a.charge}">${CHARGES[id](a.field)}</g>
    <path d="${SHIELD}" fill="none" stroke="#c9a23d" stroke-width="4"/>
    <path d="M14 14H86V54C86 82 68 100 50 107" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>
  </svg>`;
}

export const avatarName = (id) => (AVATARS[id] ? AVATARS[id].name : '');
