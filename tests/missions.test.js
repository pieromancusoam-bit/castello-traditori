// Missioni, montepremi e timer.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REJECT } from '../js/engine/reducer.js';
import { PHASE, upgradeGame } from '../js/engine/state.js';
import { A } from '../js/engine/actions.js';
import { viewFor, viewForMaster } from '../js/engine/view.js';
import { MISSIONS, RIDDLE_QUESTIONS, PHYSICAL_TRIALS } from '../js/config/missions.js';
import { GAME } from '../js/config/game-config.js';
import { NET } from '../js/config/net-config.js';
import { MISSION_IDS, missionValue } from '../js/engine/missions/index.js';
import { groupAverage } from '../js/engine/missions/torches.js';
import { createGame } from '../js/engine/state.js';
import { newGame, withRoles, ok, rejected, advance, alive, seeRoles, voteAll } from './helpers.js';

const input = (s, playerId, payload) => ok(s, { type: A.MISSION_INPUT, playerId, payload });
const inputRejected = (s, playerId, payload) => rejected(s, { type: A.MISSION_INPUT, playerId, payload });
const expire = (s) => ok(s, { type: A.TIMER_EXPIRED, payload: { key: s.phaseData.timer.key } });

// Partita con missioni, alla Colazione del giorno 1; la prossima missione estratta è `id`
function atBreakfast(n, id, traitors = ['p1']) {
  const s = seeRoles(withRoles(newGame(n, 1, { missions: true, missionsPerDay: 1 }), traitors));
  if (id) s.missionBag = [id];
  return s;
}
// Missione `id` già in gioco (dopo le regole)
const playing = (n, id, traitors) => advance(advance(atBreakfast(n, id, traitors)));

// ---------------- Ciclo e montepremi ----------------

test('Colazione -> Missione (regole, gioco, risultato, tabellone) -> Tavola Rotonda', () => {
  let s = advance(atBreakfast(6, 'trial'));
  assert.equal(s.phase, PHASE.MISSION);
  assert.equal(s.phaseData.stage, 'intro');
  assert.equal(s.phaseData.timer, null, 'nessun timer durante le regole');
  s = advance(s);
  assert.equal(s.phaseData.stage, 'play');
  assert.ok(s.phaseData.timer, 'il gioco parte con il timer');
  s = advance(advance(s)); // fine prova -> voto -> chiuso senza voti
  assert.equal(s.phaseData.stage, 'result');
  assert.equal(s.phaseData.timer, null);
  s = advance(s);
  assert.equal(s.phaseData.stage, 'board');
  s = advance(s);
  assert.equal(s.phase, PHASE.ROUNDTABLE);
});

test('senza missioni nelle impostazioni si va dritti alla Tavola Rotonda', () => {
  const s = advance(seeRoles(newGame(6)));
  assert.equal(s.phase, PHASE.ROUNDTABLE);
});

test('montepremi: parte da zero, la missione riuscita aggiunge il suo valore', () => {
  let s = playing(6, 'trial');
  assert.equal(s.pot, 0);
  s = advance(s); // al voto
  for (const id of alive(s)) s = input(s, id, { ok: true });
  assert.equal(s.phaseData.stage, 'result');
  assert.equal(s.pot, GAME.missionBaseValue);
  assert.deepEqual(s.missionLog, [{ day: 1, slot: 1, id: 'trial', coins: GAME.missionBaseValue }]);
  assert.equal(viewForMaster(s).pot, GAME.missionBaseValue);
  assert.equal(viewFor(s, 'p2').pot, GAME.missionBaseValue);
});

test('il valore della missione cresce ogni giorno', () => {
  assert.equal(missionValue(1), GAME.missionBaseValue);
  assert.equal(missionValue(2), GAME.missionBaseValue + GAME.missionValuePerDay);
  assert.equal(missionValue(4), GAME.missionBaseValue + 3 * GAME.missionValuePerDay);
});

test('le missioni non si ripetono finché non sono uscite tutte, e mai due volte di fila', () => {
  for (let seed = 1; seed <= 30; seed++) {
    let s = seeRoles(newGame(16, seed, { missions: true }));
    const seen = [];
    for (let day = 0; day < 9; day++) {
      s = advance(s); // Colazione -> missione
      seen.push(s.phaseData.id);
      s.phaseData.stage = 'board';
      s = advance(s); // -> Tavola Rotonda
      s = advance(advance(s)); // nessun voto -> Notte
      s = advance(s); // Notte senza scelte -> Colazione
    }
    assert.deepEqual([...seen.slice(0, 4)].sort(), [...MISSION_IDS].sort(), `seed ${seed}`);
    assert.deepEqual([...seen.slice(4, 8)].sort(), [...MISSION_IDS].sort(), `seed ${seed}`);
    for (let i = 1; i < seen.length; i++) assert.notEqual(seen[i], seen[i - 1], `seed ${seed}: ripetuta`);
  }
});

test('missioni: azioni rifiutate fuori dal gioco, da eliminati o non valide', () => {
  let s = advance(atBreakfast(6, 'trial'));
  assert.equal(inputRejected(s, 'p2', { ok: true }), REJECT.WRONG_PHASE, 'durante le regole');
  s = advance(advance(s));
  assert.equal(inputRejected(s, 'p2', { ok: 'forse' }), REJECT.INVALID_PAYLOAD);
  s.players.p3.status = 'murdered';
  assert.equal(inputRejected(s, 'p3', { ok: true }), REJECT.NOT_ALIVE);
});

// ---------------- Timer ----------------

test('timer: solo la chiave in corso fa avanzare, una vecchia viene ignorata', () => {
  let s = playing(6, 'trial');
  const oldKey = s.phaseData.timer.key;
  s = expire(s); // fine prova -> voto, nuovo timer
  assert.equal(s.phaseData.data.sub, 'voting');
  assert.notEqual(s.phaseData.timer.key, oldKey);
  assert.equal(rejected(s, { type: A.TIMER_EXPIRED, payload: { key: oldKey } }), REJECT.STALE);
  assert.equal(rejected(s, { type: A.TIMER_EXPIRED, playerId: 'p2', payload: { key: s.phaseData.timer.key } }), REJECT.NOT_ALLOWED);
  s = expire(s);
  assert.equal(s.phaseData.stage, 'result');
  assert.equal(rejected(s, { type: A.TIMER_EXPIRED, payload: { key: oldKey } }), REJECT.STALE);
});

test('i telefoni e lo schermo ricevono durata e chiave del timer', () => {
  const s = playing(6, 'chest');
  const t = { key: s.phaseData.timer.key, ms: MISSIONS.chest.chooseMs };
  assert.deepEqual(viewForMaster(s).step.timer, t);
  assert.deepEqual(viewFor(s, 'p2').step.timer, t);
});

// ---------------- Il Forziere ----------------

test('Forziere: gruppo di metà dei vivi, minimo 3', () => {
  for (const [n, size] of [[5, 3], [6, 3], [7, 3], [8, 4], [10, 5], [16, 8]]) {
    const s = playing(n, 'chest');
    assert.equal(s.phaseData.data.group.length, size, `${n} giocatori`);
  }
});

test('Forziere: 1 Piombo il forziere si riempie, 2 Piombo resta vuoto', () => {
  for (const [leads, coins] of [[0, 1000], [1, 1000], [2, 0], [3, 0]]) {
    let s = playing(8, 'chest');
    const group = s.phaseData.data.group;
    group.forEach((id, i) => { s = input(s, id, { choice: i < leads ? 'lead' : 'gold' }); });
    assert.equal(s.phaseData.stage, 'result', 'tutti hanno scelto: risultato');
    assert.equal(s.phaseData.result.coins, coins, `${leads} Piombo`);
    assert.deepEqual(s.phaseData.result.detail, { leadCount: leads, groupSize: group.length });
  }
});

test('Forziere: fuori dal gruppo non si sceglie, una scelta non si cambia, chi non sceglie vale Oro', () => {
  let s = playing(8, 'chest');
  const { group } = s.phaseData.data;
  const outsider = s.order.find((id) => !group.includes(id));
  assert.equal(inputRejected(s, outsider, { choice: 'lead' }), REJECT.NOT_ALLOWED);
  assert.equal(inputRejected(s, group[0], { choice: 'argento' }), REJECT.INVALID_PAYLOAD);
  s = input(s, group[0], { choice: 'lead' });
  assert.equal(inputRejected(s, group[0], { choice: 'gold' }), REJECT.ALREADY_DONE);
  s = expire(s);
  assert.equal(s.phaseData.result.detail.leadCount, 1);
  assert.equal(s.phaseData.result.coins, GAME.missionBaseValue);
});

test('Forziere: telefoni e schermo vedono il gruppo e quanti hanno scelto, mai cosa', () => {
  let s = playing(8, 'chest');
  const { group } = s.phaseData.data;
  s = input(s, group[0], { choice: 'lead' });
  const mv = viewForMaster(s).step.mission;
  assert.deepEqual(mv.group, group);
  assert.equal(mv.chosenCount, 1);
  assert.equal(viewFor(s, group[0]).step.mission.myChoice, 'lead');
  assert.equal(viewFor(s, group[1]).step.mission.myChoice, null);
  assert.equal(viewFor(s, group[1]).step.mission.canChoose, true);
  assert.ok(!JSON.stringify(viewForMaster(s)).includes('lead"'), 'nessuna scelta sullo schermo');
});

// ---------------- L'Enigma del Castello ----------------

function answerAll(s, pick) {
  const d = s.phaseData.data;
  for (const id of d.players) s = input(s, id, { index: d.index, answer: pick(id) });
  return s;
}

test('Enigma: vale la risposta della maggioranza; parità = sbagliata; 1/5 del premio ciascuna', () => {
  let s = playing(5, 'riddle');
  const right = () => RIDDLE_QUESTIONS[s.phaseData.data.qIds[s.phaseData.data.index]].answer;
  const wrong = (a) => (a + 1) % 4;
  // Domanda 1: 3 giuste su 5
  let a = right();
  s = answerAll(s, (id) => (['p1', 'p2', 'p3'].includes(id) ? a : wrong(a)));
  assert.equal(s.phaseData.data.sub, 'reveal');
  assert.equal(s.phaseData.data.outcomes[0].correct, true);
  s = advance(s);
  // Domanda 2: parità 2-2 (uno non risponde) -> sbagliata
  a = right();
  for (const [id, ans] of [['p1', a], ['p2', a], ['p3', wrong(a)], ['p4', wrong(a)]]) s = input(s, id, { index: 1, answer: ans });
  s = advance(s); // chiude la domanda
  assert.equal(s.phaseData.data.outcomes[1].correct, false);
  assert.equal(s.phaseData.data.outcomes[1].groupAnswer, null);
  s = advance(s);
  // Domande 3-5: giusta, sbagliata, nessuna risposta
  a = right();
  s = advance(answerAll(s, () => a));
  a = right();
  s = advance(answerAll(s, () => wrong(a)));
  s = advance(s); // nessuno risponde: chiusa
  assert.equal(s.phaseData.data.outcomes[4].correct, false);
  s = advance(s);
  assert.equal(s.phaseData.stage, 'result');
  assert.deepEqual(s.phaseData.result.detail, { correct: 2, total: 5 });
  assert.equal(s.phaseData.result.coins, Math.round((GAME.missionBaseValue * 2) / 5));
});

test('Enigma: la risposta giusta arriva ai telefoni solo a domanda chiusa', () => {
  let s = playing(5, 'riddle');
  const v = viewFor(s, 'p2').step.mission;
  assert.equal(v.correctIndex, null);
  assert.equal(v.options.length, 4);
  assert.equal(v.canAnswer, true);
  s = input(s, 'p2', { index: 0, answer: 0 });
  assert.equal(viewFor(s, 'p2').step.mission.myAnswer, 0);
  assert.equal(viewFor(s, 'p3').step.mission.myAnswer, null, 'la risposta altrui non arriva');
  assert.equal(viewForMaster(s).step.mission.answeredCount, 1);
  assert.equal(viewForMaster(s).step.mission.correctIndex, null);
  s = expire(s);
  const q = RIDDLE_QUESTIONS[s.phaseData.data.qIds[0]];
  assert.equal(viewFor(s, 'p3').step.mission.correctIndex, q.answer);
  assert.equal(viewFor(s, 'p2').step.mission.myAnswer, 0);
});

test('Enigma: risposta a una domanda già passata o fuori scala rifiutata', () => {
  let s = playing(5, 'riddle');
  assert.equal(inputRejected(s, 'p2', { index: 1, answer: 0 }), REJECT.STALE);
  assert.equal(inputRejected(s, 'p2', { index: 0, answer: 7 }), REJECT.INVALID_PAYLOAD);
  s = input(s, 'p2', { index: 0, answer: 1 });
  assert.equal(inputRejected(s, 'p2', { index: 0, answer: 2 }), REJECT.ALREADY_DONE);
  s = expire(s); // rivelazione
  assert.equal(inputRejected(s, 'p3', { index: 0, answer: 2 }), REJECT.WRONG_PHASE);
});

test('Enigma: domande diverse nelle partite successive finché ce ne sono', () => {
  let s = playing(5, 'riddle');
  const first = [...s.phaseData.data.qIds];
  assert.equal(new Set(first).size, MISSIONS.riddle.questions);
  // seconda volta nella stessa partita: nessuna domanda ripetuta
  s.missionBag = ['riddle'];
  s.phaseData.stage = 'board';
  s = advance(s);
  s = advance(advance(s));
  s = advance(s);
  s = advance(s);
  assert.equal(s.phaseData.id, 'riddle');
  assert.ok(s.phaseData.data.qIds.every((q) => !first.includes(q)));
});

// ---------------- Le Torce ----------------

const C = MISSIONS.torches;

function tapAll(s, msOf) {
  const d = s.phaseData.data;
  const round = d.round;
  for (const id of d.players) s = input(s, id, { round, ms: msOf(id, round) });
  return s;
}

test('Torce: giri in sequenza, media del gruppo, premio pieno, metà o niente', () => {
  for (const [ms, coins] of [[300, 1000], [C.fullBelowMs, 1000], [C.fullBelowMs + 50, 500], [C.halfBelowMs + 10, 0]]) {
    let s = playing(5, 'torches');
    for (let r = 0; r < C.rounds; r++) {
      assert.equal(s.phaseData.data.round, r);
      s = tapAll(s, () => ms);
    }
    assert.equal(s.phaseData.stage, 'result');
    assert.equal(s.phaseData.result.detail.avgMs, ms);
    assert.equal(s.phaseData.result.coins, coins, `media ${ms}`);
  }
});

test('Torce: chi manca, tocca presto o manda un tempo impossibile vale la penalità', () => {
  let s = playing(5, 'torches');
  s = input(s, 'p1', { round: 0, ms: 300 });
  s = input(s, 'p2', { round: 0, ms: null }); // troppo presto
  s = input(s, 'p3', { round: 0, ms: 5 }); // impossibile
  s = input(s, 'p4', { round: 0, ms: C.litMs + 1 }); // fuori tempo
  s = expire(s); // p5 non risponde
  assert.equal(s.phaseData.data.round, 1);
  const d = s.phaseData.data;
  assert.deepEqual(d.times[0], { p1: 300 });
  // primo giro: (300 + 4 penalità) / 5; giri successivi tutti mancati
  const total = 300 + 4 * C.missPenaltyMs + (C.rounds - 1) * 5 * C.missPenaltyMs;
  assert.equal(groupAverage(d), Math.round(total / (5 * C.rounds)));
});

test('Torce: un giro passato non si gioca più, un giro non si ripete', () => {
  let s = playing(5, 'torches');
  s = input(s, 'p1', { round: 0, ms: 300 });
  assert.equal(inputRejected(s, 'p1', { round: 0, ms: 250 }), REJECT.ALREADY_DONE);
  assert.equal(inputRejected(s, 'p2', { round: 1, ms: 250 }), REJECT.STALE);
  assert.equal(inputRejected(s, 'p2', { round: 0, ms: 'veloce' }), REJECT.INVALID_PAYLOAD);
});

test('Torce: ogni telefono vede solo i propri tempi; attese diverse tra i giri', () => {
  let s = playing(5, 'torches');
  s = tapAll(s, (id) => (id === 'p2' ? 321 : 400));
  const v = viewFor(s, 'p2').step.mission;
  assert.deepEqual(v.myTimes, [321]);
  assert.equal(v.round, 1);
  assert.ok(v.delayMs >= C.delayMinMs && v.delayMs <= C.delayMaxMs);
  assert.ok(!JSON.stringify(viewFor(s, 'p3')).includes('321'));
  assert.ok(!JSON.stringify(viewForMaster(s)).includes('321'));
});

// ---------------- La Prova Fisica ----------------

test('Prova Fisica: riesce con la maggioranza dei giocatori in gioco; chi non vota conta no', () => {
  for (const [yes, no, success] of [[4, 2, true], [3, 3, false], [3, 0, false], [4, 0, true], [0, 6, false]]) {
    let s = playing(6, 'trial');
    assert.equal(s.phaseData.data.sub, 'doing');
    s = advance(s);
    const ids = alive(s);
    ids.slice(0, yes).forEach((id) => { s = input(s, id, { ok: true }); });
    ids.slice(yes, yes + no).forEach((id) => { s = input(s, id, { ok: false }); });
    if (s.phaseData.stage === 'play') s = expire(s);
    assert.equal(s.phaseData.result.success, success, `${yes} sì, ${no} no`);
    assert.deepEqual(s.phaseData.result.detail, { yes, no, playerCount: 6 });
  }
});

test('Prova Fisica: niente voti durante la prova; sullo schermo solo il conteggio', () => {
  let s = playing(6, 'trial');
  assert.equal(inputRejected(s, 'p2', { ok: true }), REJECT.WRONG_PHASE);
  const mv = viewForMaster(s).step.mission;
  assert.equal(mv.title, PHYSICAL_TRIALS[s.phaseData.data.trialIdx].title);
  s = advance(s);
  s = input(s, 'p2', { ok: false });
  assert.equal(viewForMaster(s).step.mission.votedCount, 1);
  assert.equal(viewFor(s, 'p2').step.mission.myVote, false);
  assert.equal(viewFor(s, 'p3').step.mission.myVote, null);
});

// ---------------- Segreti delle missioni ----------------

// Rimescola le scelte segrete degli ALTRI giocatori: la vista di `pid` non deve cambiare
function scrambleOthers(s, pid) {
  const c = structuredClone(s);
  const d = c.phaseData.data;
  const flip = { gold: 'lead', lead: 'gold' };
  for (const id of c.order) {
    if (id === pid) continue;
    if (d.choices && d.choices[id]) d.choices[id] = flip[d.choices[id]];
    if (d.answers && d.answers[id] !== undefined) d.answers[id] = (d.answers[id] + 1) % 4;
    if (d.votes && d.votes[id] !== undefined) d.votes[id] = !d.votes[id];
    if (d.times) d.times.forEach((t) => { if (t[id] !== undefined) t[id] += 37; });
  }
  return c;
}

test('durante il gioco le scelte altrui non cambiano né i telefoni né lo schermo', () => {
  const cases = [
    ['chest', (s) => { for (const id of s.phaseData.data.group.slice(0, 2)) s = input(s, id, { choice: 'lead' }); return s; }],
    ['riddle', (s) => input(input(s, 'p1', { index: 0, answer: 2 }), 'p3', { index: 0, answer: 1 })],
    ['torches', (s) => input(input(s, 'p1', { round: 0, ms: 300 }), 'p3', { round: 0, ms: 500 })],
    ['trial', (s) => input(input(advance(s), 'p1', { ok: true }), 'p3', { ok: false })],
  ];
  for (const [id, play] of cases) {
    const s = play(playing(8, id));
    assert.equal(s.phaseData.stage, 'play', id);
    assert.deepEqual(viewForMaster(scrambleOthers(s, null)), viewForMaster(s), `${id}: schermo`);
    for (const pid of s.order) {
      assert.deepEqual(viewFor(scrambleOthers(s, pid), pid), viewFor(s, pid), `${id}: telefono di ${pid}`);
    }
  }
});

// ---------------- Finale e salvataggio ----------------

test('fine partita: il montepremi si divide tra i sopravvissuti della fazione vincente', () => {
  // 5 giocatori, p1 Traditore: si bandisce un Leale -> 4 -> Cerimonia, tutti chiudono
  let s = atBreakfast(5, 'trial');
  s.pot = 1001;
  s.missionBag = [];
  s.settings = { ...s.settings, missions: false };
  s = advance(s); // Tavola Rotonda
  s = voteAll(s, (id) => (id === 'p5' ? 'p4' : 'p5'));
  s = advance(advance(s)); // Rivelazione -> finale
  assert.equal(s.phase, PHASE.FINAL);
  for (const id of alive(s)) s = ok(s, { type: A.FINAL_CHOICE, playerId: id, payload: { choice: 'end' } });
  s = advance(s);
  while (s.phase !== PHASE.ENDED) s = advance(s);
  const v = viewFor(s, 'p2');
  assert.equal(s.winner, 'traitors');
  assert.deepEqual(v.prize, { pot: 1001, winners: ['p1'], share: 1001 });

  // Vincono i Leali: si dividono il montepremi in parti uguali, per difetto
  let t = atBreakfast(5, 'trial');
  t.pot = 1000;
  t.settings = { ...t.settings, missions: false };
  t = advance(t);
  t = voteAll(t, (id) => (id === 'p1' ? 'p2' : 'p1'));
  t = advance(advance(t));
  for (const id of alive(t)) t = ok(t, { type: A.FINAL_CHOICE, playerId: id, payload: { choice: 'end' } });
  t = advance(t);
  while (t.phase !== PHASE.ENDED) t = advance(t);
  assert.equal(t.winner, 'faithfuls');
  assert.deepEqual(viewForMaster(t).prize, { pot: 1000, winners: ['p2', 'p3', 'p4', 'p5'], share: 250 });
  assert.equal(viewForMaster(atBreakfast(5)).prize, null, 'prima della fine nessuna divisione');
});

test('salvataggio a metà missione: dopo un passaggio in JSON si prosegue identici', () => {
  let s = playing(6, 'riddle');
  s = input(s, 'p2', { index: 0, answer: 1 });
  const restored = JSON.parse(JSON.stringify(s));
  assert.deepEqual(restored, s);
  const a = expire(s);
  const b = expire(restored);
  assert.deepEqual(a, b);
});

test('una partita salvata prima delle missioni riprende con montepremi a zero', () => {
  const old = structuredClone(newGame(6));
  for (const k of ['pot', 'missionBag', 'missionLog', 'used', 'timerSeq']) delete old[k];
  delete old.settings.missions;
  const g = upgradeGame(old);
  assert.equal(g.pot, 0);
  assert.equal(g.settings.missions, true);
  const s = advance(seeRoles(g));
  assert.equal(s.phase, PHASE.MISSION);
});

test('caso peggiore delle missioni: ogni vista sta in un messaggio di rete', () => {
  const players = Array.from({ length: NET.maxPlayers }, (_, i) => ({
    id: `p_${String(i).padStart(8, '0')}`,
    name: '€'.repeat(NET.nameMaxLength - 2) + String(i).padStart(2, '0'),
  }));
  for (const id of MISSION_IDS) {
    let s = seeRoles(createGame({ players, seed: 5 }));
    for (let d = 0; d < 40; d++) s.missionLog.push({ day: d, id, coins: 99999 });
    s.missionBag = [id];
    s = advance(advance(s));
    if (id === 'trial') s = advance(s);
    for (const pid of [s.order[0], null]) {
      const view = pid ? viewFor(s, pid) : viewForMaster(s);
      const size = new TextEncoder().encode(JSON.stringify({ t: 'view', view: { game: view } })).byteLength;
      assert.ok(size <= NET.messageMaxBytes - 1500, `${id}: ${size} byte`);
    }
  }
});
