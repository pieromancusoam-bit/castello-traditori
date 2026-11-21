import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openBallot, voteError, tally, outcomeOf } from '../js/engine/votes.js';

const order = ['a', 'b', 'c', 'd', 'e'];

const withVotes = (ballot, votes) => ({ ...ballot, votes });

test('voti non validi: morto, doppio, sé stesso, bersaglio non vivo', () => {
  const alive = ['a', 'b', 'c'];
  const b = openBallot();
  assert.equal(voteError(b, 'z', 'a', alive), 'NOT_ALIVE');
  assert.equal(voteError(b, 'a', 'a', alive), 'SELF_VOTE');
  assert.equal(voteError(b, 'a', 'd', alive), 'INVALID_TARGET');
  assert.equal(voteError(withVotes(b, { a: 'b' }), 'a', 'c', alive), 'ALREADY_VOTED');
  assert.equal(voteError(b, 'a', 'b', alive), null);
});

test('al ballottaggio si vota solo tra i candidati', () => {
  const b = openBallot(['b', 'c']);
  assert.equal(b.round, 2);
  assert.equal(voteError(b, 'a', 'd', order), 'NOT_CANDIDATE');
  assert.equal(voteError(b, 'a', 'b', order), null);
  assert.equal(voteError(b, 'b', 'b', order), 'SELF_VOTE');
  assert.equal(voteError(b, 'b', 'c', order), null);
});

test('conteggio e leader nell\'ordine dei giocatori', () => {
  const t = tally({ a: 'c', b: 'c', c: 'b', d: 'b', e: 'a' }, order);
  assert.deepEqual(t.counts, { c: 2, b: 2, a: 1 });
  assert.equal(t.max, 2);
  assert.deepEqual(t.leaders, ['b', 'c']);
});

test('un solo più votato viene bandito', () => {
  const o = outcomeOf(withVotes(openBallot(), { a: 'c', b: 'c', c: 'a' }), order);
  assert.deepEqual(o, { kind: 'banish', playerId: 'c' });
});

test('parità al primo turno: ballottaggio tra i più votati', () => {
  const o = outcomeOf(withVotes(openBallot(), { a: 'c', b: 'd', c: 'd', d: 'c' }), order);
  assert.deepEqual(o, { kind: 'runoff', candidates: ['c', 'd'] });
});

test('parità al ballottaggio: nessuno bandito', () => {
  const o = outcomeOf(withVotes(openBallot(['c', 'd']), { a: 'c', b: 'd' }), order);
  assert.deepEqual(o, { kind: 'none', reason: 'tie' });
});

test('nessun voto: nessuno bandito', () => {
  assert.deepEqual(outcomeOf(openBallot(), order), { kind: 'none', reason: 'no-votes' });
});
