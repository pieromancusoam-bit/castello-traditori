// Regole aggiunte dopo la prima serata (Fase 2b): Cerimonia a 3, ultime maschere,
// discussione minima, presentazioni, 3 giochi al giorno, Seduzione.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REJECT } from '../js/engine/reducer.js';
import { PHASE, finalThresholdFor } from '../js/engine/state.js';
import { A, FINAL_CHOICES } from '../js/engine/actions.js';
import { ROLE } from '../js/engine/roles.js';
import { viewFor, viewForMaster } from '../js/engine/view.js';
import { discussionMs } from '../js/engine/phases.js';
import { GAME } from '../js/config/game-config.js';
import { PRESENTATION_THEMES } from '../js/config/presentations.js';
import { newGame, withRoles, ok, rejected, advance, alive, seeRoles, voteAll } from './helpers.js';

const expire = (s) => ok(s, { type: A.TIMER_EXPIRED, payload: { key: s.phaseData.timer.key } });
const choose = (s, playerId, targetId) => ok(s, { type: A.NIGHT_CHOOSE, playerId, payload: { targetId } });

// ---------------- Cerimonia e ultime maschere ----------------

test('Cerimonia con 3 giocatori fino a 7 giocatori iniziali, con 4 oltre', () => {
  for (const [n, t] of [[5, 3], [6, 3], [7, 3], [8, 4], [12, 4], [16, 4]]) assert.equal(finalThresholdFor(n), t, `${n} giocatori`);
  const s = newGame(7, 1, { finalThreshold: undefined });
  assert.equal(s.settings.finalThreshold, 3);
});

test('5 giocatori: bando (4) -> si va alla Notte; omicidio (3) -> Cerimonia dopo la Colazione', () => {
  let s = advance(seeRoles(withRoles(newGame(5, 1, { finalThreshold: undefined }), ['p1'])));
  s = voteAll(s, (id) => (id === 'p5' ? 'p4' : 'p5'));
  s = advance(advance(s)); // Rivelazione -> dopo il giorno
  assert.equal(s.phase, PHASE.NIGHT, 'con 4 vivi non è ancora finale');
  s = choose(s, 'p1', 'p2');
  for (const id of ['p2', 'p3', 'p4']) s = choose(s, id, 'p1');
  assert.equal(s.phase, PHASE.BREAKFAST);
  s = advance(s);
  assert.equal(s.phase, PHASE.FINAL);
  assert.equal(alive(s).length, 3);
});

test('ultime maschere: prima i Leali, il Traditore per ultimo', () => {
  for (const traitor of ['p1', 'p2', 'p3', 'p4']) {
    let s = advance(seeRoles(withRoles(newGame(5), [traitor])));
    s = voteAll(s, (id) => (id === 'p5' ? 'p4' : 'p5'));
    s = advance(advance(s));
    for (const id of alive(s)) s = ok(s, { type: A.FINAL_CHOICE, playerId: id, payload: { choice: FINAL_CHOICES.END } });
    s = advance(s); // rivelazione delle scelte -> ultime maschere
    const order = [];
    while (s.phaseData.stage === 'unveil' && order.length < 4) {
      s = advance(s);
      order.push(s.phaseData.revealed.at(-1));
    }
    assert.equal(order.at(-1), traitor, `Traditore ${traitor} svelato per ultimo (${order})`);
  }
});

// ---------------- Discussione minima ----------------

test('discussione: 5 minuti fino a 9 giocatori in gioco, 10 minuti da 10 in su', () => {
  assert.equal(discussionMs(5), 5 * 60000);
  assert.equal(discussionMs(9), 5 * 60000);
  assert.equal(discussionMs(10), 10 * 60000);
  assert.equal(discussionMs(16), 10 * 60000);
});

test('Tavola Rotonda: niente voto durante la discussione; si vota a tempo scaduto', () => {
  let s = advance(seeRoles(newGame(10, 1, { discussion: true })));
  assert.equal(s.phase, PHASE.ROUNDTABLE);
  assert.equal(s.phaseData.stage, 'discussion');
  assert.equal(s.phaseData.timer.ms, 10 * 60000);
  assert.deepEqual(viewForMaster(s).step.timer, viewFor(s, 'p2').step.timer);
  assert.equal(viewFor(s, 'p2').step.canVote, false);
  assert.equal(rejected(s, { type: A.VOTE, playerId: 'p2', payload: { targetId: 'p3' } }), REJECT.WRONG_PHASE);
  assert.equal(rejected(s, { type: A.ADVANCE }), REJECT.WRONG_PHASE, '"Avanti" non salta la discussione');
  const forced = ok(s, { type: A.ADVANCE, payload: { force: true } });
  assert.equal(forced.phaseData.stage, 'voting', 'solo per le prove');
  s = expire(s);
  assert.equal(s.phaseData.stage, 'voting');
  assert.equal(s.phaseData.timer, null);
  assert.equal(viewFor(s, 'p2').step.canVote, true);
});

test('ballottaggio subito, senza una nuova discussione', () => {
  let s = expire(advance(seeRoles(newGame(6, 1, { discussion: true }))));
  s = voteAll(s, (id) => (['p1', 'p2', 'p3'].includes(id) ? 'p4' : 'p1'));
  s = advance(s);
  assert.equal(s.phaseData.stage, 'voting');
  assert.equal(s.phaseData.ballot.round, 2);
});

// ---------------- Presentazioni ----------------

test('giorno 1: presentazioni dopo la Colazione, un tema diverso per ognuno', () => {
  let s = advance(seeRoles(newGame(8, 3, { presentations: true })));
  assert.equal(s.phase, PHASE.PRESENTATIONS);
  const { order, themes } = s.phaseData;
  assert.deepEqual([...order].sort(), [...s.order].sort());
  assert.equal(new Set(Object.values(themes)).size, 8, 'temi tutti diversi');
  assert.ok(s.phaseData.timer && s.phaseData.timer.ms === GAME.presentationMs);
  const v = viewForMaster(s).step;
  assert.equal(v.playerId, order[0]);
  assert.equal(v.theme, PRESENTATION_THEMES[themes[order[0]]]);
  assert.equal(viewFor(s, order[0]).step.mine, true);
  assert.equal(viewFor(s, order[1]).step.mine, false);
  // Tempo scaduto: si resta sullo stesso giocatore finché il master non va avanti
  s = expire(s);
  assert.equal(s.phaseData.index, 0);
  assert.equal(s.phaseData.timer, null);
  for (let i = 1; i < 8; i++) {
    s = advance(s);
    assert.equal(s.phaseData.index, i);
  }
  s = advance(s);
  assert.equal(s.phase, PHASE.ROUNDTABLE, 'senza missioni: dritti alla Tavola Rotonda');
});

test('presentazioni solo il giorno 1', () => {
  let s = advance(seeRoles(newGame(6, 1, { presentations: true })));
  while (s.phase === PHASE.PRESENTATIONS) s = advance(s);
  s = advance(advance(s)); // nessun voto -> Notte
  s = advance(s); // Colazione del giorno 2
  s = advance(s);
  assert.equal(s.phase, PHASE.ROUNDTABLE);
});

// ---------------- Tre giochi al giorno ----------------

test('tre giochi al giorno: risultato -> gioco dopo; tabellone solo dopo il terzo', () => {
  let s = advance(seeRoles(newGame(6, 2, { missions: true, missionsPerDay: 3 })));
  const ids = [];
  for (let slot = 1; slot <= 3; slot++) {
    assert.equal(s.phase, PHASE.MISSION);
    assert.equal(s.phaseData.slot, slot);
    assert.equal(viewForMaster(s).step.slot, slot);
    assert.equal(viewForMaster(s).step.perDay, 3);
    ids.push(s.phaseData.id);
    s = advance(s); // regole -> gioco
    while (s.phaseData.stage === 'play') s = advance(s);
    assert.equal(s.phaseData.stage, 'result');
    s = advance(s);
  }
  assert.equal(s.phaseData.stage, 'board');
  assert.equal(new Set(ids).size, 3, 'tre giochi diversi');
  assert.deepEqual(s.missionLog.map((m) => m.slot), [1, 2, 3]);
  s = advance(s);
  assert.equal(s.phase, PHASE.ROUNDTABLE);
});

// ---------------- Seduzione ----------------

// 6 giocatori, p1 unico Traditore, alla prima notte (giorno 1 senza bandi)
function firstNight(settings = {}) {
  let s = advance(seeRoles(withRoles(newGame(6, 1, { seduction: true, ...settings }), ['p1'])));
  return advance(advance(s));
}
const plan = (s, p) => ok(s, { type: A.NIGHT_PLAN, playerId: 'p1', payload: { plan: p } });
const answer = (s, id, accept) => ok(s, { type: A.SEDUCTION_ANSWER, playerId: id, payload: { accept } });
const suspectAll = (s, except = []) => {
  for (const id of alive(s)) if (id !== 'p1' && !except.includes(id)) s = choose(s, id, 'p1');
  return s;
};

test('Seduzione: solo la prima notte, solo con un Traditore unico', () => {
  const s = firstNight();
  assert.equal(s.phase, PHASE.NIGHT);
  assert.equal(viewFor(s, 'p1').step.canSeduce, true);
  assert.equal(viewFor(s, 'p1').step.plan, 'murder');
  assert.equal(viewFor(s, 'p2').step.canSeduce, false);
  assert.equal(viewFor(s, 'p2').step.plan, null);
  // Con 2 Traditori niente Seduzione
  let two = advance(seeRoles(withRoles(newGame(8, 1, { seduction: true }), ['p1', 'p2'])));
  two = advance(advance(two));
  assert.equal(two.phaseData.canSeduce, false);
  assert.equal(rejected(two, { type: A.NIGHT_PLAN, playerId: 'p1', payload: { plan: 'seduce' } }), REJECT.NOT_ALLOWED);
  // Seconda notte: niente Seduzione
  let later = advance(firstNight());
  later = advance(advance(advance(later)));
  assert.equal(later.phase, PHASE.NIGHT);
  assert.equal(later.phaseData.canSeduce, false);
  // Impostazione spenta
  assert.equal(firstNight({ seduction: false }).phaseData.canSeduce, false);
});

test('Seduzione accettata: il sedotto diventa Traditore, nessuna vittima, esito solo ai due', () => {
  let s = plan(firstNight(), 'seduce');
  s = choose(s, 'p1', 'p3');
  assert.equal(rejected(s, { type: A.NIGHT_CHOOSE, playerId: 'p1', payload: { targetId: 'p4' } }), REJECT.ALREADY_DONE);
  assert.equal(rejected(s, { type: A.NIGHT_PLAN, playerId: 'p1', payload: { plan: 'murder' } }), REJECT.ALREADY_DONE);
  // L'offerta arriva al sedotto, anonima; gli altri non vedono nulla
  const offer = viewFor(s, 'p3').step.offer;
  assert.deepEqual(offer, { incoming: true, targetId: 'p3', answer: null });
  assert.ok(!JSON.stringify(viewFor(s, 'p3')).includes('"byId"'));
  assert.equal(viewFor(s, 'p4').step.offer, null);
  assert.equal(rejected(s, { type: A.SEDUCTION_ANSWER, playerId: 'p4', payload: { accept: true } }), REJECT.NOT_ALLOWED);
  s = answer(s, 'p3', true);
  assert.equal(s.players.p3.role, ROLE.TRAITOR);
  assert.deepEqual(viewFor(s, 'p3').allies.map((a) => a.id), ['p1']);
  assert.equal(viewFor(s, 'p3').step.killer, false, 'stanotte il sedotto non uccide');
  s = suspectAll(s, ['p3']);
  assert.equal(s.phase, PHASE.BREAKFAST, 'notte finita: tutti hanno agito');
  assert.equal(s.phaseData.victimId, null);
  assert.deepEqual(viewFor(s, 'p1').step.seduction, { targetId: 'p3', accepted: true });
  assert.deepEqual(viewFor(s, 'p3').step.seduction, { targetId: 'p3', accepted: true });
  assert.equal(viewFor(s, 'p2').step.seduction, null);
  assert.ok(!JSON.stringify(viewForMaster(s)).includes('seduction'));
  // La notte dopo uccidono insieme: serve l'accordo di entrambi
  s = advance(advance(advance(s)));
  assert.equal(s.phase, PHASE.NIGHT);
  s = choose(s, 'p1', 'p4');
  assert.equal(viewFor(s, 'p3').step.killer, true);
  assert.equal(viewFor(s, 'p1').step.consensus, null);
  s = choose(s, 'p3', 'p4');
  assert.equal(viewFor(s, 'p1').step.consensus, 'p4');
});

test('Seduzione rifiutata (o senza risposta): resta Leale e nessuno muore', () => {
  let s = choose(plan(firstNight(), 'seduce'), 'p1', 'p3');
  s = suspectAll(answer(s, 'p3', false));
  assert.equal(s.phase, PHASE.BREAKFAST);
  assert.equal(s.players.p3.role, ROLE.FAITHFUL);
  assert.equal(s.phaseData.victimId, null);
  assert.deepEqual(viewFor(s, 'p1').step.seduction, { targetId: 'p3', accepted: false });
  assert.equal(viewFor(s, 'p3').allies, null);

  let t = choose(plan(firstNight(), 'seduce'), 'p1', 'p3');
  t = suspectAll(t);
  assert.equal(t.phase, PHASE.NIGHT, 'si aspetta la risposta del sedotto');
  t = advance(t);
  assert.equal(t.players.p3.role, ROLE.FAITHFUL);
  assert.deepEqual(viewFor(t, 'p1').step.seduction, { targetId: 'p3', accepted: false });
});

test('Seduzione: il Traditore può tornare ad "Assassinare" finché non ha scelto', () => {
  let s = plan(plan(firstNight(), 'seduce'), 'murder');
  s = choose(s, 'p1', 'p3');
  s = suspectAll(s);
  assert.equal(s.phase, PHASE.BREAKFAST);
  assert.equal(s.phaseData.victimId, 'p3');
});
