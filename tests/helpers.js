// Aiuti per i test del motore (non è un file di test: non finisce in *.test.js).

import assert from 'node:assert/strict';
import { createGame, PHASE } from '../js/engine/state.js';
import { applyAction } from '../js/engine/reducer.js';
import { A, FINAL_CHOICES } from '../js/engine/actions.js';
import { ROLE } from '../js/engine/roles.js';
import { createRng } from '../js/engine/rng.js';

export const makePlayers = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Giocatore ${i + 1}` }));

export function newGame(n, seed = 1, settings) {
  return createGame({ players: makePlayers(n), seed, settings });
}

// Forza i ruoli: traitorIds diventano Traditori, gli altri Leali
export function withRoles(state, traitorIds) {
  const s = structuredClone(state);
  for (const id of s.order) s.players[id].role = traitorIds.includes(id) ? ROLE.TRAITOR : ROLE.FAITHFUL;
  return s;
}

// Applica un'azione che deve essere accettata
export function ok(state, action) {
  const res = applyAction(state, action);
  const rej = res.effects.find((e) => e.type === 'rejected');
  assert.equal(rej, undefined, `azione rifiutata: ${JSON.stringify(action)} -> ${rej && rej.reason}`);
  return res.state;
}

export function rejected(state, action) {
  const res = applyAction(state, action);
  const rej = res.effects.find((e) => e.type === 'rejected');
  assert.ok(rej, `azione accettata ma doveva essere rifiutata: ${JSON.stringify(action)}`);
  assert.equal(res.state, state, 'uno stato rifiutato non deve cambiare');
  return rej.reason;
}

export const advance = (s) => ok(s, { type: A.ADVANCE });
export const alive = (s) => s.order.filter((id) => s.players[id].status === 'alive');

// Tutti vedono il ruolo -> Colazione del giorno 1
export function seeRoles(s) {
  for (const id of s.order) s = ok(s, { type: A.ROLE_SEEN, playerId: id });
  return s;
}

// Tutti i vivi votano secondo la funzione target(voterId)
export function voteAll(s, target) {
  for (const id of alive(s)) {
    if (s.phaseData.stage !== 'voting') break;
    s = ok(s, { type: A.VOTE, playerId: id, payload: { targetId: target(id) } });
  }
  return s;
}

// Mette deepFreeze su tutto lo stato: se il motore lo modificasse, lancerebbe un errore
export function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}

// Possibili azioni "sensate" in questo stato (per le partite casuali)
function possibleActions(s, r) {
  const acts = [];
  const live = alive(s);
  const pick = (arr) => arr[r.int(arr.length)];
  const pd = s.phaseData;
  switch (s.phase) {
    case PHASE.ROLES:
      for (const id of s.order) if (!pd.seen[id]) acts.push({ type: A.ROLE_SEEN, playerId: id });
      break;
    case PHASE.ROUNDTABLE:
    case PHASE.FINAL:
      if (pd.stage === 'voting') {
        for (const id of live) {
          if (pd.ballot.votes[id] !== undefined) continue;
          const options = (pd.ballot.candidates || live).filter((t) => t !== id);
          if (options.length) acts.push({ type: A.VOTE, playerId: id, payload: { targetId: pick(options) } });
        }
      } else if (pd.stage === 'choice') {
        for (const id of live) {
          if (pd.choices[id] !== undefined) continue;
          const choice = r.next() < 0.6 ? FINAL_CHOICES.END : FINAL_CHOICES.BANISH;
          acts.push({ type: A.FINAL_CHOICE, playerId: id, payload: { choice } });
        }
      }
      break;
    case PHASE.NIGHT: {
      const faithful = live.filter((id) => s.players[id].role !== ROLE.TRAITOR);
      for (const id of live) {
        const p = s.players[id];
        const killer = pd.mode === 'murder' && p.role === ROLE.TRAITOR;
        const options = killer ? faithful : live.filter((t) => t !== id);
        if (options.length) acts.push({ type: A.NIGHT_CHOOSE, playerId: id, payload: { targetId: pick(options) } });
        if (killer && r.next() < 0.3) acts.push({ type: A.NIGHT_CHAT, playerId: id, payload: { text: `messaggio segreto di ${id}` } });
      }
      break;
    }
    default:
      break;
  }
  return acts;
}

// Gioca una partita casuale fino alla fine. onState(state) viene chiamata a ogni passo.
export function playRandomGame({ players, seed, onState = () => {}, maxSteps = 5000 }) {
  let s = newGame(players, seed);
  const r = createRng(seed * 7919 + 13);
  onState(s);
  for (let step = 0; step < maxSteps; step++) {
    if (s.phase === PHASE.ENDED) return s;
    const acts = possibleActions(s, r);
    const action = acts.length && r.next() > 0.08 ? acts[r.int(acts.length)] : { type: A.ADVANCE };
    s = ok(s, action);
    onState(s);
  }
  throw new Error(`partita non finita in ${maxSteps} passi (seed ${seed})`);
}
