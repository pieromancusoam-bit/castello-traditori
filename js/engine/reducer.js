// Motore puro: applyAction(state, action) -> { state, effects }.
// Niente DOM, rete, timer o Math.random: il caso viene dal generatore con seed salvato
// nello stato (rngState), così la partita è riproducibile e riprende dopo un "Riprendi".
//
// action = { type, playerId?, payload? }. Senza playerId l'azione viene dal master.
// effects: [{ type: 'save' }, { type: 'phase', phase }, { type: 'rejected', reason }]

import { GAME } from '../config/game-config.js';
import { A, PLAYER_ACTIONS, MASTER_ACTIONS, FINAL_CHOICES } from './actions.js';
import { PHASE, STATUS } from './state.js';
import { ROLE, factionOf, isTraitorRole } from './roles.js';
import { createRng } from './rng.js';
import { voteError } from './votes.js';
import * as P from './phases.js';
import { REJECT, Rejection, reject, check } from './errors.js';
import { clearTimer } from './missions/common.js';
import { ITEM, hasItem, takeItem, itemActions, votersAgainst } from './items.js';

export { REJECT };

const utf8 = new TextEncoder();

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
    // Maledetto: alla Tavola Rotonda non vota
    check(s.phase !== PHASE.ROUNDTABLE || !s.curses.includes(action.playerId), REJECT.NOT_ALLOWED);
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

    const pd = s.phaseData;
    if (P.isKiller(s, p)) {
      check(P.canKill(s, p, targetId), REJECT.INVALID_TARGET);
      check(!pd.offer, REJECT.ALREADY_DONE); // offerta partita: la scelta non si cambia più
      pd.picks[p.id] = targetId;
      if (pd.plan === 'seduce') {
        // Seduzione: il Traditore (solo) indica un Leale, che riceve l'offerta anonima
        pd.offer = { kind: 'seduce', byIds: [p.id], targetId, answer: null };
      } else if (pd.plan === 'ultimatum' && P.nightConsensus(s)) {
        // Ultimatum: parte quando tutti i Traditori indicano lo stesso nome
        pd.offer = { kind: 'ultimatum', byIds: P.nightKillers(s).map((k) => k.id), targetId, answer: null };
      }
      // Omicidio: la scelta si può cambiare finché non c'è accordo
    } else {
      // Sospetto notturno (Leali, Traditore Segreto, Traditore appena scelto dal castello):
      // alla Colazione il castello annuncia il più sospettato, senza dire chi lo ha indicato
      pd.suspicions[p.id] = targetId;
    }
    if (P.allNightDone(s)) P.resolveNight(s, rng);
  },

  [A.NIGHT_CHAT](s, action) {
    check(s.phase === PHASE.NIGHT && s.phaseData.mode === 'murder', REJECT.WRONG_PHASE);
    const p = me(s, action);
    check(isAlive(p) && P.isKiller(s, p), REJECT.NOT_ALLOWED);
    const text = cleanChatText(payload(action).text);
    check(text.length > 0, REJECT.INVALID_PAYLOAD);
    s.phaseData.chat.push({ from: p.id, text });
    // Si tengono solo gli ultimi messaggi: la vista deve stare in un solo messaggio di rete
    const bytes = () => s.phaseData.chat.reduce((n, m) => n + utf8.encode(m.text).byteLength, 0);
    while (s.phaseData.chat.length > GAME.chatMaxMessages || bytes() > GAME.chatMaxBytes) s.phaseData.chat.shift();
  },

  // "Assassinare", "Sedurre" (prima notte con un solo Traditore) o "Ultimatum" (dopo il bando
  // del primo Traditore), finché l'offerta non è partita. Cambiare piano azzera le scelte.
  [A.NIGHT_PLAN](s, action) {
    check(s.phase === PHASE.NIGHT, REJECT.WRONG_PHASE);
    const p = me(s, action);
    const pd = s.phaseData;
    check(isAlive(p) && P.isKiller(s, p) && (pd.canSeduce || pd.canUltimatum), REJECT.NOT_ALLOWED);
    const { plan } = payload(action);
    const allowed = plan === 'murder' || (plan === 'seduce' && pd.canSeduce) || (plan === 'ultimatum' && pd.canUltimatum);
    check(allowed, REJECT.INVALID_PAYLOAD);
    check(!pd.offer, REJECT.ALREADY_DONE);
    if (pd.plan !== plan) pd.picks = {};
    pd.plan = plan;
  },

  // Il Leale che riceve l'offerta (Seduzione o Ultimatum) accetta o rifiuta in segreto.
  // Se accetta diventa Traditore subito (vede i complici) e uccide dalla notte dopo.
  [A.SEDUCTION_ANSWER](s, action, rng) {
    check(s.phase === PHASE.NIGHT, REJECT.WRONG_PHASE);
    const p = me(s, action);
    const pd = s.phaseData;
    check(isAlive(p) && pd.offer && pd.offer.targetId === p.id, REJECT.NOT_ALLOWED);
    check(pd.offer.answer === null, REJECT.ALREADY_DONE);
    const { accept } = payload(action);
    check(typeof accept === 'boolean', REJECT.INVALID_PAYLOAD);
    pd.offer.answer = accept;
    if (accept) {
      p.role = ROLE.TRAITOR; // anche un Veggente, un Cavaliere o il Traditore Segreto
      p.turnedOnDay = s.day;
    }
    if (P.allNightDone(s)) P.resolveNight(s, rng);
  },

  // Veggente: una volta per partita, di notte, scopre la fazione di un giocatore
  [A.NIGHT_VISION](s, action, rng) {
    check(s.phase === PHASE.NIGHT, REJECT.WRONG_PHASE);
    const p = me(s, action);
    check(isAlive(p) && p.role === ROLE.SEER, REJECT.NOT_ALLOWED);
    check(!p.vision, REJECT.ALREADY_DONE);
    const { targetId } = payload(action);
    const target = s.players[targetId];
    check(target && isAlive(target) && targetId !== p.id, REJECT.INVALID_TARGET);
    p.vision = { day: s.day, targetId, faction: factionOf(target.role) };
    if (P.allNightDone(s)) P.resolveNight(s, rng);
  },

  // Traditore Segreto: ad accordo raggiunto cambia la vittima ({ targetId }) o la lascia ({ targetId: null })
  [A.NIGHT_SWAP](s, action, rng) {
    check(s.phase === PHASE.NIGHT, REJECT.WRONG_PHASE);
    const p = me(s, action);
    const pd = s.phaseData;
    check(P.secretCanSwap(s, p), REJECT.NOT_ALLOWED);
    check(!pd.swapDecided, REJECT.ALREADY_DONE);
    check(P.nightConsensus(s) !== null, REJECT.WRONG_PHASE);
    const { targetId } = payload(action);
    if (targetId !== null) {
      const target = s.players[targetId];
      check(target && isAlive(target) && targetId !== p.id && !isTraitorRole(target.role), REJECT.INVALID_TARGET);
      pd.swap = targetId;
      p.swapUsed = true;
    }
    pd.swapDecided = true;
    if (P.allNightDone(s)) P.resolveNight(s, rng);
  },

  [A.FINAL_CHOICE](s, action) {
    check(s.phase === PHASE.FINAL && s.phaseData.stage === 'choice', REJECT.WRONG_PHASE);
    check(isAlive(me(s, action)), REJECT.NOT_ALIVE);
    const { choice } = payload(action);
    check(choice === FINAL_CHOICES.END || choice === FINAL_CHOICES.BANISH, REJECT.INVALID_PAYLOAD);
    check(s.phaseData.choices[action.playerId] === undefined, REJECT.ALREADY_DONE);
    s.phaseData.choices[action.playerId] = choice;
    if (P.allChose(s)) P.closeChoice(s);
  },

  [A.MISSION_INPUT](s, action, rng) {
    check(s.phase === PHASE.MISSION && s.phaseData.stage === 'play', REJECT.WRONG_PHASE);
    const p = me(s, action);
    check(isAlive(p), REJECT.NOT_ALIVE);
    if (P.currentMission(s).input(s, p, payload(action), rng)) P.finishMission(s, rng);
  },

  // Oggetti: ognuno ha il suo momento (vedi js/engine/items.js)
  [A.USE_ITEM](s, action) {
    const p = me(s, action);
    check(isAlive(p), REJECT.NOT_ALIVE);
    const { item, targetId } = payload(action);
    check(Object.values(ITEM).includes(item) && item !== ITEM.SHIELD, REJECT.INVALID_PAYLOAD);
    check(hasItem(p, item), REJECT.NOT_ALLOWED);
    const can = itemActions(s, p);
    switch (item) {
      case ITEM.DAGGER: {
        check(can.dagger, REJECT.WRONG_PHASE);
        const ballot = s.phaseData.ballot;
        ballot.daggers = { ...(ballot.daggers || {}), [p.id]: true };
        break;
      }
      case ITEM.CURSE:
        check(can.curse, REJECT.WRONG_PHASE);
        check(typeof targetId === 'string' && can.curse.includes(targetId), REJECT.INVALID_TARGET);
        s.curses.push(targetId);
        break;
      case ITEM.SEAL:
        check(can.seal, REJECT.WRONG_PHASE);
        s.curses = s.curses.filter((id) => id !== p.id);
        s.sealed.push(p.id);
        break;
      case ITEM.MIRROR:
        check(can.mirror, REJECT.WRONG_PHASE);
        p.mirror = { day: s.lastBallot.day, voters: votersAgainst(s, p.id) };
        break;
      default:
        reject(REJECT.INVALID_PAYLOAD);
    }
    takeItem(p, item);
    // Un maledetto che si libera può votare; se mancava solo lui, la votazione si chiude
    if (s.phase === PHASE.ROUNDTABLE && s.phaseData.stage === 'voting' && P.allVoted(s)) P.closeVoting(s);
  },

  // Il tempo è scaduto: vale solo per il timer ancora in corso (la chiave lo identifica)
  [A.TIMER_EXPIRED](s, action, rng) {
    const timer = s.phaseData && s.phaseData.timer;
    check(timer && payload(action).key === timer.key, REJECT.STALE);
    if (s.phase === PHASE.MISSION && s.phaseData.stage === 'play') return P.advanceMission(s, rng);
    // Presentazioni: il tempo è finito, ma si passa al prossimo solo con "Avanti"
    if (s.phase === PHASE.PRESENTATIONS) return clearTimer(s);
    if (s.phase === PHASE.ROUNDTABLE && s.phaseData.stage === 'discussion') return P.openVoting(s);
    return reject(REJECT.WRONG_PHASE);
  },

  // Solo per le prove (?debug=1): sceglie il prossimo gioco o il prossimo evento
  [A.DEBUG_NEXT](s, action) {
    const { mission, event } = payload(action);
    s.debugNext = { ...(s.debugNext || {}) };
    if (typeof mission === 'string') s.debugNext.mission = mission;
    if (typeof event === 'string') s.debugNext.event = event;
  },

  // "Avanti" del master: chiude ciò che è aperto (chi manca è astenuto) o passa oltre
  [A.ADVANCE](s, action, rng) {
    switch (s.phase) {
      case PHASE.ROLES:
        return P.enterBreakfast(s, null);
      case PHASE.BREAKFAST:
        return P.leaveBreakfast(s, rng);
      case PHASE.PRESENTATIONS:
        return P.nextPresentation(s, rng);
      case PHASE.MISSION:
        return P.advanceMission(s, rng);
      case PHASE.ROUNDTABLE:
        // La discussione minima non si salta (solo con { force: true }, per le prove con ?debug=1)
        if (s.phaseData.stage === 'discussion') {
          check(payload(action).force === true, REJECT.WRONG_PHASE);
          return P.openVoting(s);
        }
        return s.phaseData.stage === 'voting' ? P.closeVoting(s) : P.leaveResults(s, rng);
      case PHASE.REVEAL:
        return P.afterDay(s, rng);
      case PHASE.NIGHT:
        return P.resolveNight(s, rng);
      case PHASE.FINAL:
        switch (s.phaseData.stage) {
          case 'choice': return P.closeChoice(s);
          case 'choice-reveal': return P.resolveChoice(s);
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
