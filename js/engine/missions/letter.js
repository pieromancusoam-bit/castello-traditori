// La Lettera Sigillata: un giocatore estratto può aprirla (un oggetto per sé, il gruppo perde
// metà del valore) o rinunciare (il gruppo guadagna il valore intero). La scelta si vede, l'oggetto no.

import { MISSIONS } from '../../config/missions.js';
import { REJECT, check } from '../errors.js';
import { aliveIdList, setTimer, mData } from './common.js';
import { drawItem } from '../items.js';

const C = MISSIONS.letter;

export default {
  id: 'letter',
  dropsItem: false, // l'oggetto è nella lettera
  noDouble: true, // la Doppia posta passa al gioco dopo

  setup(s, rng) {
    return { keeperId: rng.pick(aliveIdList(s)), opened: null };
  },

  start(s) {
    setTimer(s, C.chooseMs);
  },

  input(s, p, payload) {
    const d = mData(s);
    check(p.id === d.keeperId, REJECT.NOT_ALLOWED);
    check(typeof payload.open === 'boolean', REJECT.INVALID_PAYLOAD);
    check(d.opened === null, REJECT.ALREADY_DONE);
    d.opened = payload.open;
    return true;
  },

  // Chi non sceglie in tempo rinuncia
  advance() {
    return true;
  },

  result(s, rng) {
    const d = mData(s);
    const value = s.phaseData.value;
    if (d.opened !== true) return { success: true, coins: value, detail: { keeperId: d.keeperId, opened: false } };
    return {
      success: false,
      coins: -Math.floor(value * C.openCost),
      detail: { keeperId: d.keeperId, opened: true },
      gift: { playerId: d.keeperId, item: drawItem(rng) },
    };
  },

  masterView(s) {
    const d = mData(s);
    return { keeperId: d.keeperId, decided: d.opened !== null, cost: Math.floor(s.phaseData.value * C.openCost) };
  },

  playerView(s, p) {
    const d = mData(s);
    const mine = p.id === d.keeperId;
    return {
      keeperId: d.keeperId,
      isKeeper: mine,
      canChoose: s.phaseData.stage === 'play' && mine && d.opened === null,
      myChoice: mine ? d.opened : null,
      cost: Math.floor(s.phaseData.value * C.openCost),
    };
  },
};
