// Missioni aggiunte nella Fase 2b: La Stima, La Catena della Memoria, La Cronologia, Il Messaggero.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REJECT } from '../js/engine/reducer.js';
import { A } from '../js/engine/actions.js';
import { viewFor, viewForMaster } from '../js/engine/view.js';
import { MISSIONS, CHRONOLOGY_EVENTS, MESSENGER_SCENES } from '../js/config/missions.js';
import { GAME } from '../js/config/game-config.js';
import { newGame, withRoles, ok, rejected, advance, seeRoles } from './helpers.js';

const V = GAME.missionBaseValue;
const input = (s, playerId, payload) => ok(s, { type: A.MISSION_INPUT, playerId, payload });
const expire = (s) => ok(s, { type: A.TIMER_EXPIRED, payload: { key: s.phaseData.timer.key } });
function playing(n, id) {
  const s = seeRoles(withRoles(newGame(n, 1, { missions: true, missionsPerDay: 1 }), ['p1']));
  s.missionBag = [id];
  return advance(advance(s));
}

test('Stima: immagine solo sullo schermo, poi stime; vince la media entro il 10%', () => {
  let s = playing(5, 'estimate');
  const { count } = s.phaseData.data;
  assert.ok(count >= MISSIONS.estimate.min && count <= MISSIONS.estimate.max);
  assert.equal(viewForMaster(s).step.mission.picture.count, count);
  assert.ok(!JSON.stringify(viewFor(s, 'p2')).includes('"count"'), 'il numero non arriva ai telefoni');
  assert.equal(rejected(s, { type: A.MISSION_INPUT, playerId: 'p2', payload: { value: 10 } }), REJECT.WRONG_PHASE);
  s = expire(s);
  assert.equal(viewForMaster(s).step.mission.picture, null, 'finito il tempo il disegno sparisce');
  assert.equal(rejected(s, { type: A.MISSION_INPUT, playerId: 'p2', payload: { value: 1.5 } }), REJECT.INVALID_PAYLOAD);
  const near = Math.round(count * 1.05);
  for (const id of ['p1', 'p2', 'p3', 'p4']) s = input(s, id, { value: near });
  s = input(s, 'p5', { value: near });
  assert.equal(s.phaseData.stage, 'result');
  assert.equal(s.phaseData.result.coins, V);
  assert.deepEqual(s.phaseData.result.detail.estimates[1], { id: 'p2', value: near });

  let t = expire(playing(5, 'estimate'));
  for (const id of ['p1', 'p2', 'p3', 'p4', 'p5']) t = input(t, id, { value: count * 3 });
  assert.equal(t.phaseData.result.coins, 0, 'stime esagerate: niente monete');
});

test('Catena della Memoria: catena solo sullo schermo; monete per le parti giuste; si vede chi sbaglia', () => {
  let s = playing(6, 'memory');
  const { chain, players } = s.phaseData.data;
  assert.equal(viewForMaster(s).step.mission.chain.length, 6);
  assert.ok(!JSON.stringify(viewFor(s, 'p2')).includes('"chain"'));
  assert.equal(viewFor(s, 'p2').step.mission.canPick, false);
  s = expire(s);
  assert.equal(viewForMaster(s).step.mission.chain, null);
  players.forEach((id, i) => { s = input(s, id, { symbol: i < 3 ? chain[id] : (chain[id] + 1) % 6 }); });
  assert.equal(s.phaseData.result.detail.correct, 3);
  assert.equal(s.phaseData.result.coins, V / 2);
  const wrong = s.phaseData.result.detail.rows.filter((r) => r.chosen !== r.symbol).map((r) => r.id);
  assert.deepEqual(wrong, players.slice(3));
});

test('Cronologia: ognuno vede solo il proprio evento, senza anno; alla fine la fila giusta', () => {
  let s = playing(5, 'chronology');
  const d = s.phaseData.data;
  const v = viewFor(s, 'p2').step.mission;
  assert.equal(v.event, CHRONOLOGY_EVENTS[d.events.p2].text);
  assert.ok(!JSON.stringify(viewFor(s, 'p2')).includes(String(CHRONOLOGY_EVENTS[d.events.p2].year)));
  assert.ok(!JSON.stringify(viewForMaster(s)).includes(CHRONOLOGY_EVENTS[d.events.p2].text));
  const sorted = [...d.players].sort((a, b) => CHRONOLOGY_EVENTS[d.events[a]].year - CHRONOLOGY_EVENTS[d.events[b]].year);
  // Tutti giusti tranne gli ultimi due, scambiati
  sorted.forEach((id, i) => {
    const pos = i === 3 ? 5 : i === 4 ? 4 : i + 1;
    s = input(s, id, { position: pos });
  });
  assert.equal(s.phaseData.result.detail.correct, 3);
  assert.equal(s.phaseData.result.coins, Math.round((V * 3) / 5));
  const rows = s.phaseData.result.detail.rows;
  assert.deepEqual(rows.map((r) => r.id), sorted);
  assert.ok(rows.every((r, i) => i === 0 || r.year > rows[i - 1].year));
  assert.equal(rejected(playing(5, 'chronology'), { type: A.MISSION_INPUT, playerId: 'p2', payload: { position: 6 } }), REJECT.INVALID_PAYLOAD);
});

test('Messaggero: scena e parole proibite solo al messaggero; vince la maggioranza giusta', () => {
  let s = playing(6, 'messenger');
  const d = s.phaseData.data;
  const scene = MESSENGER_SCENES[d.options[d.correct]];
  const mv = viewFor(s, d.messengerId).step.mission;
  assert.equal(mv.isMessenger, true);
  assert.deepEqual(mv.scene, { title: scene.title, banned: scene.banned });
  assert.equal(mv.canChoose, false);
  const other = d.guessers[0];
  assert.equal(viewFor(s, other).step.mission.scene, null);
  assert.ok(!JSON.stringify(viewFor(s, other)).includes('"correct'));
  assert.ok(!JSON.stringify(viewForMaster(s)).includes('"correct'));
  assert.equal(rejected(s, { type: A.MISSION_INPUT, playerId: d.messengerId, payload: { choice: 0 } }), REJECT.NOT_ALLOWED);
  d.guessers.forEach((id, i) => { s = input(s, id, { choice: i < 3 ? d.correct : (d.correct + 1) % 6 }); });
  assert.equal(s.phaseData.result.success, true, '3 giusti su 5');
  assert.equal(s.phaseData.result.detail.messengerId, d.messengerId);
  assert.equal(s.phaseData.result.detail.guessList.length, 5);
});
