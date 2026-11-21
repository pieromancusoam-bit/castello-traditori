// Viste filtrate: cosa può sapere un telefono (viewFor) e cosa va sullo schermo
// condiviso (viewForMaster). Si costruiscono DA ZERO, campo per campo (allow-list):
// mai copiare lo stato e togliere pezzi.

import { PHASE, STATUS } from './state.js';
import { ROLE, factionOf } from './roles.js';
import { nightConsensus } from './phases.js';

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
    return { id: p.id, name: p.name, status: p.status, faction: isRevealed(s, id) ? factionOf(p.role) : null };
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

function common(s) {
  return {
    phase: s.phase,
    day: s.day,
    players: publicPlayers(s),
    history: publicHistory(s),
    winner: s.phase === PHASE.ENDED ? s.winner : null,
  };
}

// ---------------- Schermo condiviso ----------------

export function viewForMaster(s) {
  return { ...common(s), step: masterStep(s) };
}

function masterVote(s) {
  const pd = s.phaseData;
  const live = aliveIdList(s);
  const v = {
    stage: pd.stage,
    round: pd.ballot.round,
    candidates: ids(pd.ballot.candidates),
    votedCount: live.filter((id) => pd.ballot.votes[id] !== undefined).length,
    voterCount: live.length,
    banishCount: pd.banishCount ?? null,
    votes: null,
    outcome: null,
  };
  // I voti con i nomi compaiono sullo schermo solo a votazione chiusa
  if (pd.stage === 'results') {
    v.votes = s.order.filter((id) => pd.ballot.votes[id] !== undefined).map((id) => ({ voterId: id, targetId: pd.ballot.votes[id] }));
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
      return { victimId: pd.victimId, firstDay: pd.firstDay, suspects: [...pd.suspects] };
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
  const traitor = p.role === ROLE.TRAITOR;
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
    },
    // Solo i Traditori conoscono i complici
    allies: traitor
      ? s.order.filter((id) => id !== p.id && s.players[id].role === ROLE.TRAITOR).map((id) => ({ id, name: s.players[id].name, status: s.players[id].status }))
      : null,
    step: playerStep(s, p),
  };
}

function playerVote(s, p) {
  const pd = s.phaseData;
  const alive = isAlive(p);
  const myVote = pd.ballot.votes[p.id] ?? null;
  const pool = pd.ballot.candidates || aliveIdList(s);
  return {
    stage: pd.stage,
    round: pd.ballot.round,
    candidates: ids(pd.ballot.candidates),
    canVote: pd.stage === 'voting' && alive && myVote === null,
    options: alive ? pool.filter((id) => id !== p.id) : [],
    myVote,
    // Solo l'esito: i voti individuali restano sul master
    outcome: pd.stage === 'results' ? publicOutcome(pd.outcome) : null,
  };
}

function playerNight(s, p) {
  const pd = s.phaseData;
  const alive = isAlive(p);
  const killer = alive && pd.mode === 'murder' && p.role === ROLE.TRAITOR;
  const live = aliveIdList(s);
  // Stessa griglia per tutti (tutti gli altri vivi): ai Traditori i complici compaiono disattivati.
  // Così il numero di caselle non rivela nulla.
  const step = {
    canAct: alive,
    options: alive ? live.filter((id) => id !== p.id) : [],
    disabled: killer ? live.filter((id) => id !== p.id && s.players[id].role === ROLE.TRAITOR) : [],
    myChoice: (killer ? pd.picks[p.id] : pd.suspicions[p.id]) ?? null,
    killer,
    chat: null,
    allyPicks: null,
    consensus: null,
  };
  // Solo per i Traditori che uccidono stanotte
  if (killer) {
    step.chat = pd.chat.map((m) => ({ from: m.from, text: m.text }));
    step.allyPicks = live
      .filter((id) => s.players[id].role === ROLE.TRAITOR)
      .map((id) => ({ id, targetId: pd.picks[id] ?? null }));
    step.consensus = nightConsensus(s);
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
      return { victimId: pd.victimId, firstDay: pd.firstDay, suspects: [...pd.suspects] };
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
