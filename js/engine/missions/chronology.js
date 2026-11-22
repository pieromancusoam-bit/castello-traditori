// La Cronologia: ognuno riceve un evento storico (senza anno) e il gruppo, parlando,
// li mette in ordine; ognuno indica il posto del proprio. Monete in proporzione ai posti
// giusti. Traccia: a gioco finito tutta la fila con anni, posti scelti e posti giusti.

import { MISSIONS, CHRONOLOGY_EVENTS } from '../../config/missions.js';
import { REJECT, check } from '../errors.js';
import { aliveIdList, setTimer, mData, drawFresh } from './common.js';

const C = MISSIONS.chronology;

// Giocatori nell'ordine giusto (dall'evento più antico)
const sortedPlayers = (d) => [...d.players].sort((a, b) => CHRONOLOGY_EVENTS[d.events[a]].year - CHRONOLOGY_EVENTS[d.events[b]].year);

export default {
  id: 'chronology',

  setup(s, rng) {
    s.used.chronology = s.used.chronology || [];
    const players = aliveIdList(s);
    const picked = drawFresh(s.used.chronology, CHRONOLOGY_EVENTS.length, players.length, rng);
    const events = {};
    players.forEach((id, i) => { events[id] = picked[i]; });
    return { players, events, positions: {} };
  },

  start(s) {
    setTimer(s, C.placeMs);
  },

  // payload: { position } da 1 a numero di giocatori
  input(s, p, payload) {
    const d = mData(s);
    check(d.players.includes(p.id), REJECT.NOT_ALLOWED);
    const pos = payload.position;
    check(Number.isInteger(pos) && pos >= 1 && pos <= d.players.length, REJECT.INVALID_PAYLOAD);
    check(d.positions[p.id] === undefined, REJECT.ALREADY_DONE);
    d.positions[p.id] = pos;
    return d.players.every((id) => d.positions[id] !== undefined);
  },

  advance() {
    return true;
  },

  result(s) {
    const d = mData(s);
    const rows = sortedPlayers(d).map((id, i) => ({
      id,
      text: CHRONOLOGY_EVENTS[d.events[id]].text,
      year: CHRONOLOGY_EVENTS[d.events[id]].year,
      position: d.positions[id] ?? null,
      correctPosition: i + 1,
    }));
    const correct = rows.filter((r) => r.position === r.correctPosition).length;
    const coins = Math.round((s.phaseData.value * correct) / rows.length);
    return { success: coins > 0, coins, detail: { correct, total: rows.length, rows } };
  },

  masterView(s) {
    const d = mData(s);
    return {
      placedCount: d.players.filter((id) => d.positions[id] !== undefined).length,
      playerCount: d.players.length,
    };
  },

  // Solo il proprio evento, senza anno
  playerView(s, p) {
    const d = mData(s);
    const plays = d.players.includes(p.id);
    return {
      plays,
      event: plays ? CHRONOLOGY_EVENTS[d.events[p.id]].text : null,
      playerCount: d.players.length,
      canPlace: s.phaseData.stage === 'play' && plays && d.positions[p.id] === undefined,
      myPosition: d.positions[p.id] ?? null,
    };
  },
};
