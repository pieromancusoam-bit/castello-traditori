// L'Asta: uno Scudo all'asta, offerte segrete pagate con il montepremi.
// Vince l'offerta più alta (parità: a sorte); il montepremi scende del prezzo. Si vede il prezzo,
// mai chi ha vinto né le offerte.

import { MISSIONS } from '../../config/missions.js';
import { REJECT, check } from '../errors.js';
import { aliveIdList, setTimer, mData } from './common.js';

const C = MISSIONS.auction;

export default {
  id: 'auction',
  dropsItem: false, // l'oggetto è lo Scudo all'asta
  noDouble: true,

  setup(s) {
    return { players: aliveIdList(s), bids: {}, maxBid: s.pot };
  },

  start(s) {
    setTimer(s, C.bidMs);
  },

  input(s, p, payload) {
    const d = mData(s);
    check(d.players.includes(p.id), REJECT.NOT_ALLOWED);
    check(Number.isInteger(payload.bid) && payload.bid >= 0 && payload.bid <= d.maxBid, REJECT.INVALID_PAYLOAD);
    check(d.bids[p.id] === undefined, REJECT.ALREADY_DONE);
    d.bids[p.id] = payload.bid;
    return d.players.every((id) => d.bids[id] !== undefined);
  },

  // Chi non offre in tempo vale zero
  advance() {
    return true;
  },

  result(s, rng) {
    const d = mData(s);
    const best = Math.max(0, ...Object.values(d.bids));
    if (best === 0) return { success: false, coins: 0, detail: { price: 0, sold: false } };
    const top = d.players.filter((id) => d.bids[id] === best);
    const winner = top.length === 1 ? top[0] : rng.pick(top);
    return { success: true, coins: -best, detail: { price: best, sold: true }, gift: { playerId: winner, item: 'shield' } };
  },

  masterView(s) {
    const d = mData(s);
    return { bidCount: d.players.filter((id) => d.bids[id] !== undefined).length, playerCount: d.players.length, maxBid: d.maxBid };
  },

  playerView(s, p) {
    const d = mData(s);
    const plays = d.players.includes(p.id);
    return {
      plays,
      canBid: s.phaseData.stage === 'play' && plays && d.bids[p.id] === undefined,
      myBid: d.bids[p.id] ?? null,
      maxBid: d.maxBid,
    };
  },
};
