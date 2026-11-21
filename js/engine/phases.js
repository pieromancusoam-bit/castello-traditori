// Passaggi tra le fasi. Ogni funzione modifica la bozza `s` ricevuta dal reducer
// (una copia privata dello stato), mai lo stato originale.

import { PHASE, STATUS } from './state.js';
import { ROLE, factionOf, alivePlayers, aliveTraitors, aliveFaithfuls, winnerOf } from './roles.js';
import { openBallot, outcomeOf, tally } from './votes.js';
import { FINAL_CHOICES } from './actions.js';
import { MISSION_MODULES, drawMission, missionValue } from './missions/index.js';
import { clearTimer } from './missions/common.js';

export const aliveIds = (s) => alivePlayers(s).map((p) => p.id);

// ---- Ruoli e Colazione ----

// suspects: i più sospettati della notte (vivi), annunciati senza dire chi li ha indicati
export function enterBreakfast(s, victimId, suspects = []) {
  s.day += 1;
  s.phase = PHASE.BREAKFAST;
  s.phaseData = { victimId, firstDay: s.day === 1, suspects };
}

// Dopo la Colazione: finale se restano pochi giocatori, altrimenti la missione del giorno
export function leaveBreakfast(s, rng) {
  if (alivePlayers(s).length <= s.settings.finalThreshold) enterFinal(s);
  else if (s.settings.missions) enterMission(s, rng);
  else enterRoundtable(s);
}

// ---- Missione ----
// Momenti: intro (regole) -> play (gioco, con timer) -> result (monete) -> board (tabellone)

export const currentMission = (s) => MISSION_MODULES[s.phaseData.id];

export function enterMission(s, rng) {
  const id = drawMission(s, rng);
  s.phase = PHASE.MISSION;
  s.phaseData = { id, stage: 'intro', value: missionValue(s.day), data: null, result: null, timer: null };
  s.phaseData.data = MISSION_MODULES[id].setup(s, rng);
}

export function startMission(s, rng) {
  s.phaseData.stage = 'play';
  currentMission(s).start(s, rng);
}

// Fine del gioco: monete al montepremi
export function finishMission(s) {
  const result = currentMission(s).result(s);
  clearTimer(s);
  s.phaseData.stage = 'result';
  s.phaseData.result = result;
  s.pot += result.coins;
  s.missionLog.push({ day: s.day, id: s.phaseData.id, coins: result.coins });
}

// "Avanti" (o timer scaduto) durante la missione
export function advanceMission(s, rng) {
  const pd = s.phaseData;
  switch (pd.stage) {
    case 'intro': return startMission(s, rng);
    case 'play': if (currentMission(s).advance(s, rng)) finishMission(s); return undefined;
    case 'result': pd.stage = 'board'; return undefined;
    default: return enterRoundtable(s);
  }
}

// ---- Tavola Rotonda (e voto della Cerimonia) ----

export function enterRoundtable(s) {
  s.phase = PHASE.ROUNDTABLE;
  s.phaseData = { stage: 'voting', ballot: openBallot(), outcome: null };
}

// Chiude la votazione in corso (in Tavola Rotonda o nella Cerimonia): si passa ai risultati
export function closeVoting(s) {
  s.phaseData.stage = 'results';
  s.phaseData.outcome = outcomeOf(s.phaseData.ballot, s.order);
}

export const allVoted = (s) => aliveIds(s).every((id) => s.phaseData.ballot.votes[id] !== undefined);

function banish(s, playerId) {
  const p = s.players[playerId];
  p.status = STATUS.BANISHED;
  const faction = factionOf(p.role);
  s.history.push({ day: s.day, type: 'banished', playerId, faction });
  return faction;
}

// "Avanti" dalla schermata dei risultati del voto
export function leaveResults(s, rng) {
  const { outcome } = s.phaseData;
  const inFinal = s.phase === PHASE.FINAL;
  if (outcome.kind === 'runoff') {
    s.phaseData = { ...s.phaseData, stage: 'voting', ballot: openBallot(outcome.candidates), outcome: null };
    return;
  }
  if (outcome.kind === 'banish') {
    const faction = banish(s, outcome.playerId);
    if (inFinal) s.phaseData = { stage: 'reveal', playerId: outcome.playerId, faction };
    else {
      s.phase = PHASE.REVEAL;
      s.phaseData = { playerId: outcome.playerId, faction };
    }
    return;
  }
  // Nessuno bandito
  s.history.push({ day: s.day, type: 'no-banish' });
  if (inFinal) enterFinalChoice(s);
  else afterDay(s, rng);
}

// Fine della giornata: finale se restano pochi giocatori, altrimenti Notte
export function afterDay(s, rng) {
  if (alivePlayers(s).length <= s.settings.finalThreshold) enterFinal(s);
  else enterNight(s, rng);
}

// ---- Notte ----

export function enterNight(s, rng) {
  s.phase = PHASE.NIGHT;
  const data = { mode: 'murder', newTraitorId: null, picks: {}, suspicions: {}, chat: [] };
  // Tutti i Traditori banditi: il castello ne sceglie uno nuovo, e stanotte niente omicidio
  if (aliveTraitors(s).length === 0) {
    const chosen = rng.pick(aliveFaithfuls(s));
    chosen.role = ROLE.TRAITOR;
    chosen.turnedOnDay = s.day;
    data.mode = 'castle';
    data.newTraitorId = chosen.id;
  }
  s.phaseData = data;
}

// Accordo dei Traditori: tutti i vivi hanno indicato la stessa vittima
export function nightConsensus(s) {
  const traitors = aliveTraitors(s);
  if (s.phaseData.mode !== 'murder' || traitors.length === 0) return null;
  const first = s.phaseData.picks[traitors[0].id];
  if (!first) return null;
  return traitors.every((t) => s.phaseData.picks[t.id] === first) ? first : null;
}

// Chi agisce di notte con l'omicidio: i Traditori vivi (non il nuovo del castello)
const isKiller = (s, p) => s.phaseData.mode === 'murder' && p.role === ROLE.TRAITOR;

export function nightDone(s, p) {
  if (isKiller(s, p)) return nightConsensus(s) !== null;
  return s.phaseData.suspicions[p.id] !== undefined;
}

export const allNightDone = (s) => alivePlayers(s).every((p) => nightDone(s, p));

// Fine della notte: senza accordo vince la vittima più indicata, la parità si estrae a caso
export function resolveNight(s, rng) {
  let victimId = null;
  if (s.phaseData.mode === 'murder') {
    const valid = new Set(aliveFaithfuls(s).map((p) => p.id));
    const picks = {};
    for (const t of aliveTraitors(s)) {
      const target = s.phaseData.picks[t.id];
      if (valid.has(target)) picks[t.id] = target;
    }
    const { leaders } = tally(picks, s.order);
    if (leaders.length) victimId = leaders.length === 1 ? leaders[0] : rng.pick(leaders);
  }
  if (victimId) {
    s.players[victimId].status = STATUS.MURDERED;
    s.history.push({ day: s.day, type: 'murdered', playerId: victimId });
  } else {
    s.history.push({ day: s.day, type: 'no-murder' });
  }
  enterBreakfast(s, victimId, nightSuspects(s));
}

// Il più sospettato tra i vivi (dopo l'omicidio); in parità tutti i pari merito
export function nightSuspects(s) {
  const alive = new Set(aliveIds(s));
  const valid = {};
  for (const [from, target] of Object.entries(s.phaseData.suspicions)) {
    if (alive.has(target)) valid[from] = target;
  }
  return tally(valid, s.order).leaders;
}

// ---- Finale: Cerimonia delle Polveri ----

export function enterFinal(s) {
  s.phase = PHASE.FINAL;
  if (alivePlayers(s).length <= s.settings.finalMinPlayers) enterUnveil(s);
  else enterFinalChoice(s);
}

export function enterFinalChoice(s) {
  s.phaseData = { stage: 'choice', choices: {}, lastBanishCount: null };
}

export const allChose = (s) => aliveIds(s).every((id) => s.phaseData.choices[id] !== undefined);

// Scelte chiuse: si rivelano sullo schermo una per una (chi non ha scelto vale "Chiudere")
export function closeChoice(s) {
  const order = aliveIds(s);
  const choices = {};
  for (const id of order) choices[id] = s.phaseData.choices[id] ?? FINAL_CHOICES.END;
  s.phaseData = { stage: 'choice-reveal', order, choices };
}

// Dopo la rivelazione delle scelte: tutti "Chiudere" -> rivelazioni finali, altrimenti si vota
export function resolveChoice(s) {
  const banishCount = Object.values(s.phaseData.choices).filter((c) => c === FINAL_CHOICES.BANISH).length;
  if (banishCount === 0) return enterUnveil(s);
  s.phaseData = { stage: 'voting', ballot: openBallot(), outcome: null, banishCount };
}

// Dopo il bando nella Cerimonia: si torna a scegliere, oppure solo rivelazioni
export function leaveFinalReveal(s) {
  if (alivePlayers(s).length <= s.settings.finalMinPlayers) enterUnveil(s);
  else enterFinalChoice(s);
}

function enterUnveil(s) {
  s.phaseData = { stage: 'unveil', revealed: [] };
}

// Rivela il prossimo sopravvissuto; dopo l'ultimo, fine della partita
export function unveilNext(s) {
  const next = aliveIds(s).find((id) => !s.phaseData.revealed.includes(id));
  if (next) s.phaseData.revealed.push(next);
  else endGame(s);
}

function endGame(s) {
  s.phase = PHASE.ENDED;
  s.winner = winnerOf(s);
  s.phaseData = {};
}
