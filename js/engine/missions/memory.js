// La Catena della Memoria: lo schermo mostra una catena di simboli, uno per giocatore,
// ognuno accanto al nome. Poi ognuno indica il proprio. Monete in proporzione alle parti
// ricordate. Traccia: a gioco finito si vede chi ha sbagliato la propria parte.

import { MISSIONS, MEMORY_SYMBOLS } from '../../config/missions.js';
import { REJECT, check } from '../errors.js';
import { aliveIdList, setTimer, mData } from './common.js';

const C = MISSIONS.memory;

export default {
  id: 'memory',

  setup(s, rng) {
    const players = rng.shuffle(aliveIdList(s));
    const chain = {};
    for (const id of players) chain[id] = rng.int(MEMORY_SYMBOLS.length);
    return { players, chain, sub: 'show', picks: {} };
  },

  start(s) {
    const d = mData(s);
    setTimer(s, C.introMs + C.itemMs * d.players.length);
  },

  // payload: { symbol } indice in MEMORY_SYMBOLS
  input(s, p, payload) {
    const d = mData(s);
    check(d.sub === 'pick', REJECT.WRONG_PHASE);
    check(d.players.includes(p.id), REJECT.NOT_ALLOWED);
    const sym = payload.symbol;
    check(Number.isInteger(sym) && sym >= 0 && sym < MEMORY_SYMBOLS.length, REJECT.INVALID_PAYLOAD);
    check(d.picks[p.id] === undefined, REJECT.ALREADY_DONE);
    d.picks[p.id] = sym;
    return d.players.every((id) => d.picks[id] !== undefined);
  },

  advance(s) {
    const d = mData(s);
    if (d.sub === 'show') {
      d.sub = 'pick';
      setTimer(s, C.pickMs);
      return false;
    }
    return true;
  },

  result(s) {
    const d = mData(s);
    const rows = d.players.map((id) => ({ id, symbol: d.chain[id], chosen: d.picks[id] ?? null }));
    const correct = rows.filter((r) => r.chosen === r.symbol).length;
    const coins = Math.round((s.phaseData.value * correct) / d.players.length);
    return { success: coins > 0, coins, detail: { correct, total: d.players.length, rows } };
  },

  masterView(s) {
    const d = mData(s);
    return {
      sub: d.sub,
      // La catena si vede solo sullo schermo e solo mentre scorre
      chain: d.sub === 'show' && s.phaseData.stage === 'play' ? d.players.map((id) => ({ playerId: id, symbol: d.chain[id] })) : null,
      itemMs: C.itemMs,
      introMs: C.introMs,
      pickedCount: d.players.filter((id) => d.picks[id] !== undefined).length,
      playerCount: d.players.length,
    };
  },

  playerView(s, p) {
    const d = mData(s);
    const plays = d.players.includes(p.id);
    return {
      sub: d.sub,
      plays,
      canPick: s.phaseData.stage === 'play' && d.sub === 'pick' && plays && d.picks[p.id] === undefined,
      myPick: d.picks[p.id] ?? null,
    };
  },
};
