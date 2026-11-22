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
import { ITEM, hasItem, takeItem, giveItem, drawItem } from './items.js';
import { drawEvent, todayEvent, scenePending, sceneSetup, daylightCanKill } from './events.js';

export const aliveIds = (s) => alivePlayers(s).map((p) => p.id);

// ---- Ruoli e Colazione ----

// suspects: i più sospettati della notte (vivi), annunciati senza dire chi li ha indicati.
// seduction: esito segreto della Seduzione della notte (lo vedono solo i due interessati)
// failed: i Traditori hanno colpito uno scudato ("l'omicidio è fallito", senza nome)
// rng: per estrarre l'evento del giorno (dal giorno 2)
export function enterBreakfast(s, victimId, suspects = [], seduction = null, failed = false, rng = null) {
  s.day += 1;
  s.phase = PHASE.BREAKFAST;
  s.phaseData = { victimId, firstDay: s.day === 1, suspects, seduction, failed };
  if (rng) drawEvent(s, rng);
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
  else toRoundtable(s, rng);
}

// Verso la Tavola Rotonda: prima, se c'è l'Omicidio a vista e non è ancora avvenuto, la scena
function toRoundtable(s, rng) {
  if (scenePending(s)) return enterScene(s, rng, { roundtable: true });
  return enterRoundtable(s);
}

// ---- Omicidio a vista: la scena (tutti toccano un nome; conta solo il Traditore designato) ----

export function enterScene(s, rng, next) {
  s.phase = PHASE.SCENE;
  s.phaseData = sceneSetup(s, rng, next);
  setTimer(s, GAME.sceneMs);
}

export const allTouched = (s) => aliveIds(s).every((id) => s.phaseData.touched[id] !== undefined);

export function sceneTouch(s, p, targetId) {
  s.phaseData.touched[p.id] = targetId;
  const ev = todayEvent(s, 'daylightMurder');
  if (ev && ev.killerId === p.id && daylightCanKill(s, p, targetId)) ev.victimId = targetId;
}

export function leaveScene(s, rng) {
  const ev = todayEvent(s, 'daylightMurder');
  if (ev) ev.sceneDone = true;
  const { next } = s.phaseData;
  if (next.slot) return enterMission(s, rng, next.slot);
  return enterRoundtable(s);
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
  s.phaseData = { id, slot, perDay: s.settings.missionsPerDay, stage: 'intro', value: missionValue(s.day), data: null, result: null, timer: null, double: false };
  // Doppia posta: il gioco estratto (da quel posto in poi, se il gioco lo permette) vale il doppio
  const ev = todayEvent(s, 'doubleStakes');
  if (ev && !ev.used && slot >= ev.slot && MISSION_MODULES[id].noDouble !== true) {
    ev.used = true;
    s.phaseData.double = true;
    s.phaseData.value *= 2;
  }
  s.phaseData.data = MISSION_MODULES[id].setup(s, rng);
}

export function startMission(s, rng) {
  s.phaseData.stage = 'play';
  currentMission(s).start(s, rng);
}

// Fine del gioco: monete al montepremi. Un gioco riuscito dà anche un oggetto, in segreto,
// a un partecipante estratto a caso (le missioni con oggetti propri non ne danno altri).
export function finishMission(s, rng) {
  const mission = currentMission(s);
  const result = mission.result(s, rng);
  clearTimer(s);
  s.phaseData.stage = 'result';
  s.phaseData.result = result;
  // Doppia posta fallita: il montepremi perde il valore normale del gioco
  if (s.phaseData.double && result.coins <= 0) {
    result.coins = -s.phaseData.value / 2;
    result.doubleLoss = true;
  }
  // Il montepremi non scende sotto zero: la perdita mostrata è quella vera
  result.coins = Math.max(result.coins, -s.pot);
  s.pot += result.coins;
  s.missionLog.push({ day: s.day, slot: s.phaseData.slot, id: s.phaseData.id, coins: result.coins });
  if (result.gift) {
    // Oggetto della missione stessa (Ponte, Asta, Lettera): { playerId, item }
    giveItem(s.players[result.gift.playerId], result.gift.item);
    s.phaseData.gift = result.gift;
    delete result.gift;
  } else if (result.coins > 0 && mission.dropsItem !== false) {
    const playerId = rng.pick(aliveIds(s));
    const item = drawItem(rng);
    giveItem(s.players[playerId], item);
    s.phaseData.gift = { playerId, item };
  }
}

// "Avanti" (o timer scaduto) durante la missione
export function advanceMission(s, rng) {
  const pd = s.phaseData;
  switch (pd.stage) {
    case 'intro': return startMission(s, rng);
    case 'play': if (currentMission(s).advance(s, rng)) finishMission(s, rng); return undefined;
    // Dopo il risultato: il gioco successivo oppure, dopo l'ultimo del giorno, il tabellone
    case 'result':
      // Omicidio a vista: la scena arriva dopo il primo gioco (o prima della Tavola Rotonda)
      if (pd.slot < pd.perDay) {
        if (pd.slot === 1 && scenePending(s)) return enterScene(s, rng, { slot: pd.slot + 1 });
        return enterMission(s, rng, pd.slot + 1);
      }
      pd.stage = 'board';
      return undefined;
    default: return toRoundtable(s, rng);
  }
}

// ---- Tavola Rotonda (e voto della Cerimonia) ----

// Prima del voto una discussione minima (clessidra): il voto si apre solo a tempo scaduto.
// second: seconda votazione del giorno dopo il Banchetto (senza discussione).
// Nebbia: i voti si rivelano solo come conteggio.
export function enterRoundtable(s, { second = false } = {}) {
  s.phase = PHASE.ROUNDTABLE;
  s.phaseData = { stage: 'voting', ballot: openBallot(), outcome: null, timer: null, second, fog: Boolean(todayEvent(s, 'fog')) };
  if (s.settings.discussion && !second) {
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

// Chiude la votazione in corso (in Tavola Rotonda o nella Cerimonia): si passa ai risultati.
// L'ultimo turno della Tavola Rotonda resta per lo Specchio.
export function closeVoting(s) {
  s.phaseData.stage = 'results';
  s.phaseData.outcome = outcomeOf(s.phaseData.ballot, s.order);
  if (s.phase === PHASE.ROUNDTABLE) s.lastBallot = { day: s.day, votes: { ...s.phaseData.ballot.votes } };
}

// Chi può votare: i vivi, tranne i maledetti alla Tavola Rotonda
export const voterIds = (s) => aliveIds(s).filter((id) => s.phase !== PHASE.ROUNDTABLE || !s.curses.includes(id));

export const allVoted = (s) => voterIds(s).every((id) => s.phaseData.ballot.votes[id] !== undefined);

function banish(s, playerId) {
  const p = s.players[playerId];
  p.status = STATUS.BANISHED;
  const faction = factionOf(p.role);
  s.history.push({ day: s.day, type: 'banished', playerId, faction });
  // Primo Traditore bandito (una sola volta per partita): la notte dopo l'Ultimatum.
  // Nella Cerimonia non c'è una notte dopo.
  if (isTraitorRole(p.role) && !s.ultimatum.done) {
    s.ultimatum.done = true;
    s.ultimatum.next = s.phase !== PHASE.FINAL && s.settings.ultimatum;
  }
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

// Fine della giornata: al tramonto la vittima dell'Omicidio a vista; dopo il Banchetto una
// seconda votazione; poi finale se restano pochi giocatori, altrimenti Notte
export function afterDay(s, rng) {
  const ev = todayEvent(s, 'daylightMurder');
  if (ev && ev.sceneDone && !ev.duskDone) return enterDusk(s, ev);
  const over = alivePlayers(s).length <= s.settings.finalThreshold;
  if (s.banquetDay === s.day) {
    s.banquetDay = null;
    if (!over) return enterRoundtable(s, { second: true });
  }
  if (over) enterFinal(s);
  else enterNight(s, rng);
}

// Il tramonto: si scopre la vittima dell'Omicidio a vista (se è ancora nel castello)
function enterDusk(s, ev) {
  ev.duskDone = true;
  const victim = ev.victimId && s.players[ev.victimId];
  let victimId = null;
  if (victim && victim.status === STATUS.ALIVE) {
    victim.status = STATUS.MURDERED;
    victimId = victim.id;
    s.history.push({ day: s.day, type: 'murdered', playerId: victimId });
  }
  s.phase = PHASE.DUSK;
  s.phaseData = { victimId, reason: victimId ? 'murdered' : ev.victimId ? 'gone' : 'none' };
}

// ---- Notte ----

export function enterNight(s, rng) {
  s.phase = PHASE.NIGHT;
  // La Maledizione vale solo per la Tavola Rotonda del giorno
  s.curses = [];
  s.sealed = [];
  const data = {
    mode: 'murder', // 'murder' | 'castle' (nuovo Traditore scelto dal castello) | 'rest' (notte senza omicidio)
    restReason: null, // 'banquet' | 'daylight'
    newTraitorId: null,
    picks: {},
    suspicions: {},
    chat: [],
    canSeduce: false,
    canUltimatum: false,
    plan: 'murder', // 'murder' | 'seduce' | 'ultimatum'
    offer: null, // { kind: 'seduce' | 'ultimatum', byIds, targetId, answer }
    swap: null, // Traditore Segreto: nuova vittima
    swapDecided: false,
  };
  const ev = s.dayEvent && s.dayEvent.day === s.day ? s.dayEvent : null;
  if (aliveTraitors(s).length === 0) {
    // Tutti i Traditori banditi: il castello ne sceglie uno nuovo, e stanotte niente omicidio.
    // L'Ultimatum, se era in attesa, va perso; il Banchetto salta.
    const chosen = rng.pick(aliveFaithfuls(s));
    chosen.role = ROLE.TRAITOR;
    chosen.turnedOnDay = s.day;
    data.mode = 'castle';
    data.newTraitorId = chosen.id;
    s.ultimatum.next = false;
    cancelBanquet(s);
  } else if (ev && ev.id === 'daylightMurder') {
    // Dopo l'Omicidio a vista la notte è tranquilla (l'Ultimatum aspetta la notte dopo)
    data.mode = 'rest';
    data.restReason = 'daylight';
  } else if (s.ultimatum.next && s.settings.ultimatum) {
    // Bandito il primo Traditore: i Traditori rimasti possono offrire l'Ultimatum
    s.ultimatum.next = false;
    data.canUltimatum = true;
    cancelBanquet(s);
  } else if (ev && ev.id === 'banquet') {
    data.mode = 'rest';
    data.restReason = 'banquet';
  } else if (s.settings.seduction && s.day === 1 && aliveTraitors(s).length === 1) {
    // Prima notte con un solo Traditore: può sedurre un Leale invece di uccidere
    data.canSeduce = true;
  }
  s.phaseData = data;
}

// Il Banchetto non si fa (notte del castello o dell'Ultimatum): niente doppio bando domani
function cancelBanquet(s) {
  if (s.dayEvent && s.dayEvent.day === s.day && s.dayEvent.id === 'banquet') s.dayEvent.cancelled = true;
  if (s.banquetDay === s.day + 1) s.banquetDay = null;
}

// Chi riceve (o ha accettato) l'offerta di Seduzione o l'Ultimatum non uccide stanotte
const isOfferTarget = (s, p) => Boolean(s.phaseData.offer && s.phaseData.offer.targetId === p.id);

// Chi sceglie la vittima stanotte: i Traditori vivi, tranne chi ha appena ricevuto l'offerta.
// Il Traditore Segreto uccide solo se non resta nessun altro Traditore.
export function nightKillers(s) {
  if (s.phaseData.mode !== 'murder') return [];
  const free = alivePlayers(s).filter((p) => !isOfferTarget(s, p));
  const regular = free.filter((p) => p.role === ROLE.TRAITOR);
  return regular.length ? regular : free.filter((p) => p.role === ROLE.SECRET_TRAITOR);
}

export const isKiller = (s, p) => nightKillers(s).some((k) => k.id === p.id);

// Bersaglio valido per chi uccide: vivo, non sé stesso, non un complice che conosce.
// (I Traditori non conoscono il Traditore Segreto: possono sceglierlo.)
export function canKill(s, killer, targetId) {
  const t = s.players[targetId];
  if (!t || t.status !== STATUS.ALIVE || targetId === killer.id) return false;
  if (killer.role === ROLE.SECRET_TRAITOR) return !isTraitorRole(t.role);
  return t.role !== ROLE.TRAITOR;
}

// Accordo dei Traditori: tutti quelli che uccidono hanno indicato la stessa vittima
export function nightConsensus(s) {
  const traitors = nightKillers(s);
  if (traitors.length === 0) return null;
  const first = s.phaseData.picks[traitors[0].id];
  if (!first) return null;
  return traitors.every((t) => s.phaseData.picks[t.id] === first) ? first : null;
}

// Traditore Segreto: stanotte può cambiare la vittima (una volta per partita, a accordo raggiunto)
export function secretCanSwap(s, p) {
  const pd = s.phaseData;
  return p.role === ROLE.SECRET_TRAITOR && p.status === STATUS.ALIVE && !p.swapUsed && pd.mode === 'murder'
    && pd.plan === 'murder' && !isKiller(s, p) && !isOfferTarget(s, p) && nightKillers(s).length > 0;
}

export function nightDone(s, p) {
  const pd = s.phaseData;
  if (isOfferTarget(s, p)) return pd.offer.answer !== null;
  if (isKiller(s, p)) return pd.plan === 'murder' ? nightConsensus(s) !== null : pd.offer !== null;
  // Il Traditore Segreto, ad accordo raggiunto, decide se cambiare la vittima
  if (secretCanSwap(s, p)) return pd.suspicions[p.id] !== undefined && pd.swapDecided;
  return pd.suspicions[p.id] !== undefined;
}

export const allNightDone = (s) => alivePlayers(s).every((p) => nightDone(s, p));

// Fine della notte: senza accordo vince la vittima più indicata, la parità si estrae a caso.
// Seduzione: nessun omicidio; un'offerta senza risposta vale come rifiutata.
// Ultimatum: chi accetta diventa Traditore (nessun omicidio); chi rifiuta (o non risponde)
// è la vittima della notte, e lo Scudo non lo salva.
export function resolveNight(s, rng) {
  let victimId = null;
  let offerResult = null;
  let shieldable = true;
  const pd = s.phaseData;
  if (pd.mode === 'murder' && pd.plan !== 'murder') {
    if (pd.offer) {
      const accepted = pd.offer.answer === true;
      offerResult = { kind: pd.offer.kind, byIds: [...pd.offer.byIds], targetId: pd.offer.targetId, accepted };
      if (pd.offer.kind === 'ultimatum' && !accepted) {
        victimId = pd.offer.targetId;
        shieldable = false;
      }
    }
  } else if (pd.mode === 'murder') {
    const picks = {};
    for (const t of nightKillers(s)) {
      const target = pd.picks[t.id];
      if (target && canKill(s, t, target)) picks[t.id] = target;
    }
    const { leaders } = tally(picks, s.order);
    if (leaders.length) victimId = leaders.length === 1 ? leaders[0] : rng.pick(leaders);
    // Il Traditore Segreto ha cambiato la vittima
    if (victimId && pd.swap && s.players[pd.swap].status === STATUS.ALIVE) victimId = pd.swap;
  }
  // Scudo: l'omicidio fallisce e lo Scudo si consuma (si sa che è fallito, non su chi)
  let failed = false;
  if (victimId && shieldable && hasItem(s.players[victimId], ITEM.SHIELD)) {
    takeItem(s.players[victimId], ITEM.SHIELD);
    victimId = null;
    failed = true;
  }
  if (victimId) {
    s.players[victimId].status = STATUS.MURDERED;
    s.history.push({ day: s.day, type: 'murdered', playerId: victimId });
  } else {
    s.history.push({ day: s.day, type: failed ? 'murder-failed' : 'no-murder' });
  }
  enterBreakfast(s, victimId, nightSuspects(s), offerResult, failed, rng);
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
  s.curses = []; // nella Cerimonia la Maledizione non vale
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
