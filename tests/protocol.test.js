import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MSG, validateMessage, cleanName } from '../js/net/protocol.js';
import { isValidPhoto, isGameAction } from '../js/net/protocol.js';
import { generateRoomCode, normalizeRoomCode, parsePeerServer, formatPeerServer, peerIdFor } from '../js/net/room-code.js';
import { NET } from '../js/config/net-config.js';

test('il master accetta dal telefono solo hello, action, ping, pong', () => {
  assert.ok(validateMessage({ t: MSG.HELLO, name: 'Anna' }, 'player').ok);
  assert.ok(validateMessage({ t: MSG.ACTION, type: 'WAVE', nonce: 'a1' }, 'player').ok);
  assert.ok(validateMessage({ t: MSG.PONG, n: 3 }, 'player').ok);
  assert.ok(!validateMessage({ t: MSG.VIEW, view: {} }, 'player').ok);
  assert.ok(!validateMessage({ t: MSG.WELCOME, playerId: 'p', token: 't' }, 'player').ok);
});

test('messaggi malformati sono rifiutati', () => {
  for (const bad of [null, 'ciao', [], {}, { t: 'boh' }, { t: MSG.ACTION, type: 'WAVE' },
    { t: MSG.HELLO, name: 'x'.repeat(65) }, { t: MSG.ACTION, type: 'W', nonce: 'n', payload: [1] }]) {
    assert.ok(!validateMessage(bad, 'player').ok, JSON.stringify(bad));
  }
});

test('il telefono accetta dal master solo i tipi previsti', () => {
  assert.ok(validateMessage({ t: MSG.VIEW, view: { roomCode: 'ABCD' } }, 'master').ok);
  assert.ok(validateMessage({ t: MSG.ERROR, code: 'ROOM_FULL' }, 'master').ok);
  assert.ok(!validateMessage({ t: MSG.HELLO }, 'master').ok);
});

test('cleanName toglie caratteri pericolosi e taglia la lunghezza', () => {
  assert.equal(cleanName('  Anna\n  Maria '), 'Anna Maria');
  assert.equal(cleanName('<b>Bo</b>'), 'bBo/b');
  assert.equal(cleanName('x'.repeat(40)).length, NET.nameMaxLength);
  assert.equal(cleanName(42), '');
});

test('codice stanza: lunghezza giusta e solo caratteri non ambigui', () => {
  let seed = 1;
  const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 200; i++) {
    const c = generateRoomCode(rng);
    assert.equal(c.length, NET.roomCodeLength);
    assert.ok(!/[01OIL]/.test(c), c);
    assert.equal(normalizeRoomCode(c.toLowerCase()), c);
  }
  assert.equal(normalizeRoomCode('7K3O'), null);
  assert.equal(normalizeRoomCode('7K3'), null);
  assert.equal(peerIdFor('7K3Q'), 'castello-traditori-7K3Q');
});

test('server di aggancio: lettura e scrittura del formato host:porta/percorso', () => {
  assert.deepEqual(parsePeerServer('192.168.1.10:9000/castello'), { host: '192.168.1.10', port: 9000, path: '/castello' });
  assert.deepEqual(parsePeerServer('peer.example.it'), { host: 'peer.example.it', port: 443, path: '/' });
  assert.equal(parsePeerServer('http://x'), null);
  assert.equal(parsePeerServer(''), null);
  assert.equal(formatPeerServer(parsePeerServer('a.b:9000/p')), 'a.b:9000/p');
});

test('ritratto: solo JPEG base64 entro la dimensione massima', () => {
  const jpeg = 'data:image/jpeg;base64,' + 'A'.repeat(1000) + '==';
  assert.equal(isValidPhoto(jpeg), true);
  assert.equal(isValidPhoto('data:image/png;base64,AAAA'), false);
  assert.equal(isValidPhoto('data:image/jpeg;base64,AA"><script>'), false);
  assert.equal(isValidPhoto('javascript:alert(1)'), false);
  assert.equal(isValidPhoto('data:image/jpeg;base64,' + 'A'.repeat(NET.photoMaxChars)), false);
  assert.equal(isValidPhoto(null), false);
});

test('le azioni di gioco sono riconosciute, le altre no', () => {
  assert.equal(isGameAction('VOTE'), true);
  assert.equal(isGameAction('ADVANCE'), false, 'un telefono non può mandare "Avanti"');
  assert.equal(isGameAction('WAVE'), false);
});
