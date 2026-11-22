// Fase 3: strumenti di prova del master.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { A } from '../js/engine/actions.js';
import { newGame, seeRoles, advance, ok, rejected } from './helpers.js';
import { viewFor, viewForMaster } from '../js/engine/view.js';

test('prove (?debug=1): il master sceglie il prossimo gioco', () => {
  let s = seeRoles(newGame(6, 1, { missions: true }));
  s = ok(s, { type: A.DEBUG_NEXT, payload: { mission: 'memory' } });
  s = advance(s); // Colazione -> primo gioco
  assert.equal(s.phaseData.id, 'memory');
  assert.ok(!s.missionBag.includes('memory'));
  // La scelta non arriva sugli schermi
  assert.ok(!JSON.stringify(viewForMaster(s)).includes('debugNext'));
  assert.ok(!JSON.stringify(viewFor(s, 'p1')).includes('debugNext'));
});

test('prove: un telefono non può mandare DEBUG_NEXT', () => {
  const s = seeRoles(newGame(6));
  rejected(s, { type: A.DEBUG_NEXT, playerId: 'p1', payload: { mission: 'chest' } });
});
