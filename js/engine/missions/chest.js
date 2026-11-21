// Il Forziere: un gruppo estratto sceglie in segreto Oro o Piombo.
// Con `leadToFail` Piombo o più il forziere resta vuoto. Si mostra solo quanti, mai chi.

import { MISSIONS } from '../../config/missions.js';
import { REJECT, check } from '../errors.js';
import { aliveIdList, setTimer, mData } from './common.js';

const C = MISSIONS.chest;
export const CHEST = Object.freeze({ GOLD: 'gold', LEAD: 'lead' });

export default {
  id: 'chest',

  setup(s, rng) {
    const live = aliveIdList(s);
    const size = Math.min(live.length, Math.max(C.groupMin, Math.floor(live.length * C.groupFraction)));
    const picked = new Set(rng.shuffle(live).slice(0, size));
    return { group: live.filter((id) => picked.has(id)), choices: {} };
  },

  start(s) {
    setTimer(s, C.chooseMs);
  },

  input(s, p, payload) {
    const d = mData(s);
    check(d.group.includes(p.id), REJECT.NOT_ALLOWED);
    check(payload.choice === CHEST.GOLD || payload.choice === CHEST.LEAD, REJECT.INVALID_PAYLOAD);
    check(d.choices[p.id] === undefined, REJECT.ALREADY_DONE);
    d.choices[p.id] = payload.choice;
    return d.group.every((id) => d.choices[id] !== undefined);
  },

  // Chi non ha scelto vale Oro
  advance() {
    return true;
  },

  result(s) {
    const d = mData(s);
    const leadCount = d.group.filter((id) => d.choices[id] === CHEST.LEAD).length;
    const success = leadCount < C.leadToFail;
    return { success, coins: success ? s.phaseData.value : 0, detail: { leadCount, groupSize: d.group.length } };
  },

  masterView(s) {
    const d = mData(s);
    return {
      group: [...d.group],
      chosenCount: d.group.filter((id) => d.choices[id] !== undefined).length,
      leadToFail: C.leadToFail,
    };
  },

  playerView(s, p) {
    const d = mData(s);
    const inGroup = d.group.includes(p.id);
    return {
      group: [...d.group],
      inGroup,
      canChoose: s.phaseData.stage === 'play' && inGroup && d.choices[p.id] === undefined,
      myChoice: d.choices[p.id] ?? null,
      leadToFail: C.leadToFail,
    };
  },
};
