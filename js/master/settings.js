// Pannello "Impostazioni partita" nella sala d'attesa del master.
// Le scelte restano salvate sul master per le partite successive.

import { esc } from '../ui/dom.js';
import { local } from '../platform/storage.js';
import { EVENTS, EVENT_IDS } from '../config/game-config.js';
import { normalizeChoices, defaultChoices, choicesToSettings } from './settings-map.js';
import { resolveSettings } from '../engine/state.js';

const KEY = 'castello:impostazioni-partita';

export const loadChoices = () => normalizeChoices(local.get(KEY));
export const saveChoices = (c) => local.set(KEY, c);
export function resetChoices() {
  local.remove(KEY);
  return defaultChoices();
}

const select = (name, value, options) => `<select name="${name}">${options.map(([v, label]) =>
  `<option value="${esc(String(v))}" ${String(v) === String(value) ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select>`;
const tri = (name, value) => select(name, value, [['auto', 'Automatico'], ['on', 'Sì'], ['off', 'No']]);
const check = (name, value, label) => `<label class="set-check"><input type="checkbox" name="${name}" ${value ? 'checked' : ''}> ${esc(label)}</label>`;
const row = (label, control, note = '') => `<div class="set-row"><span class="set-label">${esc(label)}${note ? ` <small>${esc(note)}</small>` : ''}</span><span class="set-control">${control}</span></div>`;

// Valori effettivi con i giocatori di adesso (per le note accanto ad "Automatico")
function autoNotes(playerCount) {
  const r = resolveSettings(Math.max(5, playerCount), {});
  const yes = (b) => (b ? 'sì' : 'no');
  return {
    threshold: `automatico: ${r.finalThreshold}`,
    seduction: `automatico: ${yes(r.seduction)}`,
    seer: `automatico: ${yes(r.roles.seer)}`,
    knight: `automatico: ${yes(r.roles.knight)}`,
    secret: `automatico: ${yes(r.roles.secretTraitor)}`,
  };
}

export function settingsPanelHtml(choices, playerCount) {
  const c = normalizeChoices(choices);
  const a = autoNotes(playerCount);
  return `<form class="settings-panel" data-act="settings-form" autocomplete="off">
    <h2>Impostazioni partita</h2>
    <p class="muted small">Lo schermo lo vedono tutti: se volete scegliere il numero di Traditori fatelo prima che arrivino i giocatori, altrimenti lasciate "Automatico".</p>
    <div class="settings-grid">
    <fieldset><legend>Giocatori e finale</legend>
      ${row('Traditori', select('traitorCount', c.traitorCount, [['auto', 'Automatico'], [1, '1'], [2, '2'], [3, '3'], [4, '4']]))}
      ${row('Cerimonia con', select('finalThreshold', c.finalThreshold, [['auto', 'Automatico'], [3, '3 giocatori'], [4, '4 giocatori'], [5, '5 giocatori']]), a.threshold)}
    </fieldset>
    <fieldset><legend>Giornata</legend>
      ${row('Giochi al giorno', select('missionsPerDay', c.missionsPerDay, [[1, '1'], [2, '2'], [3, '3'], [4, '4']]))}
      ${row('Tempo dei giochi', select('missionTimeScale', c.missionTimeScale, [[0.75, 'Più corto'], [1, 'Normale'], [1.5, 'Più lungo'], [2, 'Doppio']]))}
      ${row('Presentazioni (giorno 1)', `${check('presentations', c.presentations, 'Sì')} ${select('presentationSec', c.presentationSec, [[30, '30 s'], [45, '45 s'], [60, '60 s'], [90, '90 s']])}`)}
      ${row('Discussione prima del voto', select('discussion', c.discussion, [['auto', 'Automatica (5 o 10 min)'], ['off', 'Nessuna'], [3, '3 minuti'], [5, '5 minuti'], [10, '10 minuti'], [15, '15 minuti']]))}
    </fieldset>
    <fieldset><legend>Ruoli e reclutamento</legend>
      ${row('Veggente', tri('seer', c.roles.seer), a.seer)}
      ${row('Cavaliere', tri('knight', c.roles.knight), a.knight)}
      ${row('Traditore Segreto', tri('secretTraitor', c.roles.secretTraitor), a.secret)}
      ${row('Seduzione (prima notte)', tri('seduction', c.seduction), a.seduction)}
      ${row('Ultimatum di reclutamento', check('ultimatum', c.ultimatum, 'Sì'))}
    </fieldset>
    <fieldset><legend>Eventi (al massimo uno ogni due giorni)</legend>
      ${EVENT_IDS.map((id) => row(EVENTS[id].name, check(`event-${id}`, c.events[id], 'Sì'))).join('')}
    </fieldset>
    </div>
    <div class="settings-actions">
      <button type="button" class="btn btn-ghost btn-small" data-act="settings-reset">Valori di partenza</button>
      <button type="submit" class="btn btn-primary">Fatto</button>
    </div>
  </form>`;
}

// Legge il pannello e restituisce le scelte
export function readSettingsForm(form) {
  const f = new FormData(form);
  const val = (n) => f.get(n);
  const num = (n) => (val(n) === 'auto' ? 'auto' : Number(val(n)));
  return normalizeChoices({
    traitorCount: num('traitorCount'),
    finalThreshold: num('finalThreshold'),
    missionsPerDay: Number(val('missionsPerDay')),
    missionTimeScale: Number(val('missionTimeScale')),
    presentations: f.has('presentations'),
    presentationSec: Number(val('presentationSec')),
    discussion: ['auto', 'off'].includes(val('discussion')) ? val('discussion') : Number(val('discussion')),
    seduction: val('seduction'),
    roles: { seer: val('seer'), knight: val('knight'), secretTraitor: val('secretTraitor') },
    ultimatum: f.has('ultimatum'),
    events: Object.fromEntries(EVENT_IDS.map((id) => [id, f.has(`event-${id}`)])),
  });
}

// Riepilogo breve per la sala d'attesa (senza mai mostrare il numero di Traditori)
export function settingsSummary(choices) {
  const s = choicesToSettings(choices);
  const events = EVENT_IDS.filter((id) => s.events[id]).length;
  return [
    `${s.missionsPerDay} ${s.missionsPerDay === 1 ? 'gioco' : 'giochi'} al giorno`,
    `eventi: ${events ? `${events} su ${EVENT_IDS.length}` : 'no'}`,
    s.traitorCount === undefined ? 'Traditori: automatico' : 'Traditori: scelti a mano',
  ].join(' · ');
}
