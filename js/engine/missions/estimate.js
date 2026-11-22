// La Stima: lo schermo mostra per pochi secondi una sala piena di oggetti; ognuno scrive
// quanti sono. Si vince se la media cade entro la tolleranza. Traccia: le stime con i nomi.

import { MISSIONS, ESTIMATE_OBJECTS } from '../../config/missions.js';
import { REJECT, check } from '../errors.js';
import { aliveIdList, setTimer, mData } from './common.js';

const C = MISSIONS.estimate;

export default {
  id: 'estimate',

  setup(s, rng) {
    return {
      count: C.min + rng.int(C.max - C.min + 1),
      objectIdx: rng.int(ESTIMATE_OBJECTS.length),
      layoutSeed: rng.int(2 ** 31), // posizione degli oggetti nel disegno
      sub: 'look',
      guesses: {},
      players: aliveIdList(s),
    };
  },

  start(s) {
    setTimer(s, C.lookMs);
  },

  // payload: { value } intero
  input(s, p, payload) {
    const d = mData(s);
    check(d.sub === 'guess', REJECT.WRONG_PHASE);
    check(d.players.includes(p.id), REJECT.NOT_ALLOWED);
    const v = payload.value;
    check(Number.isInteger(v) && v >= 1 && v <= C.maxGuess, REJECT.INVALID_PAYLOAD);
    check(d.guesses[p.id] === undefined, REJECT.ALREADY_DONE);
    d.guesses[p.id] = v;
    return d.players.every((id) => d.guesses[id] !== undefined);
  },

  // Fine dell'immagine -> stime; fine del tempo delle stime -> risultato
  advance(s) {
    const d = mData(s);
    if (d.sub === 'look') {
      d.sub = 'guess';
      setTimer(s, C.guessMs);
      return false;
    }
    return true;
  },

  result(s) {
    const d = mData(s);
    const values = d.players.map((id) => d.guesses[id]).filter((v) => v !== undefined);
    const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
    const success = values.length > 0 && Math.abs(avg - d.count) <= C.tolerance * d.count;
    return {
      success,
      coins: success ? s.phaseData.value : 0,
      detail: {
        count: d.count,
        avg,
        object: ESTIMATE_OBJECTS[d.objectIdx].name,
        estimates: d.players.map((id) => ({ id, value: d.guesses[id] ?? null })),
      },
    };
  },

  masterView(s) {
    const d = mData(s);
    const obj = ESTIMATE_OBJECTS[d.objectIdx];
    return {
      sub: d.sub,
      object: obj.name,
      // Il disegno si vede solo sullo schermo e solo durante l'immagine
      picture: d.sub === 'look' && s.phaseData.stage === 'play' ? { kind: obj.id, count: d.count, seed: d.layoutSeed } : null,
      guessedCount: d.players.filter((id) => d.guesses[id] !== undefined).length,
      playerCount: d.players.length,
    };
  },

  playerView(s, p) {
    const d = mData(s);
    const plays = d.players.includes(p.id);
    return {
      sub: d.sub,
      object: ESTIMATE_OBJECTS[d.objectIdx].name,
      plays,
      canGuess: s.phaseData.stage === 'play' && d.sub === 'guess' && plays && d.guesses[p.id] === undefined,
      myGuess: d.guesses[p.id] ?? null,
      maxGuess: C.maxGuess,
    };
  },
};
