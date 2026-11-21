import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/engine/rng.js';
import { traitorCountFor, assignRoles, ROLE, factionOf, FACTION } from '../js/engine/roles.js';

test('stesso seed, stessa sequenza; lo stato permette di riprendere', () => {
  const a = createRng(42);
  const b = createRng(42);
  const seqA = [a.next(), a.next(), a.next()];
  assert.deepEqual(seqA, [b.next(), b.next(), b.next()]);
  const resumed = createRng(a.state);
  assert.equal(resumed.next(), a.next());
});

test('int e shuffle restano nei limiti e non perdono elementi', () => {
  const r = createRng(7);
  for (let i = 0; i < 200; i++) {
    const n = r.int(5);
    assert.ok(n >= 0 && n < 5 && Number.isInteger(n));
  }
  const arr = [1, 2, 3, 4, 5, 6];
  assert.deepEqual(r.shuffle(arr).sort(), arr);
});

test('numero di Traditori secondo la tabella', () => {
  assert.equal(traitorCountFor(5), 1);
  assert.equal(traitorCountFor(6), 1);
  assert.equal(traitorCountFor(7), 2);
  assert.equal(traitorCountFor(9), 2);
  assert.equal(traitorCountFor(10), 3);
  assert.equal(traitorCountFor(16), 3);
});

test('assegnazione: esattamente N Traditori, tutti gli altri Leali', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  for (let seed = 1; seed < 50; seed++) {
    const roles = assignRoles(ids, 2, createRng(seed));
    const traitors = ids.filter((id) => roles[id] === ROLE.TRAITOR);
    assert.equal(traitors.length, 2);
    assert.equal(Object.keys(roles).length, ids.length);
  }
});

test('fazione dal ruolo', () => {
  assert.equal(factionOf(ROLE.TRAITOR), FACTION.TRAITORS);
  assert.equal(factionOf(ROLE.FAITHFUL), FACTION.FAITHFULS);
});
