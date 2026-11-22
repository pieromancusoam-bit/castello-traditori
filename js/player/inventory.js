// Inventario sul telefono: oggetti posseduti, come si usano e cosa si può fare adesso.
// Tutto viene dalla propria vista (me.items, me.itemActions, me.mirror): mai dati altrui.

import { esc } from '../ui/dom.js';
import { ITEMS } from '../config/game-config.js';

// Pulsante nell'intestazione: compare solo se c'è qualcosa da vedere
export function inventoryButtonHtml(v, ui) {
  const n = v.me.items.length;
  if (!n && !v.me.mirror) return '';
  const ready = usableNow(v.me.itemActions);
  return `<button type="button" class="btn btn-small inv-btn ${ready ? 'is-ready' : ''} ${ui.inventory ? 'is-open' : ''}" data-act="inventory">
    Oggetti${n ? ` (${n})` : ''}</button>`;
}

export const usableNow = (a) => Boolean(a && (a.dagger || a.seal || a.mirror || (a.curse && a.curse.length)));

// Oggetti raggruppati: [{ id, count }]
function grouped(items) {
  const out = [];
  for (const id of items) {
    const g = out.find((x) => x.id === id);
    if (g) g.count++;
    else out.push({ id, count: 1 });
  }
  return out;
}

export function inventoryHtml(v, ui, nameOf, confirmHtml) {
  const a = v.me.itemActions;
  const rows = grouped(v.me.items).map(({ id, count }) => {
    const def = ITEMS[id];
    let action = '<span class="muted small">Non si può usare adesso.</span>';
    if (id === 'shield') action = '<span class="muted small">Ti protegge da solo, la notte.</span>';
    if ((id === 'dagger' && a.dagger) || (id === 'seal' && a.seal) || (id === 'mirror' && a.mirror)) {
      action = `<button class="btn btn-primary btn-small" data-pick="${id}" data-kind="item">Usa ora</button>`;
    }
    if (id === 'curse' && a.curse) action = '<span class="small">Scegli qui sotto chi maledire.</span>';
    return `<li class="inv-item item-${id}">
      <div class="inv-head"><strong>${esc(def.name)}</strong>${count > 1 ? ` <span class="muted">×${count}</span>` : ''}</div>
      <p class="small">${esc(def.text)}</p>
      ${action}
    </li>`;
  }).join('');

  let curse = '';
  if (a.curse && a.curse.length) {
    curse = `<h2>Maledizione</h2><p class="small">Chi non voterà alla prossima Tavola Rotonda?</p>
      <div class="pick-grid">${a.curse.map((id) => `<button class="btn pick ${ui.pending && ui.pending.kind === 'curse' && ui.pending.value === id ? 'is-pending' : ''}" data-pick="${esc(id)}" data-kind="curse">${esc(nameOf(id))}</button>`).join('')}</div>`;
  }

  const mirror = v.me.mirror
    ? `<div class="mirror-result"><h2>Lo Specchio</h2><p>${v.me.mirror.voters.length
      ? `Al voto del giorno ${v.me.mirror.day} contro di te: <strong>${v.me.mirror.voters.map((id) => esc(nameOf(id))).join(', ')}</strong>.`
      : `Al voto del giorno ${v.me.mirror.day} nessuno ha votato contro di te.`}</p></div>`
    : '';

  let confirm = '';
  const p = ui.pending;
  if (p && p.kind === 'item') confirm = confirmHtml(ui, `Usare <strong>${esc(ITEMS[p.value].name)}</strong>? Non tornerà indietro.`);
  if (p && p.kind === 'curse') confirm = confirmHtml(ui, `Maledire <strong>${esc(nameOf(p.value))}</strong>?`);

  return `<div class="inventory" role="dialog" aria-label="Oggetti">
    <div class="inv-top"><h1>I tuoi oggetti</h1><button class="btn btn-ghost btn-small" data-act="inventory">Chiudi</button></div>
    <p class="muted small">Nessuno sa cosa possiedi finché non lo usi.</p>
    ${rows ? `<ul class="inv-list">${rows}</ul>` : '<p class="muted">Nessun oggetto.</p>'}
    ${curse}${mirror}${confirm}
  </div>`;
}

// Avvisi brevi nelle schermate di gioco (Pugnale prima del voto, Sigillo da maledetto, oggetto vinto)
export function itemHintHtml(v) {
  const a = v.me.itemActions;
  if (a.dagger) return '<p class="item-hint">Hai un <strong>Pugnale</strong>: usalo prima di votare e il tuo voto conterà doppio. <button class="btn btn-small btn-secondary" data-pick="dagger" data-kind="item">Usa il Pugnale</button></p>';
  if (a.seal) return '<p class="item-hint">Sei maledetto, ma hai un <strong>Sigillo</strong>. <button class="btn btn-small btn-secondary" data-pick="seal" data-kind="item">Spezza la Maledizione</button></p>';
  if (a.curse && a.curse.length) return '<p class="item-hint">Hai una <strong>Maledizione</strong>: puoi lanciarla adesso. <button class="btn btn-small btn-secondary" data-act="inventory">Apri gli oggetti</button></p>';
  return '';
}

export function giftHtml(item) {
  if (!item) return '';
  return `<p class="gift">In segreto il castello ti ha dato: <strong>${esc(ITEMS[item].name)}</strong>.</p>`;
}
