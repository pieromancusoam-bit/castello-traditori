// Fase 3: impostazioni della partita, ruoli speciali e fazioni.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, resolveSettings, upgradeGame } from '../js/engine/state.js';
import { ROLE, FACTION, factionOf, assignRoles, winnerOf } from '../js/engine/roles.js';
import { createRng } from '../js/engine/rng.js';
import { GAME } from '../js/config/game-config.js';
import { makePlayers } from './helpers.js';

test('impostazioni: senza scelte valgono i valori di js/config/', () => {
  const s = resolveSettings(8);
  assert.equal(s.traitorCount, 2);
  assert.equal(s.finalThreshold, 4);
  assert.equal(s.missionsPerDay, GAME.missionsPerDay);
  assert.equal(s.presentationMs, GAME.presentationMs);
  assert.equal(s.discussionMs, null);
  assert.equal(s.seduction, false);
  assert.deepEqual(s.roles, { seer: true, knight: true, secretTraitor: false });
  assert.deepEqual(s.events, { fog: true, doubleStakes: true, banquet: true, daylightMurder: true });
  assert.equal(s.ultimatum, true);
});

test('impostazioni: ruoli speciali automatici secondo i giocatori', () => {
  assert.deepEqual(resolveSettings(6).roles, { seer: false, knight: false, secretTraitor: false });
  assert.deepEqual(resolveSettings(14).roles, { seer: true, knight: true, secretTraitor: true });
  // Il Traditore Segreto serve almeno 2 Traditori anche se acceso a mano
  assert.equal(resolveSettings(6, { roles: { secretTraitor: true } }).roles.secretTraitor, false);
  assert.equal(resolveSettings(8, { roles: { secretTraitor: true } }).roles.secretTraitor, true);
  assert.equal(resolveSettings(16, { roles: { secretTraitor: false } }).roles.secretTraitor, false);
});

test('impostazioni: scelte a mano', () => {
  const s = resolveSettings(10, { traitorCount: 2, finalThreshold: 3, missionsPerDay: 2, seduction: true, discussionMs: 60000, events: { fog: false } });
  assert.equal(s.traitorCount, 2);
  assert.equal(s.finalThreshold, 3);
  assert.equal(s.missionsPerDay, 2);
  assert.equal(s.seduction, true);
  assert.equal(s.discussionMs, 60000);
  assert.equal(s.events.fog, false);
  assert.equal(s.events.banquet, true);
});

test('ruoli: Traditore Segreto, Veggente e Cavaliere assegnati una volta sola', () => {
  const ids = makePlayers(14).map((p) => p.id);
  for (let seed = 1; seed < 50; seed++) {
    const roles = assignRoles(ids, 3, createRng(seed), { secretTraitor: true, seer: true, knight: true });
    const count = (r) => ids.filter((id) => roles[id] === r).length;
    assert.equal(count(ROLE.TRAITOR), 2);
    assert.equal(count(ROLE.SECRET_TRAITOR), 1);
    assert.equal(count(ROLE.SEER), 1);
    assert.equal(count(ROLE.KNIGHT), 1);
    assert.equal(count(ROLE.FAITHFUL), 9);
  }
});

test('ruoli: senza ruoli speciali gli stessi Traditori di prima (stesso seed)', () => {
  const ids = makePlayers(10).map((p) => p.id);
  const plain = assignRoles(ids, 3, createRng(7));
  const special = assignRoles(ids, 3, createRng(7), { seer: true, knight: true });
  for (const id of ids) assert.equal(plain[id] === ROLE.TRAITOR, special[id] === ROLE.TRAITOR);
});

test('fazioni: il Traditore Segreto gioca con i Traditori, Veggente e Cavaliere con i Leali', () => {
  assert.equal(factionOf(ROLE.SECRET_TRAITOR), FACTION.TRAITORS);
  assert.equal(factionOf(ROLE.SEER), FACTION.FAITHFULS);
  assert.equal(factionOf(ROLE.KNIGHT), FACTION.FAITHFULS);
  const s = createGame({ players: makePlayers(5), seed: 1 });
  for (const id of s.order) s.players[id].role = ROLE.FAITHFUL;
  s.players.p2.role = ROLE.SECRET_TRAITOR;
  assert.equal(winnerOf(s), FACTION.TRAITORS);
});

test('il Cavaliere parte con uno Scudo; gli altri con l\'inventario vuoto', () => {
  const s = createGame({ players: makePlayers(9), seed: 3 });
  for (const id of s.order) {
    const p = s.players[id];
    assert.deepEqual(p.items, p.role === ROLE.KNIGHT ? ['shield'] : []);
  }
  assert.ok(s.order.some((id) => s.players[id].role === ROLE.KNIGHT));
});

test('partita salvata con la versione precedente: novità della Fase 3 spente', () => {
  const old = createGame({ players: makePlayers(8), seed: 2 });
  delete old.settings.roles;
  delete old.settings.events;
  delete old.curses;
  for (const id of old.order) delete old.players[id].items;
  const g = upgradeGame(old);
  assert.deepEqual(g.settings.roles, { seer: false, knight: false, secretTraitor: false });
  assert.equal(g.settings.events.fog, false);
  assert.deepEqual(g.curses, []);
  assert.deepEqual(g.players.p1.items, []);
});
