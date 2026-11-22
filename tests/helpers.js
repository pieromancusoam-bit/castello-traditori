// Aiuti per i test del motore (non è un file di test: non finisce in *.test.js).

import assert from 'node:assert/strict';
import { createGame, PHASE } from '../js/engine/state.js';
import { applyAction } from '../js/engine/reducer.js';
import { A, FINAL_CHOICES } from '../js/engine/actions.js';
import { ROLE, isTraitorRole } from '../js/engine/roles.js';
import { isKiller, canKill, secretCanSwap, nightConsensus } from '../js/engine/phases.js';
import { itemActions } from '../js/engine/items.js';
import { createRng } from '../js/engine/rng.js';

export const makePlayers = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Giocatore ${i + 1}` }));

// Di base le regole "essenziali" della Fase 1: niente missioni, presentazioni, discussione
// minima e Seduzione; Cerimonia con 4. Le regole nuove hanno test propri che le accendono.
// Fase 3: niente ruoli speciali, eventi e Ultimatum nelle regole "essenziali".
export const BASIC = Object.freeze({
  missions: false, presentations: false, discussion: false, seduction: false, finalThreshold: 4,
  ultimatum: false, roles: { seer: false, knight: false, secretTraitor: false },
  events: { fog: false, doubleStakes: false, banquet: false, daylightMurder: false },
});
export function newGame(n, seed = 1, settings = {}) {
  return createGame({ players: makePlayers(n), seed, settings: { ...BASIC, ...settings } });
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
          if (s.phase === PHASE.ROUNDTABLE && s.curses.includes(id)) continue; // maledetto
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
      for (const id of live) {
        const p = s.players[id];
        const target = pd.offer && pd.offer.targetId === id;
        if (target && pd.offer.answer === null) {
          acts.push({ type: A.SEDUCTION_ANSWER, playerId: id, payload: { accept: r.next() < 0.5 } });
          continue;
        }
        if (isKiller(s, p)) {
          if (pd.offer) continue;
          const plans = ['murder', ...(pd.canSeduce ? ['seduce'] : []), ...(pd.canUltimatum ? ['ultimatum'] : [])];
          if (plans.length > 1 && r.next() < 0.3) acts.push({ type: A.NIGHT_PLAN, playerId: id, payload: { plan: pick(plans) } });
          const options = live.filter((t) => canKill(s, p, t));
          if (options.length) acts.push({ type: A.NIGHT_CHOOSE, playerId: id, payload: { targetId: pick(options) } });
          if (r.next() < 0.3) acts.push({ type: A.NIGHT_CHAT, playerId: id, payload: { text: `messaggio segreto di ${id}` } });
          continue;
        }
        const others = live.filter((t) => t !== id);
        if (p.role === ROLE.SEER && !p.vision && r.next() < 0.5) acts.push({ type: A.NIGHT_VISION, playerId: id, payload: { targetId: pick(others) } });
        if (secretCanSwap(s, p) && !pd.swapDecided && nightConsensus(s)) {
          const swapTo = others.filter((t) => !isTraitorRole(s.players[t].role));
          acts.push({ type: A.NIGHT_SWAP, playerId: id, payload: { targetId: swapTo.length && r.next() < 0.5 ? pick(swapTo) : null } });
        }
        if (others.length) acts.push({ type: A.NIGHT_CHOOSE, playerId: id, payload: { targetId: pick(others) } });
      }
      break;
    }
    case PHASE.MISSION:
      if (pd.stage === 'play') acts.push(...missionInputs(s, r, live));
      break;
    case PHASE.SCENE:
      for (const id of live) {
        if (pd.touched[id] !== undefined) continue;
        acts.push({ type: A.SCENE_TOUCH, playerId: id, payload: { targetId: pick(live.filter((t) => t !== id)) } });
      }
      break;
    default:
      break;
  }
  for (const id of live) {
    const a = itemActions(s, s.players[id]);
    const use = (item, targetId) => acts.push({ type: A.USE_ITEM, playerId: id, payload: targetId ? { item, targetId } : { item } });
    if (a.dagger) use('dagger');
    if (a.seal) use('seal');
    if (a.mirror && r.next() < 0.3) use('mirror');
    if (a.curse && a.curse.length) use('curse', pick(a.curse));
  }
  if (pd.timer && r.next() < 0.05) acts.push({ type: A.TIMER_EXPIRED, payload: { key: pd.timer.key } });
  return acts;
}

// Mosse casuali per la missione in corso
function missionInputs(s, r, live) {
  const d = s.phaseData.data;
  const input = (playerId, payload) => ({ type: A.MISSION_INPUT, playerId, payload });
  switch (s.phaseData.id) {
    case 'chest':
      return d.group.filter((id) => d.choices[id] === undefined)
        .map((id) => input(id, { choice: r.next() < 0.7 ? 'gold' : 'lead' }));
    case 'riddle':
      if (d.sub !== 'question') return [];
      return d.players.filter((id) => d.answers[id] === undefined)
        .map((id) => input(id, { index: d.index, answer: r.int(4) }));
    case 'torches':
      return d.players.filter((id) => !d.reported[d.round][id])
        .map((id) => input(id, { round: d.round, ms: r.next() < 0.1 ? null : 150 + r.int(800) }));
    case 'trial':
      if (d.sub !== 'voting') return [];
      return d.players.filter((id) => d.votes[id] === undefined).map((id) => input(id, { ok: r.next() < 0.6 }));
    case 'estimate':
      if (d.sub !== 'guess') return [];
      return d.players.filter((id) => d.guesses[id] === undefined).map((id) => input(id, { value: 20 + r.int(150) }));
    case 'memory':
      if (d.sub !== 'pick') return [];
      return d.players.filter((id) => d.picks[id] === undefined).map((id) => input(id, { symbol: r.int(6) }));
    case 'chronology':
      return d.players.filter((id) => d.positions[id] === undefined).map((id) => input(id, { position: 1 + r.int(d.players.length) }));
    case 'messenger':
      return d.guessers.filter((id) => d.picks[id] === undefined).map((id) => input(id, { choice: r.int(d.options.length) }));
    default:
      return [];
  }
}

// Gioca una partita casuale fino alla fine. onState(state) viene chiamata a ogni passo.
export function playRandomGame({ players, seed, onState = () => {}, maxSteps = 8000 }) {
  // Tutte le regole accese: ruoli speciali, eventi (sempre, quando possibili), Ultimatum
  const settings = { roles: { seer: true, knight: true, secretTraitor: true }, eventChance: 1, ultimatum: true };
  let s = createGame({ players: makePlayers(players), seed, settings });
  const r = createRng(seed * 7919 + 13);
  // Oggetti in mano fin dall'inizio, per provarli tutti
  for (const id of s.order) s.players[id].items.push(...['dagger', 'curse', 'seal', 'mirror', 'shield'].filter(() => r.next() < 0.25));
  onState(s);
  for (let step = 0; step < maxSteps; step++) {
    if (s.phase === PHASE.ENDED) return s;
    const acts = possibleActions(s, r);
    let action = acts.length && r.next() > 0.08 ? acts[r.int(acts.length)] : { type: A.ADVANCE };
    // La discussione della Tavola Rotonda non si salta: finisce solo con il tempo
    if (action.type === A.ADVANCE && s.phaseData.stage === 'discussion') action = { type: A.TIMER_EXPIRED, payload: { key: s.phaseData.timer.key } };
    s = ok(s, action);
    onState(s);
  }
  throw new Error(`partita non finita in ${maxSteps} passi (seed ${seed})`);
}
