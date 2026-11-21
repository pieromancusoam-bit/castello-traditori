// Motore puro: applyAction(state, action) -> { state, effects }.
// Niente DOM, rete, timer o Math.random: il caso viene dal generatore con seed salvato
// nello stato (rngState), così la partita è riproducibile e riprende dopo un "Riprendi".
//
// action = { type, playerId?, payload? }. Senza playerId l'azione viene dal master.
// effects: [{ type: 'save' }, { type: 'phase', phase }, { type: 'rejected', reason }]

import { GAME } from '../config/game-config.js';
import { A, PLAYER_ACTIONS, MASTER_ACTIONS, FINAL_CHOICES } from './actions.js';
import { PHASE, STATUS } from './state.js';
import { ROLE } from './roles.js';
import { createRng } from './rng.js';
import { voteError } from './votes.js';
import * as P from './phases.js';

export const REJECT = Object.freeze({
  UNKNOWN_ACTION: 'UNKNOWN_ACTION',
  NOT_ALLOWED: 'NOT_ALLOWED',
  WRONG_PHASE: 'WRONG_PHASE',
  NOT_ALIVE: 'NOT_ALIVE',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  INVALID_TARGET: 'INVALID_TARGET',
  ALREADY_DONE: 'ALREADY_DONE',
});

class Rejection extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason;
  }
}
const reject = (reason) => { throw new Rejection(reason); };
const check = (cond, reason) => { if (!cond) reject(reason); };

export function applyAction(state, action) {
  try {
    validateSource(state, action);
    const s = structuredClone(state); // bozza privata: lo stato ricevuto non si tocca
    const rng = createRng(s.rngState);
    HANDLERS[action.type](s, action, rng);
    s.rngState = rng.state;
    const effects = [{ type: 'save' }];
    if (s.phase !== state.phase) effects.push({ type: 'phase', phase: s.phase });
    return { state: s, effects };
  } catch (err) {
    if (err instanceof Rejection) return { state, effects: [{ type: 'rejected', reason: err.reason }] };
    throw err;
  }
}

function validateSource(state, action) {
  check(action && HANDLERS[action.type], REJECT.UNKNOWN_ACTION);
  if (action.playerId === undefined) check(MASTER_ACTIONS.has(action.type), REJECT.NOT_ALLOWED);
  else {
    check(PLAYER_ACTIONS.has(action.type), REJECT.NOT_ALLOWED);
    check(state.players[action.playerId], REJECT.NOT_ALLOWED);
  }
}

const me = (s, action) => s.players[action.playerId];
const isAlive = (p) => p.status === STATUS.ALIVE;
const payload = (action) => (action.payload && typeof action.payload === 'object' ? action.payload : {});

// Testo della chat: niente caratteri di controllo, spazi compattati, lunghezza massima
export function cleanChatText(raw) {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, GAME.chatMaxLength);
}

const HANDLERS = {
  [A.ROLE_SEEN](s, action) {
    check(s.phase === PHASE.ROLES, REJECT.WRONG_PHASE);
    s.phaseData.seen[action.playerId] = true;
    if (s.order.every((id) => s.phaseData.seen[id])) P.enterBreakfast(s, null);
  },

  [A.VOTE](s, action) {
    const inVote = (s.phase === PHASE.ROUNDTABLE || s.phase === PHASE.FINAL) && s.phaseData.stage === 'voting';
    check(inVote, REJECT.WRONG_PHASE);
    const { targetId } = payload(action);
    check(typeof targetId === 'string', REJECT.INVALID_PAYLOAD);
    const err = voteError(s.phaseData.ballot, action.playerId, targetId, P.aliveIds(s));
    if (err === 'NOT_ALIVE') reject(REJECT.NOT_ALIVE);
    if (err === 'ALREADY_VOTED') reject(REJECT.ALREADY_DONE);
    check(!err, REJECT.INVALID_TARGET);
    s.phaseData.ballot.votes[action.playerId] = targetId;
    if (P.allVoted(s)) P.closeVoting(s);
  },

  [A.NIGHT_CHOOSE](s, action, rng) {
    check(s.phase === PHASE.NIGHT, REJECT.WRONG_PHASE);
    const p = me(s, action);
    check(isAlive(p), REJECT.NOT_ALIVE);
    const { targetId } = payload(action);
    check(typeof targetId === 'string', REJECT.INVALID_PAYLOAD);
    const target = s.players[targetId];
    check(target && isAlive(target) && targetId !== p.id, REJECT.INVALID_TARGET);

    if (s.phaseData.mode === 'murder' && p.role === ROLE.TRAITOR) {
      // Vittima: solo un Leale vivo. La scelta si può cambiare finché non c'è accordo.
      check(target.role !== ROLE.TRAITOR, REJECT.INVALID_TARGET);
      s.phaseData.picks[p.id] = targetId;
    } else {
      // Scelta finta: stessa interfaccia per tutti, nessun effetto
      s.phaseData.decoys[p.id] = targetId;
    }
    if (P.allNightDone(s)) P.resolveNight(s, rng);
  },

  [A.NIGHT_CHAT](s, action) {
    check(s.phase === PHASE.NIGHT && s.phaseData.mode === 'murder', REJECT.WRONG_PHASE);
    const p = me(s, action);
    check(isAlive(p) && p.role === ROLE.TRAITOR, REJECT.NOT_ALLOWED);
    const text = cleanChatText(payload(action).text);
    check(text.length > 0, REJECT.INVALID_PAYLOAD);
    s.phaseData.chat.push({ from: p.id, text });
    if (s.phaseData.chat.length > GAME.chatMaxMessages) s.phaseData.chat.shift();
  },

  [A.FINAL_CHOICE](s, action) {
    check(s.phase === PHASE.FINAL && s.phaseData.stage === 'choice', REJECT.WRONG_PHASE);
    check(isAlive(me(s, action)), REJECT.NOT_ALIVE);
    const { choice } = payload(action);
    check(choice === FINAL_CHOICES.END || choice === FINAL_CHOICES.BANISH, REJECT.INVALID_PAYLOAD);
    check(s.phaseData.choices[action.playerId] === undefined, REJECT.ALREADY_DONE);
    s.phaseData.choices[action.playerId] = choice;
    if (P.allChose(s)) P.resolveChoice(s);
  },

  // "Avanti" del master: chiude ciò che è aperto (chi manca è astenuto) o passa oltre
  [A.ADVANCE](s, action, rng) {
    switch (s.phase) {
      case PHASE.ROLES:
        return P.enterBreakfast(s, null);
      case PHASE.BREAKFAST:
        return P.leaveBreakfast(s);
      case PHASE.ROUNDTABLE:
        return s.phaseData.stage === 'voting' ? P.closeVoting(s) : P.leaveResults(s, rng);
      case PHASE.REVEAL:
        return P.afterDay(s, rng);
      case PHASE.NIGHT:
        return P.resolveNight(s, rng);
      case PHASE.FINAL:
        switch (s.phaseData.stage) {
          case 'choice': return P.resolveChoice(s);
          case 'voting': return P.closeVoting(s);
          case 'results': return P.leaveResults(s, rng);
          case 'reveal': return P.leaveFinalReveal(s);
          case 'unveil': return P.unveilNext(s);
          default: return reject(REJECT.WRONG_PHASE);
        }
      default:
        return reject(REJECT.WRONG_PHASE);
    }
  },
};
