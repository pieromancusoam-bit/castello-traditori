// Le Torce: a ogni giro la torcia si accende sui telefoni dopo un'attesa casuale.
// Il telefono misura da sé il tempo di reazione (così il ritardo del Wi-Fi non conta)
// e lo manda al master. Conta la media del gruppo; chi manca vale `missPenaltyMs`.
// Traccia: a gioco finito la classifica dei tempi medi di ognuno, con i tocchi anticipati.

import { MISSIONS } from '../../config/missions.js';
import { REJECT, check } from '../errors.js';
import { aliveIdList, setTimer, mData } from './common.js';

const C = MISSIONS.torches;
const roundMs = (d) => d.delays[d.round] + C.litMs + C.roundSlackMs;

// Tempo valido o null (mancato, troppo presto, impossibile)
function cleanTime(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return null;
  if (ms < C.minValidMs || ms > C.litMs) return null;
  return Math.round(ms);
}

function nextRound(s) {
  const d = mData(s);
  if (d.round + 1 >= d.delays.length) return true;
  d.round += 1;
  setTimer(s, roundMs(d));
  return false;
}

export function groupAverage(d) {
  let sum = 0;
  let n = 0;
  for (const times of d.times) {
    for (const id of d.players) {
      sum += times[id] ?? C.missPenaltyMs;
      n++;
    }
  }
  return n ? Math.round(sum / n) : C.missPenaltyMs;
}

export default {
  id: 'torches',

  setup(s, rng) {
    const span = C.delayMaxMs - C.delayMinMs;
    const delays = Array.from({ length: C.rounds }, () => C.delayMinMs + Math.round((rng.next() * span) / 10) * 10);
    return { players: aliveIdList(s), delays, round: 0, times: delays.map(() => ({})), reported: delays.map(() => ({})), early: delays.map(() => ({})) };
  },

  start(s) {
    setTimer(s, roundMs(mData(s)));
  },

  // payload: { round, ms, early? } — ms null se mancata; early: toccata prima della fiamma
  input(s, p, payload) {
    const d = mData(s);
    check(d.players.includes(p.id), REJECT.NOT_ALLOWED);
    check(payload.round === d.round, REJECT.STALE);
    check(payload.ms === null || typeof payload.ms === 'number', REJECT.INVALID_PAYLOAD);
    check(!d.reported[d.round][p.id], REJECT.ALREADY_DONE);
    d.reported[d.round][p.id] = true;
    if (payload.early === true) d.early[d.round][p.id] = true;
    const ms = cleanTime(payload.ms);
    if (ms !== null) d.times[d.round][p.id] = ms;
    if (d.players.every((id) => d.reported[d.round][id])) return nextRound(s);
    return false;
  },

  // Timer scaduto o "Avanti": chi non ha risposto ha mancato la torcia
  advance(s) {
    return nextRound(s);
  },

  result(s) {
    const d = mData(s);
    const avgMs = groupAverage(d);
    const value = s.phaseData.value;
    const coins = avgMs <= C.fullBelowMs ? value : avgMs <= C.halfBelowMs ? Math.round(value / 2) : 0;
    // Traccia: media di ognuno, tocchi anticipati e torce mancate (dal più veloce al più lento)
    const ranking = d.players.map((id) => {
      const times = d.times.map((t) => t[id] ?? null);
      const early = d.early.filter((e) => e[id]).length;
      const missed = times.filter((t) => t === null).length - early;
      const avg = Math.round(times.reduce((n, t) => n + (t ?? C.missPenaltyMs), 0) / times.length);
      return { id, avgMs: avg, early, missed };
    }).sort((a, b) => a.avgMs - b.avgMs);
    return { success: coins > 0, coins, detail: { avgMs, fullBelowMs: C.fullBelowMs, halfBelowMs: C.halfBelowMs, ranking } };
  },

  masterView(s) {
    const d = mData(s);
    return {
      round: d.round,
      rounds: d.delays.length,
      reportedCount: d.players.filter((id) => d.reported[d.round][id]).length,
      playerCount: d.players.length,
      fullBelowMs: C.fullBelowMs,
      halfBelowMs: C.halfBelowMs,
    };
  },

  playerView(s, p) {
    const d = mData(s);
    const plays = d.players.includes(p.id);
    return {
      round: d.round,
      rounds: d.delays.length,
      plays,
      canTap: s.phaseData.stage === 'play' && plays && !d.reported[d.round][p.id],
      delayMs: d.delays[d.round],
      litMs: C.litMs,
      // Solo i propri tempi (null = mancata)
      myTimes: plays ? d.times.map((t, i) => (d.reported[i][p.id] ? t[p.id] ?? null : undefined)).filter((t) => t !== undefined) : [],
    };
  },
};
