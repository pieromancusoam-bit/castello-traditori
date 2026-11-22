// Il Ponte: due giocatori estratti scelgono in segreto Fidarsi o Tradire.
// Entrambi si fidano: monete. Uno solo tradisce: lui prende un oggetto. Entrambi tradiscono: niente.
// A gioco chiuso le due scelte si vedono con i nomi.

import { MISSIONS } from '../../config/missions.js';
import { REJECT, check } from '../errors.js';
import { aliveIdList, setTimer, mData } from './common.js';
import { drawItem } from '../items.js';

const C = MISSIONS.bridge;
export const BRIDGE = Object.freeze({ TRUST: 'trust', BETRAY: 'betray' });

export default {
  id: 'bridge',
  dropsItem: false, // l'oggetto lo prende solo chi tradisce

  setup(s, rng) {
    const pair = rng.shuffle(aliveIdList(s)).slice(0, 2);
    return { pair: s.order.filter((id) => pair.includes(id)), moves: {} };
  },

  start(s) {
    setTimer(s, C.chooseMs);
  },

  input(s, p, payload) {
    const d = mData(s);
    check(d.pair.includes(p.id), REJECT.NOT_ALLOWED);
    check(payload.choice === BRIDGE.TRUST || payload.choice === BRIDGE.BETRAY, REJECT.INVALID_PAYLOAD);
    check(d.moves[p.id] === undefined, REJECT.ALREADY_DONE);
    d.moves[p.id] = payload.choice;
    return d.pair.every((id) => d.moves[id] !== undefined);
  },

  // Chi non sceglie in tempo si fida
  advance() {
    return true;
  },

  result(s, rng) {
    const d = mData(s);
    const trust = (id) => (d.moves[id] ?? BRIDGE.TRUST) === BRIDGE.TRUST;
    const traitors = d.pair.filter((id) => !trust(id));
    const pair = d.pair.map((id) => ({ id, trust: trust(id) }));
    if (traitors.length === 0) return { success: true, coins: s.phaseData.value, detail: { pair, betrayerId: null } };
    if (traitors.length === 1) {
      return { success: false, coins: 0, detail: { pair, betrayerId: traitors[0] }, gift: { playerId: traitors[0], item: drawItem(rng) } };
    }
    return { success: false, coins: 0, detail: { pair, betrayerId: null } };
  },

  masterView(s) {
    const d = mData(s);
    return { pair: [...d.pair], chosenCount: d.pair.filter((id) => d.moves[id] !== undefined).length };
  },

  playerView(s, p) {
    const d = mData(s);
    const inPair = d.pair.includes(p.id);
    return {
      pair: [...d.pair],
      inPair,
      canChoose: s.phaseData.stage === 'play' && inPair && d.moves[p.id] === undefined,
      myChoice: d.moves[p.id] ?? null,
    };
  },
};
