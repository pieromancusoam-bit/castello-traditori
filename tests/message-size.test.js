// Ogni messaggio verso un telefono deve stare sotto il tetto di PeerJS (JSON):
// sopra i 16300 byte PeerJS chiude il canale e il telefono si scollega in continuazione.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../js/engine/state.js';
import { viewFor } from '../js/engine/view.js';
import { A } from '../js/engine/actions.js';
import { NET } from '../js/config/net-config.js';
import { GAME } from '../js/config/game-config.js';
import { isValidPhoto } from '../js/net/protocol.js';
import { withRoles, seeRoles, advance, ok } from './helpers.js';

const bytes = (msg) => new TextEncoder().encode(JSON.stringify(msg)).byteLength;

test('caso peggiore: vista di un Traditore con 16 giocatori, nomi lunghi e chat piena', () => {
  // Nomi di 16 caratteri da 3 byte ciascuno, id come quelli veri
  const players = Array.from({ length: NET.maxPlayers }, (_, i) => ({
    id: `p_${String(i).padStart(8, '0')}`,
    name: '€'.repeat(NET.nameMaxLength - 2) + String(i).padStart(2, '0'),
  }));
  let s = createGame({ players, seed: 3 });
  const traitors = players.slice(0, 3).map((p) => p.id);
  s = advance(seeRoles(withRoles(s, traitors)));
  s = advance(advance(s)); // notte
  // Tanta cronologia, come dopo molti giorni
  for (let d = 0; d < 40; d++) s.history.push({ day: d, type: 'banished', playerId: players[d % 16].id, faction: 'faithfuls' });
  for (let i = 0; i < 100; i++) {
    s = ok(s, { type: A.NIGHT_CHAT, playerId: traitors[i % 3], payload: { text: '€'.repeat(GAME.chatMaxLength) } });
  }
  for (const t of traitors) s = ok(s, { type: A.NIGHT_CHOOSE, playerId: t, payload: { targetId: players[5 + (t === traitors[0] ? 0 : 1)].id } });

  const msg = {
    t: 'view',
    view: { roomCode: '7K3Q', me: { id: traitors[0], name: players[0].name }, playersCount: 16, connectedCount: 16, hasPhoto: true, game: viewFor(s, traitors[0]) },
  };
  const size = bytes(msg);
  assert.ok(s.phaseData.chat.length > 0);
  console.log(`vista nel caso peggiore: ${size} byte`);
  assert.ok(size <= NET.messageMaxBytes, `vista di ${size} byte, tetto ${NET.messageMaxBytes}`);
});

test('il tetto dei messaggi resta sotto il limite di PeerJS (16300 byte)', () => {
  assert.ok(NET.messageMaxBytes < 16300);
});

test('un ritratto valido sta sempre in un messaggio', () => {
  const photo = 'data:image/jpeg;base64,' + 'A'.repeat(NET.photoMaxChars - 23);
  assert.ok(isValidPhoto(photo));
  const msg = { t: 'action', type: 'SET_PHOTO', nonce: 'abcdef123456', payload: { data: photo } };
  assert.ok(bytes(msg) <= NET.messageMaxBytes);
});
