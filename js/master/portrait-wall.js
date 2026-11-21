// Parete dei ritratti (Colazione): un quadro per giocatore.
// Bandito: X rossa e fazione sotto. Assassinato: vetro incrinato e cornice storta, nessuna fazione.
// Tutto disegnato in CSS/SVG, nessuna immagine esterna.

import { esc } from '../ui/dom.js';

const FACTION_LABEL = { faithfuls: 'Leale', traitors: 'Traditore' };

const initials = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

// X rossa dipinta a pennello
const RED_X = `
  <svg class="mark-x" viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="none">
    <path d="M12 10 C 35 34, 62 62, 90 91" />
    <path d="M88 9 C 64 36, 38 63, 10 92" />
  </svg>`;

// Vetro incrinato: crepe che partono da un punto d'impatto
const CRACK = `
  <svg class="mark-crack" viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="none">
    <g class="shards">
      <path d="M38 34 L60 0 L74 0 Z" />
      <path d="M38 34 L0 52 L0 66 Z" />
      <path d="M38 34 L100 72 L100 84 Z" />
    </g>
    <g class="lines">
      <path d="M38 34 L52 12 L60 0" />
      <path d="M38 34 L22 10 L18 0" />
      <path d="M38 34 L8 40 L0 44" />
      <path d="M38 34 L14 70 L4 100" />
      <path d="M38 34 L44 64 L40 100" />
      <path d="M38 34 L70 58 L100 70" />
      <path d="M38 34 L78 30 L100 22" />
      <path d="M52 12 L64 22 L78 30" />
      <path d="M22 10 L12 24 L8 40" />
      <path d="M14 70 L30 60 L44 64" />
      <path d="M70 58 L62 80 L58 100" />
      <circle cx="38" cy="34" r="3.5" />
    </g>
  </svg>`;

// players: elenco pubblico [{ id, name, status, faction }]
// opts: { photoOf(id) -> dataURL|null, breakingId: id del quadro che si rompe ora }
export function portraitWallHtml(players, { photoOf, breakingId = null, suspects = [] }) {
  const frames = players.map((p) => {
    const photo = photoOf(p.id);
    const canvas = photo
      ? `<img src="${esc(photo)}" alt="">`
      : `<span class="initials">${esc(initials(p.name))}</span>`;
    const cls = [
      'portrait',
      `is-${p.status}`,
      p.id === breakingId ? 'is-breaking' : '',
    ].join(' ');
    let tag = '';
    if (p.status === 'banished' && p.faction) tag = `<span class="tag tag-${p.faction}">${FACTION_LABEL[p.faction]}</span>`;
    else if (p.status === 'alive' && suspects.includes(p.id)) tag = '<span class="tag tag-suspect">Sospettato</span>';
    return `
      <figure class="${cls}">
        <div class="frame">
          <div class="canvas">${canvas}</div>
          ${p.status === 'banished' ? RED_X : ''}
          ${p.status === 'murdered' ? CRACK : ''}
        </div>
        <figcaption><span class="pname">${esc(p.name)}</span>${tag}</figcaption>
      </figure>`;
  });
  return `<div class="portrait-wall" style="--count:${players.length}">${frames.join('')}</div>`;
}

// Un solo quadro, senza segni (per la Cerimonia delle Polveri)
export function portraitFrameHtml(p, photo) {
  const canvas = photo
    ? `<img src="${esc(photo)}" alt="">`
    : `<span class="initials">${esc(initials(p.name))}</span>`;
  return `<div class="frame"><div class="canvas">${canvas}</div></div>`;
}
