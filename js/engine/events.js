// Eventi del castello: Nebbia, Doppia posta, Banchetto, Omicidio a vista.
// Si estraggono alla Colazione (dal giorno GAME.eventMinDay), al massimo uno ogni due giorni.

import { GAME, EVENT_IDS, SCENES } from '../config/game-config.js';
import { STATUS } from './state.js';
import { ROLE } from './roles.js';

const aliveOf = (s) => s.order.map((id) => s.players[id]).filter((p) => p.status === STATUS.ALIVE);

// Chi uccide alla luce del giorno: un Traditore noto estratto a caso; se non ce ne sono, il Segreto
function daylightKillerPool(s) {
  const alive = aliveOf(s);
  const regular = alive.filter((p) => p.role === ROLE.TRAITOR);
  return regular.length ? regular : alive.filter((p) => p.role === ROLE.SECRET_TRAITOR);
}

function eligible(s, id) {
  if (!s.settings.events[id]) return false;
  if (id === 'doubleStakes') return s.settings.missions;
  if (id === 'daylightMurder') return daylightKillerPool(s).length > 0;
  return true;
}

// Alla Colazione: forse un evento per oggi. Mai il giorno della Cerimonia.
export function drawEvent(s, rng) {
  s.dayEvent = null;
  if (s.day < GAME.eventMinDay) return;
  if (aliveOf(s).length <= s.settings.finalThreshold) return;
  const forced = s.debugNext && s.debugNext.event;
  let id = null;
  if (forced && EVENT_IDS.includes(forced) && eligible(s, forced)) {
    id = forced;
    delete s.debugNext.event;
  } else {
    if (s.lastEventDay !== null && s.day - s.lastEventDay < GAME.eventGapDays) return;
    const pool = EVENT_IDS.filter((e) => eligible(s, e));
    if (!pool.length || rng.next() >= s.settings.eventChance) return;
    id = rng.pick(pool);
  }
  const ev = { day: s.day, id };
  if (id === 'doubleStakes') ev.slot = 1 + rng.int(s.settings.missionsPerDay);
  if (id === 'daylightMurder') {
    ev.killerId = rng.pick(daylightKillerPool(s)).id;
    ev.victimId = null;
    ev.sceneDone = false;
    ev.duskDone = false;
  }
  if (id === 'banquet') s.banquetDay = s.day + 1;
  s.dayEvent = ev;
  s.lastEventDay = s.day;
}

// Evento di oggi (o null)
export const todayEvent = (s, id) => (s.dayEvent && s.dayEvent.day === s.day && !s.dayEvent.cancelled && (!id || s.dayEvent.id === id) ? s.dayEvent : null);

// ---- Omicidio a vista: la scena ----

export const scenePending = (s) => {
  const ev = todayEvent(s, 'daylightMurder');
  return Boolean(ev && !ev.sceneDone);
};

export function sceneSetup(s, rng, next) {
  return { sceneIndex: rng.int(SCENES.length), touched: {}, next, timer: null };
}

// Bersaglio valido per chi uccide di giorno (come di notte: non i complici che conosce)
export function daylightCanKill(s, killer, targetId) {
  const t = s.players[targetId];
  if (!t || t.status !== STATUS.ALIVE || targetId === killer.id) return false;
  if (killer.role === ROLE.SECRET_TRAITOR) return t.role !== ROLE.TRAITOR && t.role !== ROLE.SECRET_TRAITOR;
  return t.role !== ROLE.TRAITOR;
}
