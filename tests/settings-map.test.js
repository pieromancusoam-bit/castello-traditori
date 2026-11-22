// Impostazioni partita: dalle scelte del pannello alle impostazioni del motore.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultChoices, choicesToSettings, normalizeChoices } from '../js/master/settings-map.js';
import { resolveSettings } from '../js/engine/state.js';
import { GAME } from '../js/config/game-config.js';
import { newGame, seeRoles, advance, ok } from './helpers.js';
import { A } from '../js/engine/actions.js';
import { MISSIONS } from '../js/config/missions.js';

test('pannello: con le scelte di partenza la partita usa i valori di js/config/', () => {
  for (const n of [5, 8, 12, 16]) {
    assert.deepEqual(resolveSettings(n, choicesToSettings(defaultChoices())), resolveSettings(n, {}));
  }
});

test('pannello: scelte a mano', () => {
  const c = normalizeChoices({
    traitorCount: 2, finalThreshold: 3, missionsPerDay: 2, missionTimeScale: 1.5, presentations: false, presentationSec: 60,
    discussion: 3, seduction: 'on', roles: { seer: 'off', secretTraitor: 'on' }, ultimatum: false, events: { fog: false },
  });
  const s = resolveSettings(10, choicesToSettings(c));
  assert.equal(s.traitorCount, 2);
  assert.equal(s.finalThreshold, 3);
  assert.equal(s.missionsPerDay, 2);
  assert.equal(s.missionTimeScale, 1.5);
  assert.equal(s.presentations, false);
  assert.equal(s.presentationMs, 60000);
  assert.equal(s.discussionMs, 180000);
  assert.equal(s.seduction, true);
  assert.deepEqual(s.roles, { seer: false, knight: true, secretTraitor: true });
  assert.equal(s.ultimatum, false);
  assert.equal(s.events.fog, false);
  assert.equal(s.events.banquet, true);
});

test('pannello: discussione spenta', () => {
  const s = choicesToSettings({ discussion: 'off' });
  assert.equal(s.discussion, false);
  assert.equal(s.discussionMs, null);
});

test('timer dei giochi: il moltiplicatore allunga solo i giochi', () => {
  let s = seeRoles(newGame(6, 1, { missions: true, missionTimeScale: 2, discussion: true, discussionMs: 60000 }));
  s = ok(s, { type: A.DEBUG_NEXT, payload: { mission: 'chest' } });
  s = advance(advance(s)); // Colazione -> regole -> gioco
  assert.equal(s.phaseData.timer.ms, MISSIONS.chest.chooseMs * 2);
  // Fino alla Tavola Rotonda
  while (s.phase === 'mission') s = advance(s);
  assert.equal(s.phase, 'roundtable');
  assert.equal(s.phaseData.timer.ms, 60000); // la discussione non cambia
  assert.equal(GAME.missionTimeScale, 1);
});
