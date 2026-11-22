// L'Enigma del Castello: domande a tempo. Per ogni domanda vale la risposta della
// maggioranza; parità o nessuna risposta = sbagliata. Ogni risposta giusta vale 1/N del premio.
// La risposta giusta arriva ai telefoni solo dopo la chiusura della domanda.
// Tracce: a domanda chiusa si vede chi ha dato quale risposta; alla fine i punti di ognuno.

import { MISSIONS, RIDDLE_QUESTIONS } from '../../config/missions.js';
import { REJECT, check } from '../errors.js';
import { aliveIdList, setTimer, mData, drawFresh } from './common.js';

const C = MISSIONS.riddle;
const question = (d) => RIDDLE_QUESTIONS[d.qIds[d.index]];

function closeQuestion(s) {
  const d = mData(s);
  const q = question(d);
  const counts = q.options.map(() => 0);
  for (const id of d.players) if (d.answers[id] !== undefined) counts[d.answers[id]]++;
  const max = Math.max(...counts);
  const leaders = counts.map((n, i) => (n === max ? i : -1)).filter((i) => i >= 0);
  const groupAnswer = max > 0 && leaders.length === 1 ? leaders[0] : null;
  d.outcomes.push({ groupAnswer, correct: groupAnswer === q.answer, counts, correctIndex: q.answer, answers: { ...d.answers } });
  d.sub = 'reveal';
  setTimer(s, C.revealMs);
}

function questionView(d) {
  const q = question(d);
  const v = { index: d.index, total: d.qIds.length, sub: d.sub, text: q.q, options: [...q.options], correctIndex: null, reveal: null };
  if (d.sub === 'reveal') {
    const o = d.outcomes[d.index];
    v.correctIndex = q.answer;
    v.reveal = {
      groupAnswer: o.groupAnswer,
      correct: o.correct,
      counts: [...o.counts],
      // Traccia: chi ha scelto ogni risposta (pubblico solo a domanda chiusa)
      byOption: q.options.map((_, i) => d.players.filter((id) => o.answers[id] === i)),
    };
  }
  return v;
}

export default {
  id: 'riddle',

  setup(s, rng) {
    s.used.riddle = s.used.riddle || [];
    const qIds = drawFresh(s.used.riddle, RIDDLE_QUESTIONS.length, C.questions, rng);
    return { qIds, index: 0, sub: 'question', answers: {}, outcomes: [], players: aliveIdList(s) };
  },

  start(s) {
    setTimer(s, C.answerMs);
  },

  input(s, p, payload) {
    const d = mData(s);
    check(d.sub === 'question', REJECT.WRONG_PHASE);
    check(d.players.includes(p.id), REJECT.NOT_ALLOWED);
    check(payload.index === d.index, REJECT.STALE);
    const n = question(d).options.length;
    check(Number.isInteger(payload.answer) && payload.answer >= 0 && payload.answer < n, REJECT.INVALID_PAYLOAD);
    check(d.answers[p.id] === undefined, REJECT.ALREADY_DONE);
    d.answers[p.id] = payload.answer;
    if (d.players.every((id) => d.answers[id] !== undefined)) closeQuestion(s);
    return false;
  },

  advance(s) {
    const d = mData(s);
    if (d.sub === 'question') {
      closeQuestion(s);
      return false;
    }
    if (d.index + 1 < d.qIds.length) {
      d.index += 1;
      d.sub = 'question';
      d.answers = {};
      setTimer(s, C.answerMs);
      return false;
    }
    return true;
  },

  result(s) {
    const d = mData(s);
    const correct = d.outcomes.filter((o) => o.correct).length;
    const total = d.qIds.length;
    const coins = Math.round((s.phaseData.value * correct) / total);
    // Traccia: risposte giuste di ognuno (chi non risponde vale come sbagliato)
    const scores = d.players.map((id) => ({ id, correct: d.outcomes.filter((o) => o.answers[id] === o.correctIndex).length }));
    return { success: coins > 0, coins, detail: { correct, total, scores } };
  },

  masterView(s) {
    const d = mData(s);
    return {
      ...questionView(d),
      answeredCount: d.sub === 'question' ? d.players.filter((id) => d.answers[id] !== undefined).length : null,
      playerCount: d.players.length,
    };
  },

  playerView(s, p) {
    const d = mData(s);
    const plays = d.players.includes(p.id);
    return {
      ...questionView(d),
      plays,
      canAnswer: s.phaseData.stage === 'play' && d.sub === 'question' && plays && d.answers[p.id] === undefined,
      // Solo la propria risposta (resta visibile anche alla rivelazione)
      myAnswer: d.answers[p.id] ?? null,
    };
  },
};
