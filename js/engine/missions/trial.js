// La Prova Fisica: il castello propone una prova da fare nella stanza.
// Alla fine ognuno vota se è riuscita; riesce con la maggioranza dei giocatori in gioco
// (chi non vota conta come "no", la parità è un fallimento). Sullo schermo solo i conteggi.

import { MISSIONS, PHYSICAL_TRIALS } from '../../config/missions.js';
import { REJECT, check } from '../errors.js';
import { aliveIdList, setTimer, mData, drawFresh } from './common.js';

const C = MISSIONS.trial;
const trialOf = (d) => PHYSICAL_TRIALS[d.trialIdx];

export default {
  id: 'trial',

  setup(s, rng) {
    s.used.trial = s.used.trial || [];
    const [trialIdx] = drawFresh(s.used.trial, PHYSICAL_TRIALS.length, 1, rng);
    return { trialIdx, sub: 'doing', votes: {}, players: aliveIdList(s) };
  },

  start(s) {
    setTimer(s, trialOf(mData(s)).ms);
  },

  // payload: { ok: true | false }
  input(s, p, payload) {
    const d = mData(s);
    check(d.sub === 'voting', REJECT.WRONG_PHASE);
    check(d.players.includes(p.id), REJECT.NOT_ALLOWED);
    check(typeof payload.ok === 'boolean', REJECT.INVALID_PAYLOAD);
    check(d.votes[p.id] === undefined, REJECT.ALREADY_DONE);
    d.votes[p.id] = payload.ok;
    return d.players.every((id) => d.votes[id] !== undefined);
  },

  // Fine del tempo della prova -> voto; fine del voto -> risultato
  advance(s) {
    const d = mData(s);
    if (d.sub === 'doing') {
      d.sub = 'voting';
      setTimer(s, C.voteMs);
      return false;
    }
    return true;
  },

  result(s) {
    const d = mData(s);
    const yes = d.players.filter((id) => d.votes[id] === true).length;
    const no = d.players.filter((id) => d.votes[id] === false).length;
    const success = yes * 2 > d.players.length;
    return { success, coins: success ? s.phaseData.value : 0, detail: { yes, no, playerCount: d.players.length } };
  },

  masterView(s) {
    const d = mData(s);
    const t = trialOf(d);
    return {
      sub: d.sub,
      title: t.title,
      text: t.text,
      votedCount: d.players.filter((id) => d.votes[id] !== undefined).length,
      playerCount: d.players.length,
    };
  },

  playerView(s, p) {
    const d = mData(s);
    const t = trialOf(d);
    const plays = d.players.includes(p.id);
    return {
      sub: d.sub,
      title: t.title,
      text: t.text,
      plays,
      canVote: s.phaseData.stage === 'play' && d.sub === 'voting' && plays && d.votes[p.id] === undefined,
      myVote: d.votes[p.id] ?? null,
    };
  },
};
