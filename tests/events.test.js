// Fase 3: eventi (Nebbia, Doppia posta, Banchetto, Omicidio a vista).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { A } from '../js/engine/actions.js';
import { PHASE } from '../js/engine/state.js';
import { REJECT } from '../js/engine/reducer.js';
import { viewFor, viewForMaster } from '../js/engine/view.js';
import { drawEvent } from '../js/engine/events.js';
import { createRng } from '../js/engine/rng.js';
import { newGame, withRoles, seeRoles, advance, ok, rejected, voteAll, alive } from './helpers.js';

const ALL_EVENTS = { fog: true, doubleStakes: true, banquet: true, daylightMurder: true };
const choose = (s, playerId, targetId) => ok(s, { type: A.NIGHT_CHOOSE, playerId, payload: { targetId } });

// Giornata 1 senza giochi: si bandisce `banish`, poi notte con omicidio di `victim` e Colazione del giorno 2.
// `event`: evento forzato per il giorno 2 (come con ?debug=1).
function toDay2(n, traitors, { event, victim, banish, settings = {} }) {
  let s = seeRoles(withRoles(newGame(n, 1, { events: ALL_EVENTS, ...settings }), traitors));
  if (event) s = ok(s, { type: A.DEBUG_NEXT, payload: { event } });
  s = advance(s); // Tavola Rotonda (o i giochi del giorno)
  while (s.phase === PHASE.MISSION) s = advance(s);
  if (s.phaseData.stage === 'discussion') s = ok(s, { type: A.TIMER_EXPIRED, payload: { key: s.phaseData.timer.key } });
  s = voteAll(s, (id) => (id === banish ? alive(s).find((x) => x !== banish) : banish));
  s = advance(advance(s)); // rivelazione -> notte
  for (const t of traitors) if (s.players[t].status === 'alive') s = choose(s, t, victim);
  return advance(s); // alba -> Colazione del giorno 2
}

test('eventi: mai il giorno 1, al massimo uno ogni due giorni, solo quelli accesi', () => {
  const s = newGame(10, 1, { events: ALL_EVENTS, eventChance: 1 });
  s.day = 1;
  drawEvent(s, createRng(1));
  assert.equal(s.dayEvent, null);
  s.day = 2;
  drawEvent(s, createRng(1));
  assert.ok(s.dayEvent && s.dayEvent.day === 2);
  s.day = 3;
  drawEvent(s, createRng(2));
  assert.equal(s.dayEvent, null); // il giorno dopo un evento, niente
  s.day = 4;
  drawEvent(s, createRng(3));
  assert.ok(s.dayEvent);
  // Spenti: mai
  const off = newGame(10, 1, { eventChance: 1 });
  off.day = 2;
  drawEvent(off, createRng(1));
  assert.equal(off.dayEvent, null);
});

test('eventi: annunciati alla Colazione su schermo e telefoni, senza segreti', () => {
  const s = toDay2(8, ['p1', 'p2'], { event: 'fog', victim: 'p3', banish: 'p8' });
  assert.equal(s.phase, PHASE.BREAKFAST);
  assert.deepEqual(viewForMaster(s).event, { id: 'fog', slot: null, cancelled: false });
  assert.deepEqual(viewFor(s, 'p4').event, { id: 'fog', slot: null, cancelled: false });
});

test('Nebbia: alla Tavola Rotonda solo il conteggio, senza nomi', () => {
  let s = toDay2(8, ['p1', 'p2'], { event: 'fog', victim: 'p3', banish: 'p8' });
  s = advance(s); // Tavola Rotonda
  assert.equal(s.phaseData.fog, true);
  s.players.p4.items.push('dagger');
  s = ok(s, { type: A.USE_ITEM, playerId: 'p4', payload: { item: 'dagger' } });
  s = voteAll(s, (id) => (id === 'p5' ? 'p6' : 'p5'));
  const step = viewForMaster(s).step;
  assert.equal(step.votes, null);
  assert.ok(!JSON.stringify(step).includes('voterId'));
  assert.deepEqual(step.fogCounts, [{ targetId: 'p5', count: 6 }, { targetId: 'p6', count: 1 }]);
  assert.equal(step.daggerCount, 1);
  // Lo Specchio funziona anche con la Nebbia
  s.players.p5.items.push('mirror');
  s = ok(s, { type: A.USE_ITEM, playerId: 'p5', payload: { item: 'mirror' } });
  assert.deepEqual(viewFor(s, 'p5').me.mirror.voters, ['p1', 'p2', 'p4', 'p6', 'p7']);
});

test('Doppia posta: il gioco vale il doppio; se fallisce il montepremi perde il valore normale', () => {
  let s = toDay2(8, ['p1', 'p2'], { event: 'doubleStakes', victim: 'p3', banish: 'p8', settings: { missions: true, missionsPerDay: 1 } });
  // Giorno 1 con un gioco: lo si gioca (Avanti fino alla Tavola Rotonda) prima di arrivare qui
  assert.equal(s.dayEvent.id, 'doubleStakes');
  assert.equal(s.dayEvent.slot, 1);
  s.pot = 3000;
  s = ok(s, { type: A.DEBUG_NEXT, payload: { mission: 'chest' } });
  s = advance(s); // regole del gioco
  assert.equal(s.phaseData.double, true);
  assert.equal(s.phaseData.value, 2 * 1250);
  assert.equal(viewForMaster(s).step.double, true);
  s = advance(s); // gioco
  for (const id of s.phaseData.data.group) s = ok(s, { type: A.MISSION_INPUT, playerId: id, payload: { choice: 'lead' } });
  assert.equal(s.phaseData.result.coins, -1250);
  assert.equal(s.pot, 1750);
  assert.equal(viewForMaster(s).step.result.doubleLoss, true);
});

test('Doppia posta riuscita: monete doppie', () => {
  let s = toDay2(8, ['p1', 'p2'], { event: 'doubleStakes', victim: 'p3', banish: 'p8', settings: { missions: true, missionsPerDay: 1 } });
  s = ok(s, { type: A.DEBUG_NEXT, payload: { mission: 'chest' } });
  const before = s.pot;
  s = advance(advance(s));
  for (const id of s.phaseData.data.group) s = ok(s, { type: A.MISSION_INPUT, playerId: id, payload: { choice: 'gold' } });
  assert.equal(s.pot - before, 2500);
});

test('Banchetto: stanotte nessuno muore, domani due votazioni (la seconda senza discussione)', () => {
  let s = toDay2(10, ['p1', 'p2'], { event: 'banquet', victim: 'p3', banish: 'p10', settings: { discussion: true } });
  assert.equal(s.banquetDay, 3);
  s = advance(s); // Tavola Rotonda (discussione)
  s = ok(s, { type: A.TIMER_EXPIRED, payload: { key: s.phaseData.timer.key } });
  s = voteAll(s, (id) => (id === 'p8' ? 'p7' : 'p8'));
  s = advance(advance(s)); // rivelazione -> notte del Banchetto
  assert.equal(s.phase, PHASE.NIGHT);
  assert.equal(s.phaseData.mode, 'rest');
  assert.equal(viewFor(s, 'p1').step.killer, false);
  assert.equal(viewFor(s, 'p1').step.rest, 'banquet');
  s = advance(s); // alba
  assert.equal(s.phaseData.victimId, null);
  assert.equal(s.day, 3);
  s = advance(s); // Tavola Rotonda
  s = ok(s, { type: A.TIMER_EXPIRED, payload: { key: s.phaseData.timer.key } });
  s = voteAll(s, (id) => (id === 'p7' ? 'p6' : 'p7'));
  s = advance(advance(s)); // rivelazione -> seconda votazione
  assert.equal(s.phase, PHASE.ROUNDTABLE);
  assert.equal(s.phaseData.second, true);
  assert.equal(s.phaseData.stage, 'voting'); // niente discussione
  s = voteAll(s, (id) => (id === 'p6' ? 'p5' : 'p6'));
  s = advance(advance(s));
  assert.equal(s.phase, PHASE.NIGHT);
  assert.equal(s.players.p6.status, 'banished');
  assert.equal(s.players.p7.status, 'banished');
});

test('Banchetto: la seconda votazione salta se si arriva alla soglia della Cerimonia', () => {
  let s = toDay2(7, ['p1', 'p2'], { event: 'banquet', victim: 'p3', banish: 'p7' });
  s = advance(s);
  s = voteAll(s, (id) => (id === 'p6' ? 'p5' : 'p6'));
  s = advance(advance(advance(s))); // rivelazione -> notte del Banchetto -> alba (5 vivi)
  s = advance(s); // Tavola Rotonda del giorno 3
  s = voteAll(s, (id) => (id === 'p5' ? 'p4' : 'p5'));
  s = advance(advance(s)); // 4 vivi: soglia 4
  assert.equal(s.phase, PHASE.FINAL);
});

test('Banchetto annullato dall\'Ultimatum: notte con l\'offerta e niente doppio bando', () => {
  let s = toDay2(9, ['p1', 'p2', 'p3'], { event: 'banquet', victim: 'p4', banish: 'p9', settings: { ultimatum: true } });
  s = advance(s);
  s = voteAll(s, (id) => (id === 'p1' ? 'p5' : 'p1')); // bandito il primo Traditore
  s = advance(advance(s));
  assert.equal(s.phaseData.canUltimatum, true);
  assert.equal(s.phaseData.mode, 'murder');
  assert.equal(s.banquetDay, null);
  assert.equal(viewForMaster(s).event.cancelled, true);
});

test('Omicidio a vista: la scena dopo il primo gioco, la vittima al tramonto, notte tranquilla', () => {
  let s = toDay2(9, ['p1', 'p2'], { event: 'daylightMurder', victim: 'p3', banish: 'p9', settings: { missions: true, missionsPerDay: 2 } });
  const killer = s.dayEvent.killerId;
  assert.ok(['p1', 'p2'].includes(killer));
  assert.equal(viewFor(s, killer).step.daylightKiller, true);
  const other = killer === 'p1' ? 'p2' : 'p1';
  assert.equal(viewFor(s, other).step.daylightKiller, false);
  assert.ok(!JSON.stringify(viewForMaster(s)).includes('killerId'));
  s = advance(s); // regole del primo gioco
  s = advance(s); // gioco
  while (s.phaseData.stage === 'play') s = advance(s);
  s = advance(s); // dopo il risultato: la scena
  assert.equal(s.phase, PHASE.SCENE);
  const kv = viewFor(s, killer).step;
  assert.equal(kv.killer, true);
  assert.ok(kv.disabled.includes(other));
  const fv = viewFor(s, 'p4').step;
  assert.equal(fv.killer, false);
  assert.deepEqual(fv.disabled, []);
  assert.equal(kv.options.length, fv.options.length);
  assert.equal(rejected(s, { type: A.SCENE_TOUCH, playerId: 'p4', payload: { targetId: 'p4' } }), REJECT.INVALID_TARGET);
  for (const id of alive(s)) s = ok(s, { type: A.SCENE_TOUCH, playerId: id, payload: { targetId: id === killer ? 'p5' : alive(s).find((x) => x !== id) } });
  // Tutti hanno toccato: secondo gioco
  assert.equal(s.phase, PHASE.MISSION);
  assert.equal(s.phaseData.slot, 2);
  assert.equal(s.players.p5.status, 'alive'); // vivo fino al tramonto
  while (s.phase === PHASE.MISSION) s = advance(s);
  s = voteAll(s, (id) => (id === 'p8' ? 'p7' : 'p8'));
  s = advance(advance(s)); // rivelazione -> tramonto
  assert.equal(s.phase, PHASE.DUSK);
  assert.deepEqual(viewForMaster(s).step, { victimId: 'p5', reason: 'murdered' });
  assert.equal(s.players.p5.status, 'murdered');
  s = advance(s); // notte tranquilla
  assert.equal(s.phase, PHASE.NIGHT);
  assert.equal(s.phaseData.mode, 'rest');
  assert.equal(s.phaseData.restReason, 'daylight');
});

test('Omicidio a vista: se la vittima viene bandita prima del tramonto non muore nessun altro', () => {
  let s = toDay2(9, ['p1', 'p2'], { event: 'daylightMurder', victim: 'p3', banish: 'p9' });
  const killer = s.dayEvent.killerId;
  s = advance(s); // senza giochi: subito la scena
  assert.equal(s.phase, PHASE.SCENE);
  s = ok(s, { type: A.SCENE_TOUCH, playerId: killer, payload: { targetId: 'p5' } });
  s = ok(s, { type: A.TIMER_EXPIRED, payload: { key: s.phaseData.timer.key } });
  assert.equal(s.phase, PHASE.ROUNDTABLE);
  s = voteAll(s, (id) => (id === 'p5' ? 'p4' : 'p5'));
  s = advance(advance(s));
  assert.equal(s.phase, PHASE.DUSK);
  assert.deepEqual(s.phaseData, { victimId: null, reason: 'gone' });
});

test('Omicidio a vista: lo schermo conta i tocchi senza dire chi conta', () => {
  let s = toDay2(9, ['p1', 'p2'], { event: 'daylightMurder', victim: 'p3', banish: 'p9' });
  s = advance(s);
  const killer = s.dayEvent.killerId;
  s = ok(s, { type: A.SCENE_TOUCH, playerId: killer, payload: { targetId: 'p6' } });
  const m = viewForMaster(s).step;
  assert.equal(m.touchedCount, 1);
  assert.ok(!JSON.stringify(m).includes('p6'));
  // Non interferenza: se avesse toccato un altro Leale, gli altri telefoni vedrebbero lo stesso
  let t = advance(toDay2(9, ['p1', 'p2'], { event: 'daylightMurder', victim: 'p3', banish: 'p9' }));
  t = ok(t, { type: A.SCENE_TOUCH, playerId: killer, payload: { targetId: 'p7' } });
  for (const id of ['p4', 'p5', 'p8']) assert.deepEqual(viewFor(s, id), viewFor(t, id));
});
