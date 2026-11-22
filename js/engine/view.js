// Viste filtrate: cosa può sapere un telefono (viewFor) e cosa va sullo schermo
// condiviso (viewForMaster). Si costruiscono DA ZERO, campo per campo (allow-list):
// mai copiare lo stato e togliere pezzi.

import { PHASE, STATUS } from './state.js';
import { ROLE, factionOf, isTraitorRole } from './roles.js';
import { nightConsensus, nightKillers, isKiller, canKill, secretCanSwap, voterIds } from './phases.js';
import { itemActions } from './items.js';
import { PRESENTATION_THEMES } from '../config/presentations.js';
import { MISSION_MODULES } from './missions/index.js';

const ids = (list) => (list ? [...list] : null);
const isAlive = (p) => p.status === STATUS.ALIVE;
const aliveIdList = (s) => s.order.filter((id) => isAlive(s.players[id]));

// Fazione nota a tutti: bandito, rivelato nella Cerimonia, oppure partita finita
function isRevealed(s, id) {
  if (s.phase === PHASE.ENDED) return true;
  if (s.players[id].status === STATUS.BANISHED) return true;
  return s.phase === PHASE.FINAL && s.phaseData.stage === 'unveil' && s.phaseData.revealed.includes(id);
}

function publicPlayers(s) {
  return s.order.map((id) => {
    const p = s.players[id];
    const e = { id: p.id, name: p.name, status: p.status, faction: isRevealed(s, id) ? factionOf(p.role) : null };
    // A fine partita si scoprono anche i ruoli speciali
    if (s.phase === PHASE.ENDED) e.role = p.role;
    return e;
  });
}

function publicHistory(s) {
  return s.history.map((h) => {
    const e = { day: h.day, type: h.type };
    if (h.playerId) e.playerId = h.playerId;
    if (h.type === 'banished') e.faction = h.faction;
    return e;
  });
}

function publicOutcome(o) {
  if (!o) return null;
  if (o.kind === 'banish') return { kind: o.kind, playerId: o.playerId };
  if (o.kind === 'runoff') return { kind: o.kind, candidates: ids(o.candidates) };
  return { kind: o.kind, reason: o.reason };
}

// A fine partita il montepremi si divide tra i sopravvissuti della fazione vincente
function prizeOf(s) {
  if (s.phase !== PHASE.ENDED) return null;
  const winners = aliveIdList(s).filter((id) => factionOf(s.players[id].role) === s.winner);
  return { pot: s.pot, winners, share: winners.length ? Math.floor(s.pot / winners.length) : 0 };
}

function common(s) {
  return {
    phase: s.phase,
    day: s.day,
    pot: s.pot,
    missions: s.missionLog.map((m) => ({ day: m.day, id: m.id, coins: m.coins })),
    players: publicPlayers(s),
    history: publicHistory(s),
    winner: s.phase === PHASE.ENDED ? s.winner : null,
    prize: prizeOf(s),
    // Maledetti per la Tavola Rotonda di oggi e chi si è liberato con il Sigillo (mai chi ha maledetto)
    curses: [...(s.curses || [])],
    sealed: [...(s.sealed || [])],
  };
}

const timerView = (pd) => (pd.timer ? { key: pd.timer.key, ms: pd.timer.ms } : null);

// Presentazioni: chi tocca e con quale tema (pubblico: lo vedono tutti sulla TV)
function presentationStep(s) {
  const pd = s.phaseData;
  const playerId = pd.order[pd.index];
  return { playerId, theme: PRESENTATION_THEMES[pd.themes[playerId]], index: pd.index, total: pd.order.length, next: pd.order[pd.index + 1] ?? null, timer: timerView(pd) };
}

// Missione: parte comune + allow-list del modulo della missione (p = null per lo schermo)
function missionStep(s, p) {
  const pd = s.phaseData;
  const m = MISSION_MODULES[pd.id];
  return {
    id: pd.id,
    stage: pd.stage,
    slot: pd.slot,
    perDay: pd.perDay,
    value: pd.value,
    timer: timerView(pd),
    result: pd.result ? { success: pd.result.success, coins: pd.result.coins, detail: structuredClone(pd.result.detail), itemGiven: Boolean(pd.gift) } : null,
    // Oggetto vinto: solo a chi l'ha ricevuto
    myGift: p && pd.gift && pd.gift.playerId === p.id ? pd.gift.item : null,
    mission: p ? m.playerView(s, p) : m.masterView(s),
  };
}

// ---------------- Schermo condiviso ----------------

export function viewForMaster(s) {
  return { ...common(s), step: masterStep(s) };
}

function masterVote(s) {
  const pd = s.phaseData;
  const live = voterIds(s);
  const v = {
    stage: pd.stage,
    round: pd.ballot.round,
    candidates: ids(pd.ballot.candidates),
    votedCount: live.filter((id) => pd.ballot.votes[id] !== undefined).length,
    voterCount: live.length,
    banishCount: pd.banishCount ?? null,
    timer: timerView(pd),
    votes: null,
    outcome: null,
  };
  // I voti con i nomi compaiono sullo schermo solo a votazione chiusa
  if (pd.stage === 'results') {
    // Pugnale: si vede alla rivelazione dei voti ("conta doppio")
    const daggers = pd.ballot.daggers || {};
    v.votes = s.order.filter((id) => pd.ballot.votes[id] !== undefined)
      .map((id) => ({ voterId: id, targetId: pd.ballot.votes[id], double: Boolean(daggers[id]) }));
    v.outcome = publicOutcome(pd.outcome);
  }
  return v;
}

function masterStep(s) {
  const pd = s.phaseData;
  const live = aliveIdList(s);
  switch (s.phase) {
    case PHASE.ROLES:
      return { seenCount: s.order.filter((id) => pd.seen[id]).length, total: s.order.length };
    case PHASE.BREAKFAST:
      return { victimId: pd.victimId, firstDay: pd.firstDay, suspects: [...pd.suspects], failed: Boolean(pd.failed) };
    case PHASE.PRESENTATIONS:
      return presentationStep(s);
    case PHASE.MISSION:
      return missionStep(s, null);
    case PHASE.ROUNDTABLE:
      return masterVote(s);
    case PHASE.REVEAL:
      return { playerId: pd.playerId, faction: pd.faction };
    case PHASE.NIGHT:
      // Conta chi ha toccato almeno una volta: non dipende dai ruoli
      return { touchedCount: live.filter((id) => pd.picks[id] !== undefined || pd.suspicions[id] !== undefined).length, total: live.length };
    case PHASE.FINAL:
      switch (pd.stage) {
        case 'choice':
          return { stage: 'choice', chosenCount: live.filter((id) => pd.choices[id] !== undefined).length, total: live.length };
        case 'choice-reveal':
          // Le scelte diventano pubbliche: lo schermo le rivela una per una
          return { stage: 'choice-reveal', reveal: pd.order.map((id) => ({ playerId: id, choice: pd.choices[id] })) };
        case 'voting':
        case 'results':
          return masterVote(s);
        case 'reveal':
          return { stage: 'reveal', playerId: pd.playerId, faction: pd.faction };
        case 'unveil':
          return { stage: 'unveil', revealed: [...pd.revealed], remaining: live.length - pd.revealed.length };
        default:
          return { stage: pd.stage };
      }
    default:
      return {};
  }
}

// ---------------- Telefono ----------------

export function viewFor(s, playerId) {
  const p = s.players[playerId];
  if (!p) return null;
  const traitor = isTraitorRole(p.role);
  return {
    ...common(s),
    me: {
      id: p.id,
      name: p.name,
      status: p.status,
      role: p.role,
      faction: factionOf(p.role),
      // Diventato Traditore per scelta del castello in questa notte
      justTurned: s.phase === PHASE.NIGHT && p.turnedOnDay === s.day,
      // Inventario segreto e oggetti usabili adesso
      items: [...p.items],
      itemActions: itemActions(s, p),
      mirror: p.mirror ? { day: p.mirror.day, voters: [...p.mirror.voters] } : null,
      // Veggente: la visione (fazione di un giocatore), solo a lui
      vision: p.vision ? { day: p.vision.day, targetId: p.vision.targetId, faction: p.vision.faction } : null,
      swapUsed: p.role === ROLE.SECRET_TRAITOR ? p.swapUsed : null,
    },
    // Solo i Traditori conoscono i complici (il Traditore Segreto li conosce tutti, gli altri non conoscono lui)
    allies: traitor ? alliesOf(s, p).map((id) => ({ id, name: s.players[id].name, status: s.players[id].status })) : null,
    step: playerStep(s, p),
  };
}

// Complici noti a un Traditore: i Traditori "normali"; al Traditore Segreto tutti
export function alliesOf(s, p) {
  const known = p.role === ROLE.SECRET_TRAITOR ? (r) => isTraitorRole(r) : (r) => r === ROLE.TRAITOR;
  return s.order.filter((id) => id !== p.id && known(s.players[id].role));
}

function playerVote(s, p) {
  const pd = s.phaseData;
  const alive = isAlive(p);
  const myVote = pd.ballot.votes[p.id] ?? null;
  const pool = pd.ballot.candidates || aliveIdList(s);
  const cursed = s.phase === PHASE.ROUNDTABLE && s.curses.includes(p.id);
  return {
    stage: pd.stage,
    round: pd.ballot.round,
    candidates: ids(pd.ballot.candidates),
    canVote: pd.stage === 'voting' && alive && myVote === null && !cursed,
    cursed,
    dagger: Boolean(pd.ballot.daggers && pd.ballot.daggers[p.id]),
    options: alive ? pool.filter((id) => id !== p.id) : [],
    myVote,
    timer: timerView(pd),
    // Solo l'esito: i voti individuali restano sul master
    outcome: pd.stage === 'results' ? publicOutcome(pd.outcome) : null,
  };
}

function playerNight(s, p) {
  const pd = s.phaseData;
  const alive = isAlive(p);
  const killer = alive && isKiller(s, p);
  const target = Boolean(pd.offer && pd.offer.targetId === p.id);
  const live = aliveIdList(s);
  const secret = alive && p.role === ROLE.SECRET_TRAITOR && !killer;
  // Stessa griglia per tutti (tutti gli altri vivi): a chi uccide i complici che conosce
  // compaiono disattivati. Così il numero di caselle non rivela nulla.
  const step = {
    canAct: alive,
    options: alive ? live.filter((id) => id !== p.id) : [],
    disabled: killer ? live.filter((id) => id !== p.id && !canKill(s, p, id)) : [],
    myChoice: (killer ? pd.picks[p.id] : pd.suspicions[p.id]) ?? null,
    killer,
    rest: pd.mode === 'rest' ? pd.restReason : null,
    chat: null,
    allyPicks: null,
    consensus: null,
    // Seduzione / Ultimatum: scelta dei Traditori (solo a loro) e offerta in arrivo (solo al bersaglio, anonima)
    canSeduce: killer && pd.canSeduce && !pd.offer,
    canUltimatum: killer && pd.canUltimatum && !pd.offer,
    plan: killer && (pd.canSeduce || pd.canUltimatum) ? pd.plan : null,
    offer: null,
    // Veggente: visione ancora da usare
    canVision: alive && p.role === ROLE.SEER && !p.vision,
    // Traditore Segreto: vede chat e scelte dei Traditori e può cambiare la vittima
    secret: null,
  };
  if (killer && pd.offer) step.offer = { kind: pd.offer.kind, incoming: false, targetId: pd.offer.targetId, answer: pd.offer.answer };
  if (target) step.offer = { kind: pd.offer.kind, incoming: true, targetId: p.id, answer: pd.offer.answer };
  const killerIds = nightKillers(s).map((k) => k.id);
  // Solo per i Traditori che uccidono stanotte (e per il Traditore Segreto, che li osserva)
  if (killer || (secret && killerIds.length)) {
    step.chat = pd.chat.map((m) => ({ from: m.from, text: m.text }));
    step.allyPicks = killerIds.map((id) => ({ id, targetId: pd.picks[id] ?? null }));
    step.consensus = nightConsensus(s);
  }
  if (secret) {
    step.secret = {
      canSwap: secretCanSwap(s, p) && !pd.swapDecided,
      swapUsed: p.swapUsed,
      swap: pd.swap,
      plan: killerIds.length ? pd.plan : null,
      // Nuova vittima possibile: chi non è Traditore (lui li conosce tutti)
      swapOptions: live.filter((id) => id !== p.id && !isTraitorRole(s.players[id].role)),
    };
  }
  return step;
}

function playerStep(s, p) {
  const pd = s.phaseData;
  const alive = isAlive(p);
  switch (s.phase) {
    case PHASE.ROLES:
      return { seen: Boolean(pd.seen[p.id]) };
    case PHASE.BREAKFAST:
      return {
        victimId: pd.victimId,
        firstDay: pd.firstDay,
        suspects: [...pd.suspects],
        failed: Boolean(pd.failed),
        // Esito dell'offerta (Seduzione o Ultimatum): solo ai Traditori che l'hanno fatta e a chi l'ha ricevuta
        seduction: pd.seduction && (pd.seduction.byIds.includes(p.id) || pd.seduction.targetId === p.id)
          ? { kind: pd.seduction.kind, targetId: pd.seduction.targetId, accepted: pd.seduction.accepted }
          : null,
      };
    case PHASE.PRESENTATIONS:
      return { ...presentationStep(s), mine: s.phaseData.order[s.phaseData.index] === p.id };
    case PHASE.MISSION:
      return missionStep(s, p);
    case PHASE.ROUNDTABLE:
      return playerVote(s, p);
    case PHASE.REVEAL:
      return { playerId: pd.playerId, faction: pd.faction };
    case PHASE.NIGHT:
      return playerNight(s, p);
    case PHASE.FINAL:
      switch (pd.stage) {
        case 'choice':
          return { stage: 'choice', canChoose: alive && pd.choices[p.id] === undefined, myChoice: pd.choices[p.id] ?? null };
        case 'choice-reveal':
          return { stage: 'choice-reveal', myChoice: pd.choices[p.id] ?? null };
        case 'voting':
        case 'results':
          return { ...playerVote(s, p), banishCount: pd.banishCount ?? null };
        case 'reveal':
          return { stage: 'reveal', playerId: pd.playerId, faction: pd.faction };
        case 'unveil':
          return { stage: 'unveil', revealed: [...pd.revealed] };
        default:
          return { stage: pd.stage };
      }
    default:
      return {};
  }
}
