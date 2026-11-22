// Passaggi tra le fasi. Ogni funzione modifica la bozza `s` ricevuta dal reducer
// (una copia privata dello stato), mai lo stato originale.

import { PHASE, STATUS } from './state.js';
import { ROLE, factionOf, isTraitorRole, alivePlayers, aliveTraitors, aliveFaithfuls, winnerOf } from './roles.js';
import { openBallot, outcomeOf, tally } from './votes.js';
import { FINAL_CHOICES } from './actions.js';
import { MISSION_MODULES, drawMission, missionValue } from './missions/index.js';
import { clearTimer, setTimer } from './missions/common.js';
import { GAME } from '../config/game-config.js';
import { PRESENTATION_THEMES } from '../config/presentations.js';

export const aliveIds = (s) => alivePlayers(s).map((p) => p.id);

// ---- Ruoli e Colazione ----

// suspects: i più sospettati della notte (vivi), annunciati senza dire chi li ha indicati.
// seduction: esito segreto della Seduzione della notte (lo vedono solo i due interessati)
export function enterBreakfast(s, victimId, suspects = [], seduction = null) {
  s.day += 1;
  s.phase = PHASE.BREAKFAST;
  s.phaseData = { victimId, firstDay: s.day === 1, suspects, seduction };
}

// Dopo la Colazione: finale se restano pochi giocatori; il giorno 1 le presentazioni;
// poi i giochi del giorno
export function leaveBreakfast(s, rng) {
  if (alivePlayers(s).length <= s.settings.finalThreshold) return enterFinal(s);
  if (s.day === 1 && s.settings.presentations) return enterPresentations(s, rng);
  return startDayGames(s, rng);
}

function startDayGames(s, rng) {
  if (s.settings.missions) enterMission(s, rng, 1);
  else enterRoundtable(s);
}

// ---- Presentazioni (giorno 1): uno alla volta, ognuno con un tema diverso ----

export function enterPresentations(s, rng) {
  const order = rng.shuffle(aliveIds(s));
  const pool = rng.shuffle(PRESENTATION_THEMES.map((_, i) => i));
  const themes = {};
  order.forEach((id, i) => { themes[id] = pool[i % pool.length]; });
  s.phase = PHASE.PRESENTATIONS;
  s.phaseData = { order, themes, index: 0, timer: null };
  setTimer(s, s.settings.presentationMs);
}

// "Avanti": il prossimo che si presenta; dopo l'ultimo, i giochi del giorno
export function nextPresentation(s, rng) {
  const pd = s.phaseData;
  if (pd.index + 1 < pd.order.length) {
    pd.index += 1;
    setTimer(s, s.settings.presentationMs);
  } else startDayGames(s, rng);
}

// ---- Missione ----
// Momenti: intro (regole) -> play (gioco, con timer) -> result (monete) -> board (tabellone)

export const currentMission = (s) => MISSION_MODULES[s.phaseData.id];

// slot: numero del gioco nella giornata (1 .. settings.missionsPerDay)
export function enterMission(s, rng, slot = 1) {
  const id = drawMission(s, rng);
  s.phase = PHASE.MISSION;
  s.phaseData = { id, slot, perDay: s.settings.missionsPerDay, stage: 'intro', value: missionValue(s.day), data: null, result: null, timer: null };
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
  s.missionLog.push({ day: s.day, slot: s.phaseData.slot, id: s.phaseData.id, coins: result.coins });
}

// "Avanti" (o timer scaduto) durante la missione
export function advanceMission(s, rng) {
  const pd = s.phaseData;
  switch (pd.stage) {
    case 'intro': return startMission(s, rng);
    case 'play': if (currentMission(s).advance(s, rng)) finishMission(s); return undefined;
    // Dopo il risultato: il gioco successivo oppure, dopo l'ultimo del giorno, il tabellone
    case 'result':
      if (pd.slot < pd.perDay) return enterMission(s, rng, pd.slot + 1);
      pd.stage = 'board';
      return undefined;
    default: return enterRoundtable(s);
  }
}

// ---- Tavola Rotonda (e voto della Cerimonia) ----

// Prima del voto una discussione minima (clessidra): il voto si apre solo a tempo scaduto
export function enterRoundtable(s) {
  s.phase = PHASE.ROUNDTABLE;
  s.phaseData = { stage: 'voting', ballot: openBallot(), outcome: null, timer: null };
  if (s.settings.discussion) {
    s.phaseData.stage = 'discussion';
    setTimer(s, s.settings.discussionMs ?? discussionMs(alivePlayers(s).length));
  }
}

export function discussionMs(aliveCount, table = GAME.discussionTable) {
  const row = table.find((r) => aliveCount <= r.upTo) || table[table.length - 1];
  return row.ms;
}

export function openVoting(s) {
  s.phaseData.stage = 'voting';
  clearTimer(s);
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
  const data = { mode: 'murder', newTraitorId: null, picks: {}, suspicions: {}, chat: [], canSeduce: false, plan: 'murder', offer: null };
  // Tutti i Traditori banditi: il castello ne sceglie uno nuovo, e stanotte niente omicidio
  if (aliveTraitors(s).length === 0) {
    const chosen = rng.pick(aliveFaithfuls(s));
    chosen.role = ROLE.TRAITOR;
    chosen.turnedOnDay = s.day;
    data.mode = 'castle';
    data.newTraitorId = chosen.id;
  } else if (s.settings.seduction && s.day === 1 && aliveTraitors(s).length === 1) {
    // Prima notte con un solo Traditore: può sedurre un Leale invece di uccidere
    data.canSeduce = true;
  }
  s.phaseData = data;
}

// Il Leale che riceve (o ha accettato) l'offerta di Seduzione non uccide stanotte
const isOfferTarget = (s, p) => Boolean(s.phaseData.offer && s.phaseData.offer.targetId === p.id);

// Chi sceglie la vittima stanotte: i Traditori vivi, tranne chi è appena stato sedotto
export const nightKillers = (s) => (s.phaseData.mode === 'murder' ? aliveTraitors(s).filter((p) => !isOfferTarget(s, p)) : []);

// Accordo dei Traditori: tutti i vivi hanno indicato la stessa vittima
export function nightConsensus(s) {
  const traitors = nightKillers(s);
  if (s.phaseData.mode !== 'murder' || traitors.length === 0) return null;
  const first = s.phaseData.picks[traitors[0].id];
  if (!first) return null;
  return traitors.every((t) => s.phaseData.picks[t.id] === first) ? first : null;
}

// Chi agisce di notte con l'omicidio: i Traditori vivi (non il nuovo del castello, non il sedotto)
export const isKiller = (s, p) => s.phaseData.mode === 'murder' && p.role === ROLE.TRAITOR && !isOfferTarget(s, p);

export function nightDone(s, p) {
  const pd = s.phaseData;
  if (isOfferTarget(s, p)) return pd.offer.answer !== null;
  if (isKiller(s, p)) return pd.plan === 'seduce' ? pd.offer !== null : nightConsensus(s) !== null;
  return pd.suspicions[p.id] !== undefined;
}

export const allNightDone = (s) => alivePlayers(s).every((p) => nightDone(s, p));

// Fine della notte: senza accordo vince la vittima più indicata, la parità si estrae a caso.
// Con la Seduzione nessun omicidio; un'offerta senza risposta vale come rifiutata.
export function resolveNight(s, rng) {
  let victimId = null;
  let seduction = null;
  const pd = s.phaseData;
  if (pd.mode === 'murder' && pd.plan === 'seduce') {
    if (pd.offer) seduction = { byId: pd.offer.byId, targetId: pd.offer.targetId, accepted: pd.offer.answer === true };
  } else if (pd.mode === 'murder') {
    const valid = new Set(aliveFaithfuls(s).map((p) => p.id));
    const picks = {};
    for (const t of nightKillers(s)) {
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
  enterBreakfast(s, victimId, nightSuspects(s), seduction);
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
// Prima i Leali, poi i Traditori: un Traditore viene sempre svelato per ultimo
export function unveilNext(s) {
  const live = aliveIds(s);
  const isTraitor = (id) => isTraitorRole(s.players[id].role);
  const ordered = [...live.filter((id) => !isTraitor(id)), ...live.filter(isTraitor)];
  const next = ordered.find((id) => !s.phaseData.revealed.includes(id));
  if (next) s.phaseData.revealed.push(next);
  else endGame(s);
}

function endGame(s) {
  s.phase = PHASE.ENDED;
  s.winner = winnerOf(s);
  s.phaseData = {};
}
