// Fase 3: oggetti (Scudo, Pugnale, Maledizione, Sigillo, Specchio) e premio delle missioni.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { A } from '../js/engine/actions.js';
import { PHASE } from '../js/engine/state.js';
import { REJECT } from '../js/engine/reducer.js';
import { viewFor, viewForMaster } from '../js/engine/view.js';
import { newGame, withRoles, seeRoles, advance, ok, rejected, voteAll } from './helpers.js';

const give = (s, id, ...items) => {
  const c = structuredClone(s);
  c.players[id].items.push(...items);
  return c;
};
const use = (s, playerId, item, targetId) => ok(s, { type: A.USE_ITEM, playerId, payload: targetId ? { item, targetId } : { item } });
const vote = (s, playerId, targetId) => ok(s, { type: A.VOTE, playerId, payload: { targetId } });

// Giorno 1 senza giochi: Colazione -> Tavola Rotonda; si bandisce `banish`, poi Notte
function toNight(s, banish) {
  s = advance(s); // Tavola Rotonda
  s = voteAll(s, (id) => (id === banish ? s.order.find((x) => x !== banish) : banish));
  s = advance(s); // rivelazione
  return advance(s); // notte
}

test('Scudo: l\'omicidio fallisce, lo Scudo si consuma, "omicidio fallito" senza nome', () => {
  let s = seeRoles(withRoles(newGame(7), ['p1', 'p2']));
  s = give(s, 'p6', 'shield');
  s = toNight(s, 'p7');
  assert.equal(s.phase, PHASE.NIGHT);
  s = ok(s, { type: A.NIGHT_CHOOSE, playerId: 'p1', payload: { targetId: 'p6' } });
  s = ok(s, { type: A.NIGHT_CHOOSE, playerId: 'p2', payload: { targetId: 'p6' } });
  s = advance(s); // alba
  assert.equal(s.phase, PHASE.BREAKFAST);
  assert.equal(s.phaseData.victimId, null);
  assert.equal(s.players.p6.status, 'alive');
  assert.deepEqual(s.players.p6.items, []);
  assert.equal(s.history.at(-1).type, 'murder-failed');
  assert.equal(viewForMaster(s).step.failed, true);
  assert.ok(!JSON.stringify(viewForMaster(s).step).includes('p6'));
  // Senza Scudo la notte dopo si muore
  s = toNight(s, 'p5');
  s = ok(s, { type: A.NIGHT_CHOOSE, playerId: 'p1', payload: { targetId: 'p6' } });
  s = ok(s, { type: A.NIGHT_CHOOSE, playerId: 'p2', payload: { targetId: 'p6' } });
  s = advance(s);
  assert.equal(s.players.p6.status, 'murdered');
});

test('Pugnale: il voto conta doppio e si vede solo alla rivelazione sullo schermo', () => {
  let s = advance(seeRoles(withRoles(newGame(6), ['p1'])));
  s = give(s, 'p3', 'dagger');
  assert.equal(viewFor(s, 'p3').me.itemActions.dagger, true);
  assert.equal(viewFor(s, 'p2').me.itemActions.dagger, false);
  s = use(s, 'p3', 'dagger');
  assert.deepEqual(s.players.p3.items, []);
  assert.equal(viewFor(s, 'p3').step.dagger, true);
  assert.ok(!JSON.stringify(viewForMaster(s)).includes('dagger'));
  s = vote(s, 'p3', 'p4');
  s = vote(s, 'p5', 'p6');
  s = vote(s, 'p6', 'p5');
  s = advance(s); // chiude la votazione
  assert.deepEqual(s.phaseData.outcome, { kind: 'banish', playerId: 'p4' });
  const votes = viewForMaster(s).step.votes;
  assert.equal(votes.find((v) => v.voterId === 'p3').double, true);
  assert.equal(votes.find((v) => v.voterId === 'p5').double, false);
  // Ai telefoni solo l'esito
  assert.ok(!JSON.stringify(viewFor(s, 'p2')).includes('double'));
});

test('Pugnale: non dopo aver votato, non senza averlo, non nella Cerimonia', () => {
  let s = advance(seeRoles(withRoles(newGame(6), ['p1'])));
  s = give(s, 'p3', 'dagger');
  s = vote(s, 'p3', 'p4');
  assert.equal(rejected(s, { type: A.USE_ITEM, playerId: 'p3', payload: { item: 'dagger' } }), REJECT.WRONG_PHASE);
  assert.equal(rejected(s, { type: A.USE_ITEM, playerId: 'p2', payload: { item: 'dagger' } }), REJECT.NOT_ALLOWED);
  assert.equal(rejected(s, { type: A.USE_ITEM, playerId: 'p3', payload: { item: 'shield' } }), REJECT.INVALID_PAYLOAD);
});

test('Maledizione: il maledetto non vota; si annuncia lui, mai chi l\'ha lanciata', () => {
  let s = seeRoles(withRoles(newGame(6), ['p1'])); // Colazione, partita senza giochi
  s = give(s, 'p2', 'curse');
  const targets = viewFor(s, 'p2').me.itemActions.curse;
  assert.ok(targets.includes('p3') && !targets.includes('p2'));
  s = use(s, 'p2', 'curse', 'p3');
  assert.deepEqual(viewForMaster(s).curses, ['p3']);
  // Non interferenza: se l'avesse lanciata p5 le viste degli altri sarebbero identiche
  let t = give(seeRoles(withRoles(newGame(6), ['p1'])), 'p5', 'curse');
  t = use(t, 'p5', 'curse', 'p3');
  for (const id of ['p1', 'p3', 'p4', 'p6']) assert.deepEqual(viewFor(s, id), viewFor(t, id));
  assert.deepEqual(viewForMaster(s), viewForMaster(t));

  s = advance(s); // Tavola Rotonda
  assert.equal(viewFor(s, 'p3').step.cursed, true);
  assert.equal(viewFor(s, 'p3').step.canVote, false);
  assert.equal(rejected(s, { type: A.VOTE, playerId: 'p3', payload: { targetId: 'p1' } }), REJECT.NOT_ALLOWED);
  assert.equal(viewForMaster(s).step.voterCount, 5);
  for (const id of ['p1', 'p2', 'p4', 'p5', 'p6']) s = vote(s, id, id === 'p4' ? 'p5' : 'p4');
  assert.equal(s.phaseData.stage, 'results'); // chiusa senza aspettare il maledetto
  // Il maledetto resta votabile
  assert.deepEqual(s.phaseData.outcome, { kind: 'banish', playerId: 'p4' });
  // La notte la Maledizione decade
  s = advance(advance(s));
  assert.equal(s.phase, PHASE.NIGHT);
  assert.deepEqual(s.curses, []);
});

test('Maledizione: solo dopo i giochi del giorno (o alla Colazione senza giochi)', () => {
  let s = advance(seeRoles(withRoles(newGame(6), ['p1']))); // Tavola Rotonda
  s = give(s, 'p2', 'curse');
  assert.equal(viewFor(s, 'p2').me.itemActions.curse, null);
  assert.equal(rejected(s, { type: A.USE_ITEM, playerId: 'p2', payload: { item: 'curse', targetId: 'p3' } }), REJECT.WRONG_PHASE);
});

test('Sigillo: il maledetto spezza la Maledizione, si vede, e può votare', () => {
  let s = seeRoles(withRoles(newGame(6), ['p1']));
  s = give(s, 'p2', 'curse');
  s = give(s, 'p3', 'seal');
  assert.equal(viewFor(s, 'p3').me.itemActions.seal, false); // non è maledetto
  s = use(s, 'p2', 'curse', 'p3');
  s = advance(s); // Tavola Rotonda
  assert.equal(viewFor(s, 'p3').me.itemActions.seal, true);
  s = use(s, 'p3', 'seal');
  assert.deepEqual(s.curses, []);
  assert.deepEqual(viewForMaster(s).sealed, ['p3']);
  s = vote(s, 'p3', 'p1');
  assert.equal(s.phaseData.ballot.votes.p3, 'p1');
});

test('Specchio: chi ha votato contro di me all\'ultima Tavola Rotonda, solo a me', () => {
  let s = advance(seeRoles(withRoles(newGame(6), ['p1'])));
  s = give(s, 'p5', 'mirror');
  assert.equal(viewFor(s, 'p5').me.itemActions.mirror, false); // nessun voto ancora
  for (const [from, to] of [['p1', 'p5'], ['p2', 'p5'], ['p3', 'p4'], ['p4', 'p3'], ['p5', 'p4'], ['p6', 'p4']]) s = vote(s, from, to);
  s = advance(s); // rivelazione
  s = use(s, 'p5', 'mirror');
  assert.deepEqual(viewFor(s, 'p5').me.mirror, { day: 1, voters: ['p1', 'p2'] });
  assert.equal(viewFor(s, 'p2').me.mirror, null);
  assert.ok(!JSON.stringify(viewForMaster(s)).includes('mirror'));
});

test('missione riuscita: un oggetto in segreto a un giocatore; lo schermo dice solo che è successo', () => {
  let s = seeRoles(withRoles(newGame(6, 1, { missions: true, missionsPerDay: 1 }), ['p1']));
  s = ok(s, { type: A.DEBUG_NEXT, payload: { mission: 'chest' } });
  s = advance(advance(s)); // regole -> gioco
  for (const id of s.phaseData.data.group) s = ok(s, { type: A.MISSION_INPUT, playerId: id, payload: { choice: 'gold' } });
  assert.equal(s.phaseData.stage, 'result');
  const gift = s.phaseData.gift;
  assert.ok(gift && s.players[gift.playerId].items.includes(gift.item));
  assert.equal(viewForMaster(s).step.result.itemGiven, true);
  assert.equal(viewForMaster(s).step.myGift, null);
  for (const id of s.order) assert.equal(viewFor(s, id).step.myGift, id === gift.playerId ? gift.item : null);
  assert.ok(!JSON.stringify(viewForMaster(s)).includes(gift.item));
});

test('missione fallita: nessun oggetto', () => {
  let s = seeRoles(withRoles(newGame(6, 1, { missions: true, missionsPerDay: 1 }), ['p1']));
  s = ok(s, { type: A.DEBUG_NEXT, payload: { mission: 'chest' } });
  s = advance(advance(s));
  for (const id of s.phaseData.data.group) s = ok(s, { type: A.MISSION_INPUT, playerId: id, payload: { choice: 'lead' } });
  assert.equal(s.phaseData.gift, undefined);
  assert.equal(viewForMaster(s).step.result.itemGiven, false);
});
