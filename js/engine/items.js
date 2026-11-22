// Oggetti: Scudo, Pugnale, Maledizione, Sigillo, Specchio.
// Restano segreti finché non si usano: l'inventario è solo nella vista del proprietario.

import { ITEMS, ITEM_IDS } from '../config/game-config.js';
import { PHASE, STATUS } from './state.js';

export const ITEM = Object.freeze({ SHIELD: 'shield', DAGGER: 'dagger', CURSE: 'curse', SEAL: 'seal', MIRROR: 'mirror' });

export const hasItem = (p, item) => p.items.includes(item);

export function takeItem(p, item) {
  const i = p.items.indexOf(item);
  if (i >= 0) p.items.splice(i, 1);
  return i >= 0;
}

export const giveItem = (p, item) => { p.items.push(item); };

// Oggetto a caso, secondo i pesi di js/config/
export function drawItem(rng) {
  const total = ITEM_IDS.reduce((n, id) => n + ITEMS[id].weight, 0);
  let r = rng.next() * total;
  for (const id of ITEM_IDS) {
    r -= ITEMS[id].weight;
    if (r < 0) return id;
  }
  return ITEM_IDS[ITEM_IDS.length - 1];
}

const isAlive = (p) => p.status === STATUS.ALIVE;
const aliveIds = (s) => s.order.filter((id) => isAlive(s.players[id]));

// Momento della Maledizione: dopo i giochi del giorno (tabellone), oppure prima della
// Tavola Rotonda nelle partite senza giochi (Colazione)
export const curseWindow = (s) => (s.phase === PHASE.MISSION && s.phaseData.stage === 'board')
  || (s.phase === PHASE.BREAKFAST && !s.settings.missions && s.day > 0);

// Pugnale: alla Tavola Rotonda (non nella Cerimonia), prima di aver votato
export function daggerUsable(s, p) {
  const pd = s.phaseData;
  return s.phase === PHASE.ROUNDTABLE && pd.stage === 'voting' && pd.ballot.votes[p.id] === undefined
    && !s.curses.includes(p.id) && !(pd.ballot.daggers && pd.ballot.daggers[p.id]);
}

// Sigillo: quando si è maledetti, finché la Tavola Rotonda non è chiusa
export const sealUsable = (s, p) => s.curses.includes(p.id)
  && (curseWindow(s) || (s.phase === PHASE.ROUNDTABLE && s.phaseData.stage !== 'results'));

// Specchio: dopo una Tavola Rotonda (c'è un ultimo voto da guardare)
export const mirrorUsable = (s) => Boolean(s.lastBallot) && s.phase !== PHASE.ENDED;

// Cosa può fare ora il giocatore con i suoi oggetti (per il telefono)
export function itemActions(s, p) {
  if (!isAlive(p) || s.phase === PHASE.ROLES || s.phase === PHASE.ENDED) return { dagger: false, curse: null, seal: false, mirror: false };
  return {
    dagger: hasItem(p, ITEM.DAGGER) && daggerUsable(s, p),
    curse: hasItem(p, ITEM.CURSE) && curseWindow(s) ? aliveIds(s).filter((id) => id !== p.id && !s.curses.includes(id)) : null,
    seal: hasItem(p, ITEM.SEAL) && sealUsable(s, p),
    mirror: hasItem(p, ITEM.MIRROR) && mirrorUsable(s),
  };
}

// Chi ha votato contro `playerId` nell'ultimo voto della Tavola Rotonda
export function votersAgainst(s, playerId) {
  const b = s.lastBallot;
  if (!b) return [];
  return s.order.filter((id) => b.votes[id] === playerId);
}
