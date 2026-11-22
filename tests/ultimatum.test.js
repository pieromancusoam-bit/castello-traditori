// Fase 3: Ultimatum di reclutamento e convivenza con la Seduzione.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { A } from '../js/engine/actions.js';
import { PHASE } from '../js/engine/state.js';
import { ROLE } from '../js/engine/roles.js';
import { REJECT } from '../js/engine/reducer.js';
import { viewFor, viewForMaster } from '../js/engine/view.js';
import { newGame, withRoles, seeRoles, advance, ok, rejected, voteAll, alive } from './helpers.js';

const night = (s, banish) => {
  s = advance(s);
  s = voteAll(s, (id) => (id === banish ? alive(s).find((x) => x !== banish) : banish));
  return advance(advance(s));
};
const choose = (s, playerId, targetId) => ok(s, { type: A.NIGHT_CHOOSE, playerId, payload: { targetId } });
const plan = (s, playerId, p) => ok(s, { type: A.NIGHT_PLAN, playerId, payload: { plan: p } });
const answer = (s, playerId, accept) => ok(s, { type: A.SEDUCTION_ANSWER, playerId, payload: { accept } });
const game = (n, traitors, settings = {}) => seeRoles(withRoles(newGame(n, 1, { ultimatum: true, ...settings }), traitors));

test('Ultimatum: dopo il bando del primo Traditore i rimasti possono offrirlo', () => {
  let s = night(game(8, ['p1', 'p2', 'p3']), 'p1');
  assert.equal(s.phaseData.canUltimatum, true);
  assert.equal(viewFor(s, 'p2').step.canUltimatum, true);
  assert.equal(viewFor(s, 'p4').step.canUltimatum, false);
  s = plan(s, 'p2', 'ultimatum');
  s = choose(s, 'p2', 'p5');
  assert.equal(s.phaseData.offer, null); // serve l'accordo di tutti
  s = choose(s, 'p3', 'p5');
  assert.deepEqual(s.phaseData.offer, { kind: 'ultimatum', byIds: ['p2', 'p3'], targetId: 'p5', answer: null });
  assert.deepEqual(viewFor(s, 'p5').step.offer, { kind: 'ultimatum', incoming: true, targetId: 'p5', answer: null });
  assert.equal(viewFor(s, 'p4').step.offer, null);
  assert.ok(!JSON.stringify(viewFor(s, 'p5')).includes('byIds'));
  // Offerta partita: la scelta non si cambia più
  assert.equal(rejected(s, { type: A.NIGHT_CHOOSE, playerId: 'p2', payload: { targetId: 'p6' } }), REJECT.ALREADY_DONE);
});

test('Ultimatum accettato: nuovo Traditore, nessuna vittima', () => {
  let s = night(game(8, ['p1', 'p2', 'p3']), 'p1');
  s = plan(s, 'p2', 'ultimatum');
  s = choose(s, 'p2', 'p5');
  s = choose(s, 'p3', 'p5');
  s = answer(s, 'p5', true);
  for (const id of ['p4', 'p6', 'p7', 'p8']) s = choose(s, id, 'p2');
  assert.equal(s.phase, PHASE.BREAKFAST);
  assert.equal(s.phaseData.victimId, null);
  assert.equal(s.players.p5.role, ROLE.TRAITOR);
  assert.deepEqual(viewFor(s, 'p2').step.seduction, { kind: 'ultimatum', targetId: 'p5', accepted: true });
  assert.deepEqual(viewFor(s, 'p5').allies.map((a) => a.id), ['p1', 'p2', 'p3']);
  assert.equal(viewFor(s, 'p4').step.seduction, null);
});

test('Ultimatum rifiutato: il Leale è la vittima della notte, anche con lo Scudo', () => {
  let s = night(game(8, ['p1', 'p2', 'p3']), 'p1');
  s.players.p5.items = ['shield'];
  s = plan(s, 'p2', 'ultimatum');
  s = choose(s, 'p2', 'p5');
  s = choose(s, 'p3', 'p5');
  s = answer(s, 'p5', false);
  for (const id of ['p4', 'p6', 'p7', 'p8']) s = choose(s, id, 'p2');
  assert.equal(s.phaseData.victimId, 'p5');
  assert.equal(s.players.p5.status, 'murdered');
  assert.deepEqual(s.players.p5.items, ['shield']);
  assert.equal(s.players.p5.role, ROLE.FAITHFUL);
});

test('Ultimatum senza risposta all\'alba vale come rifiutato', () => {
  let s = night(game(8, ['p1', 'p2', 'p3']), 'p1');
  s = plan(s, 'p2', 'ultimatum');
  s = choose(s, 'p2', 'p5');
  s = choose(s, 'p3', 'p5');
  s = advance(s);
  assert.equal(s.players.p5.status, 'murdered');
});

test('Ultimatum: una sola volta per partita; si può anche scegliere di uccidere', () => {
  let s = night(game(9, ['p1', 'p2', 'p3']), 'p1');
  // I Traditori preferiscono uccidere
  s = choose(s, 'p2', 'p5');
  s = choose(s, 'p3', 'p5');
  s = advance(s);
  assert.equal(s.players.p5.status, 'murdered');
  // Bandito un secondo Traditore: niente Ultimatum
  s = night(s, 'p2');
  assert.equal(s.phaseData.canUltimatum, false);
});

test('Ultimatum perso se il primo Traditore bandito era l\'ultimo: notte del castello', () => {
  const s = night(game(7, ['p1']), 'p1');
  assert.equal(s.phaseData.mode, 'castle');
  assert.equal(s.phaseData.canUltimatum, false);
  assert.equal(s.ultimatum.done, true);
});

test('Ultimatum spento nelle impostazioni', () => {
  const s = night(game(8, ['p1', 'p2'], { ultimatum: false }), 'p1');
  assert.equal(s.phaseData.canUltimatum, false);
});

test('Seduzione e Ultimatum: nella stessa notte vince l\'Ultimatum', () => {
  // Seduzione accesa a mano con 2 Traditori, uno bandito il giorno 1
  const s = night(game(8, ['p1', 'p2'], { seduction: true }), 'p1');
  assert.equal(s.phaseData.canUltimatum, true);
  assert.equal(s.phaseData.canSeduce, false);
  assert.equal(rejected(s, { type: A.NIGHT_PLAN, playerId: 'p2', payload: { plan: 'seduce' } }), REJECT.INVALID_PAYLOAD);
});

test('Seduzione accettata la prima notte, poi Ultimatum al primo Traditore bandito', () => {
  let s = game(7, ['p1'], { seduction: true });
  s = night(s, 'p7'); // bandito un Leale; prima notte con la Seduzione
  assert.equal(s.phaseData.canSeduce, true);
  s = plan(s, 'p1', 'seduce');
  s = choose(s, 'p1', 'p2');
  s = answer(s, 'p2', true);
  for (const id of ['p3', 'p4', 'p5', 'p6']) s = choose(s, id, 'p1');
  assert.equal(s.players.p2.role, ROLE.TRAITOR);
  // Giorno 2: bandito p1; la notte dopo p2 può offrire l'Ultimatum
  s = night(s, 'p1');
  assert.equal(s.phaseData.canUltimatum, true);
  assert.equal(viewFor(s, 'p2').step.canUltimatum, true);
});

test('Ultimatum: lo schermo non dice nulla dell\'offerta', () => {
  let s = night(game(8, ['p1', 'p2', 'p3']), 'p1');
  s = plan(s, 'p2', 'ultimatum');
  s = choose(s, 'p2', 'p5');
  s = choose(s, 'p3', 'p5');
  const json = JSON.stringify(viewForMaster(s));
  assert.ok(!json.includes('ultimatum') && !json.includes('offer'));
});
