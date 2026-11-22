// Il Messaggero: uno estratto a caso vede una scena e la descrive a voce, senza le parole
// proibite; gli altri scelgono tra 6 scene. Si vince con la maggioranza giusta.
// Traccia: a gioco finito si vedono il messaggero e la scelta di ognuno.

import { MISSIONS, MESSENGER_SCENES } from '../../config/missions.js';
import { REJECT, check } from '../errors.js';
import { aliveIdList, setTimer, mData } from './common.js';

const C = MISSIONS.messenger;
const titles = (d) => d.options.map((i) => MESSENGER_SCENES[i].title);

export default {
  id: 'messenger',

  setup(s, rng) {
    const live = aliveIdList(s);
    const messengerId = rng.pick(live);
    const options = rng.shuffle(MESSENGER_SCENES.map((_, i) => i)).slice(0, C.options);
    return { messengerId, options, correct: rng.int(options.length), guessers: live.filter((id) => id !== messengerId), picks: {} };
  },

  start(s) {
    setTimer(s, C.describeMs);
  },

  // payload: { choice } indice tra le scene proposte
  input(s, p, payload) {
    const d = mData(s);
    check(d.guessers.includes(p.id), REJECT.NOT_ALLOWED);
    const c = payload.choice;
    check(Number.isInteger(c) && c >= 0 && c < d.options.length, REJECT.INVALID_PAYLOAD);
    check(d.picks[p.id] === undefined, REJECT.ALREADY_DONE);
    d.picks[p.id] = c;
    return d.guessers.every((id) => d.picks[id] !== undefined);
  },

  advance() {
    return true;
  },

  result(s) {
    const d = mData(s);
    const correct = d.guessers.filter((id) => d.picks[id] === d.correct).length;
    const success = correct * 2 > d.guessers.length;
    return {
      success,
      coins: success ? s.phaseData.value : 0,
      detail: {
        messengerId: d.messengerId,
        options: titles(d),
        correctIndex: d.correct,
        correct,
        total: d.guessers.length,
        guessList: d.guessers.map((id) => ({ id, choice: d.picks[id] ?? null })),
      },
    };
  },

  masterView(s) {
    const d = mData(s);
    return {
      messengerId: d.messengerId,
      options: titles(d),
      chosenCount: d.guessers.filter((id) => d.picks[id] !== undefined).length,
      playerCount: d.guessers.length,
    };
  },

  // La scena giusta e le parole proibite solo al messaggero
  playerView(s, p) {
    const d = mData(s);
    const isMessenger = p.id === d.messengerId;
    const guesser = d.guessers.includes(p.id);
    const scene = MESSENGER_SCENES[d.options[d.correct]];
    return {
      messengerId: d.messengerId,
      isMessenger,
      scene: isMessenger ? { title: scene.title, banned: [...scene.banned] } : null,
      options: titles(d),
      canChoose: s.phaseData.stage === 'play' && guesser && d.picks[p.id] === undefined,
      myChoice: d.picks[p.id] ?? null,
    };
  },
};
