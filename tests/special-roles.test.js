// Fase 3: ruoli speciali (Veggente, Traditore Segreto, Cavaliere).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { A } from '../js/engine/actions.js';
import { PHASE } from '../js/engine/state.js';
import { ROLE } from '../js/engine/roles.js';
import { REJECT } from '../js/engine/reducer.js';
import { viewFor, viewForMaster } from '../js/engine/view.js';
import { newGame, seeRoles, advance, ok, rejected, voteAll } from './helpers.js';

// Ruoli fissati a mano: { p1: 'traitor', p2: 'secret_traitor', ... }, gli altri Leali
function withSpecial(state, roles) {
  const s = structuredClone(state);
  for (const id of s.order) s.players[id].role = roles[id] || ROLE.FAITHFUL;
  return s;
}
const night = (s, banish) => {
  s = advance(s); // Tavola Rotonda
  s = voteAll(s, (id) => (id === banish ? s.order.find((x) => x !== banish) : banish));
  return advance(advance(s)); // rivelazione -> notte
};
const choose = (s, playerId, targetId) => ok(s, { type: A.NIGHT_CHOOSE, playerId, payload: { targetId } });

test('Veggente: una volta per partita scopre la fazione di un giocatore, solo lui la vede', () => {
  let s = seeRoles(withSpecial(newGame(7), { p1: ROLE.TRAITOR, p2: ROLE.TRAITOR, p3: ROLE.SEER }));
  s = night(s, 'p7');
  assert.equal(viewFor(s, 'p3').step.canVision, true);
  assert.equal(viewFor(s, 'p4').step.canVision, false);
  assert.equal(rejected(s, { type: A.NIGHT_VISION, playerId: 'p4', payload: { targetId: 'p1' } }), REJECT.NOT_ALLOWED);
  s = ok(s, { type: A.NIGHT_VISION, playerId: 'p3', payload: { targetId: 'p1' } });
  assert.deepEqual(viewFor(s, 'p3').me.vision, { day: 1, targetId: 'p1', faction: 'traitors' });
  assert.equal(viewFor(s, 'p3').step.canVision, false);
  assert.equal(rejected(s, { type: A.NIGHT_VISION, playerId: 'p3', payload: { targetId: 'p2' } }), REJECT.ALREADY_DONE);
  // Nessun altro (né lo schermo) sa della visione
  for (const id of ['p1', 'p2', 'p4']) assert.equal(viewFor(s, id).me.vision, null);
  assert.ok(!JSON.stringify(viewForMaster(s)).includes('vision'));
});

test('Veggente: la visione sul Traditore Segreto dice "Traditori"', () => {
  let s = seeRoles(withSpecial(newGame(8), { p1: ROLE.TRAITOR, p2: ROLE.SECRET_TRAITOR, p3: ROLE.SEER }));
  s = night(s, 'p8');
  s = ok(s, { type: A.NIGHT_VISION, playerId: 'p3', payload: { targetId: 'p2' } });
  assert.equal(viewFor(s, 'p3').me.vision.faction, 'traitors');
});

test('Traditore Segreto: conosce i Traditori, loro non conoscono lui', () => {
  const s = seeRoles(withSpecial(newGame(8), { p1: ROLE.TRAITOR, p2: ROLE.TRAITOR, p3: ROLE.SECRET_TRAITOR }));
  assert.deepEqual(viewFor(s, 'p1').allies.map((a) => a.id), ['p2']);
  assert.deepEqual(viewFor(s, 'p3').allies.map((a) => a.id), ['p1', 'p2']);
  assert.equal(viewFor(s, 'p3').me.faction, 'traitors');
});

test('Traditore Segreto: di notte legge la chat, non scrive, e cambia la vittima una volta', () => {
  let s = seeRoles(withSpecial(newGame(8), { p1: ROLE.TRAITOR, p2: ROLE.TRAITOR, p3: ROLE.SECRET_TRAITOR }));
  s = night(s, 'p8');
  s = ok(s, { type: A.NIGHT_CHAT, playerId: 'p1', payload: { text: 'colpiamo p4' } });
  assert.equal(rejected(s, { type: A.NIGHT_CHAT, playerId: 'p3', payload: { text: 'ciao' } }), REJECT.NOT_ALLOWED);
  const v3 = viewFor(s, 'p3').step;
  assert.equal(v3.killer, false);
  assert.equal(v3.chat[0].text, 'colpiamo p4');
  assert.equal(v3.secret.canSwap, true);
  // I Traditori non vedono lui tra chi sceglie
  assert.deepEqual(viewFor(s, 'p1').step.allyPicks.map((a) => a.id), ['p1', 'p2']);
  // Prima dell'accordo non può cambiare
  assert.equal(rejected(s, { type: A.NIGHT_SWAP, playerId: 'p3', payload: { targetId: 'p5' } }), REJECT.WRONG_PHASE);
  s = choose(s, 'p1', 'p4');
  s = choose(s, 'p2', 'p4');
  for (const id of ['p3', 'p4', 'p5', 'p6', 'p7']) s = choose(s, id, 'p1');
  // Tutti hanno scelto, ma la notte aspetta la decisione del Traditore Segreto
  assert.equal(s.phase, PHASE.NIGHT);
  assert.equal(rejected(s, { type: A.NIGHT_SWAP, playerId: 'p3', payload: { targetId: 'p1' } }), REJECT.INVALID_TARGET);
  s = ok(s, { type: A.NIGHT_SWAP, playerId: 'p3', payload: { targetId: 'p5' } });
  assert.equal(s.phase, PHASE.BREAKFAST);
  assert.equal(s.phaseData.victimId, 'p5');
  assert.equal(s.players.p4.status, 'alive');
  assert.equal(s.players.p3.swapUsed, true);
  // La notte dopo il potere non c'è più: la notte finisce senza aspettarlo
  s = night(s, 'p7');
  assert.equal(viewFor(s, 'p3').step.secret.canSwap, false);
  s = choose(s, 'p1', 'p4');
  s = choose(s, 'p2', 'p4');
  for (const id of ['p3', 'p4', 'p6']) s = choose(s, id, 'p1');
  assert.equal(s.phase, PHASE.BREAKFAST);
  assert.equal(s.phaseData.victimId, 'p4');
});

test('Traditore Segreto: può lasciare la vittima com\'è', () => {
  let s = seeRoles(withSpecial(newGame(7), { p1: ROLE.TRAITOR, p2: ROLE.SECRET_TRAITOR }));
  s = night(s, 'p7');
  s = choose(s, 'p1', 'p4');
  for (const id of ['p2', 'p3', 'p4', 'p5', 'p6']) s = choose(s, id, 'p1');
  s = ok(s, { type: A.NIGHT_SWAP, playerId: 'p2', payload: { targetId: null } });
  assert.equal(s.phaseData.victimId, 'p4');
  assert.equal(s.players.p2.swapUsed, false);
});

test('Traditore Segreto: i Traditori possono colpirlo; se non usa il potere muore', () => {
  let s = seeRoles(withSpecial(newGame(7), { p1: ROLE.TRAITOR, p2: ROLE.SECRET_TRAITOR }));
  s = night(s, 'p7');
  assert.ok(!viewFor(s, 'p1').step.disabled.includes('p2'));
  s = choose(s, 'p1', 'p2');
  s = advance(s); // alba senza decisione
  assert.equal(s.players.p2.status, 'murdered');
});

test('Traditore Segreto: rimasto solo, uccide lui e il castello non sceglie un nuovo Traditore', () => {
  let s = seeRoles(withSpecial(newGame(7), { p1: ROLE.TRAITOR, p2: ROLE.SECRET_TRAITOR }));
  s = night(s, 'p1'); // bandito l'unico Traditore noto
  assert.equal(s.phaseData.mode, 'murder');
  assert.equal(viewFor(s, 'p2').step.killer, true);
  assert.equal(viewFor(s, 'p2').step.secret, null);
  s = choose(s, 'p2', 'p5');
  for (const id of ['p3', 'p4', 'p5', 'p6', 'p7']) s = choose(s, id, 'p2');
  assert.equal(s.phaseData.victimId, 'p5');
});

test('nuovo Traditore scelto dal castello: un Veggente perde il potere', () => {
  let s = seeRoles(withSpecial(newGame(6), { p1: ROLE.TRAITOR, p2: ROLE.SEER, p3: ROLE.SEER, p4: ROLE.SEER, p5: ROLE.SEER, p6: ROLE.SEER }));
  s = night(s, 'p1');
  assert.equal(s.phaseData.mode, 'castle');
  const chosen = s.players[s.phaseData.newTraitorId];
  assert.equal(chosen.role, ROLE.TRAITOR);
  assert.equal(viewFor(s, chosen.id).step.canVision, false);
});

test('Cavaliere: lo Scudo di partenza lo salva la prima volta', () => {
  let s = seeRoles(withSpecial(newGame(7), { p1: ROLE.TRAITOR, p2: ROLE.TRAITOR, p3: ROLE.KNIGHT }));
  s.players.p3.items = ['shield'];
  s = night(s, 'p7');
  s = choose(s, 'p1', 'p3');
  s = choose(s, 'p2', 'p3');
  s = advance(s);
  assert.equal(s.players.p3.status, 'alive');
  assert.equal(s.phaseData.failed, true);
});

test('fine partita: si scoprono anche i ruoli speciali', () => {
  let s = seeRoles(withSpecial(newGame(5), { p1: ROLE.SECRET_TRAITOR, p2: ROLE.SEER }));
  s.phase = PHASE.ENDED;
  s.winner = 'traitors';
  s.phaseData = {};
  const roles = Object.fromEntries(viewForMaster(s).players.map((p) => [p.id, p.role]));
  assert.equal(roles.p1, ROLE.SECRET_TRAITOR);
  assert.equal(roles.p2, ROLE.SEER);
});
