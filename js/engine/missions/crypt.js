// Il Codice della Cripta: un codice di 4 cifre e un frammento di indizio per ognuno.
// I Traditori ricevono un frammento falso, credibile ma sbagliato (e sanno che è falso).
// Ognuno scrive il codice sul telefono: vale quello della maggioranza; monete per ogni cifra giusta.
//
// Il frammento di un Leale non dipende dai ruoli altrui: a ogni giocatore tocca un posto
// (estratto senza guardare i ruoli) e per ogni posto si preparano la versione vera e quella falsa.

import { MISSIONS } from '../../config/missions.js';
import { REJECT, check } from '../errors.js';
import { aliveIdList, setTimer, mData } from './common.js';
import { isTraitorRole } from '../roles.js';

const C = MISSIONS.crypt;
const ORD = ['prima', 'seconda', 'terza', 'quarta'];
const KINDS = ['direct', 'parity', 'sum', 'compare'];

const relation = (a, b) => (a > b ? 'maggiore della' : a < b ? 'minore della' : 'uguale alla');

// Frammento k: vera e falsa, sul codice `code` (array di cifre)
function fragment(k, code, rng) {
  const i = k % 4;
  const kind = KINDS[Math.floor(k / 4) % KINDS.length];
  const d = code[i];
  switch (kind) {
    case 'direct': {
      const fake = (d + 1 + rng.int(9)) % 10;
      return { truth: `La ${ORD[i]} cifra è ${d}.`, lie: `La ${ORD[i]} cifra è ${fake}.` };
    }
    case 'parity': {
      const par = (x) => (x % 2 === 0 ? 'pari' : 'dispari');
      const size = d >= 5 ? 'maggiore di 4' : 'minore di 5';
      const otherSize = d >= 5 ? 'minore di 5' : 'maggiore di 4';
      const fakePar = par(d + 1);
      // Il falso sbaglia la parità o la grandezza (a caso)
      const lie = rng.next() < 0.5 ? `La ${ORD[i]} cifra è ${fakePar} e ${size}.` : `La ${ORD[i]} cifra è ${par(d)} e ${otherSize}.`;
      return { truth: `La ${ORD[i]} cifra è ${par(d)} e ${size}.`, lie };
    }
    case 'sum': {
      const j = (i + 1) % 4;
      const sum = d + code[j];
      const shift = (1 + rng.int(3)) * (sum >= 3 && rng.next() < 0.5 ? -1 : 1);
      return { truth: `La ${ORD[i]} e la ${ORD[j]} cifra sommate fanno ${sum}.`, lie: `La ${ORD[i]} e la ${ORD[j]} cifra sommate fanno ${sum + shift}.` };
    }
    default: {
      const j = (i + 2) % 4;
      const rel = relation(d, code[j]);
      const others = ['maggiore della', 'minore della', 'uguale alla'].filter((r) => r !== rel);
      return { truth: `La ${ORD[i]} cifra è ${rel} ${ORD[j]}.`, lie: `La ${ORD[i]} cifra è ${others[rng.int(others.length)]} ${ORD[j]}.` };
    }
  }
}

// Il codice della maggioranza (null se c'è parità tra i più scritti o nessuno ha scritto)
function groupCode(d) {
  const counts = {};
  for (const id of d.players) {
    const c = d.entered[id];
    if (c) counts[c] = (counts[c] || 0) + 1;
  }
  const max = Math.max(0, ...Object.values(counts));
  const top = Object.keys(counts).filter((c) => counts[c] === max);
  return max > 0 && top.length === 1 ? top[0] : null;
}

export default {
  id: 'crypt',

  setup(s, rng) {
    const players = aliveIdList(s);
    const digits = Array.from({ length: C.digits }, () => rng.int(10));
    const fragments = players.map((_, k) => fragment(k, digits, rng));
    const slots = rng.shuffle(players.map((_, k) => k));
    const slotOf = {};
    players.forEach((id, n) => { slotOf[id] = slots[n]; });
    return { players, secretCode: digits.join(''), fragments, slotOf, entered: {} };
  },

  start(s) {
    setTimer(s, C.enterMs);
  },

  input(s, p, payload) {
    const d = mData(s);
    check(d.players.includes(p.id), REJECT.NOT_ALLOWED);
    check(typeof payload.code === 'string' && new RegExp(`^\\d{${C.digits}}$`).test(payload.code), REJECT.INVALID_PAYLOAD);
    check(d.entered[p.id] === undefined, REJECT.ALREADY_DONE);
    d.entered[p.id] = payload.code;
    return d.players.every((id) => d.entered[id] !== undefined);
  },

  advance() {
    return true;
  },

  result(s) {
    const d = mData(s);
    const group = groupCode(d);
    const correct = group ? [...group].filter((c, i) => c === d.secretCode[i]).length : 0;
    return {
      success: correct === C.digits,
      coins: Math.round((s.phaseData.value * correct) / C.digits),
      // Tracce: il codice scritto da ognuno (mai i frammenti: quelli falsi svelerebbero i Traditori)
      detail: { solution: d.secretCode, groupAnswer: group, correct, total: C.digits, typed: d.players.map((id) => ({ id, value: d.entered[id] ?? null })) },
    };
  },

  masterView(s) {
    const d = mData(s);
    return { enteredCount: d.players.filter((id) => d.entered[id] !== undefined).length, playerCount: d.players.length, digits: C.digits };
  },

  playerView(s, p) {
    const d = mData(s);
    const plays = d.players.includes(p.id);
    const frag = plays ? d.fragments[d.slotOf[p.id]] : null;
    // Il Traditore sa che il suo frammento è falso
    const fake = plays && isTraitorRole(p.role);
    return {
      plays,
      fragment: frag ? (fake ? frag.lie : frag.truth) : null,
      fake,
      canEnter: s.phaseData.stage === 'play' && plays && d.entered[p.id] === undefined,
      myCode: d.entered[p.id] ?? null,
      digits: C.digits,
    };
  },
};
