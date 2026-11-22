import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../js/net/roster.js';
import { ERR } from '../js/net/protocol.js';
import { NET } from '../js/config/net-config.js';

let n = 0;
const ids = (now = 1000) => { n++; return { newId: `p_${n}`, newToken: `tok_${n}_segreto`, now }; };

function joinOk(roster, name, now) {
  const r = R.join(roster, { name }, ids(now));
  assert.equal(r.error, undefined);
  return r;
}

test('un nuovo giocatore entra con nome e riceve id e token', () => {
  const r = joinOk(R.createRoster(), '  Anna  ');
  assert.equal(r.rejoined, false);
  assert.equal(r.roster.players[r.playerId].name, 'Anna');
  assert.equal(r.roster.players[r.playerId].connected, true);
  assert.deepEqual(r.roster.order, [r.playerId]);
});

test('senza nome l\'ingresso è rifiutato', () => {
  const r = R.join(R.createRoster(), { name: '   ' }, ids());
  assert.equal(r.error, ERR.NAME_REQUIRED);
});

test('nome già usato (maiuscole indifferenti) è rifiutato', () => {
  const a = joinOk(R.createRoster(), 'Marco');
  const b = R.join(a.roster, { name: 'marco' }, ids());
  assert.equal(b.error, ERR.NAME_TAKEN);
});

test('stanza piena oltre il massimo', () => {
  let roster = R.createRoster();
  for (let i = 0; i < NET.maxPlayers; i++) roster = joinOk(roster, `G${i}`).roster;
  assert.equal(R.join(roster, { name: 'Ultimo' }, ids()).error, ERR.ROOM_FULL);
});

test('rientro con token: stesso posto, stesso id, nessun doppione', () => {
  const a = joinOk(R.createRoster(), 'Luca', 1000);
  const off = R.markDisconnected(a.roster, a.playerId);
  const back = R.join(off, { token: a.token, name: 'Altro nome' }, ids(5000));
  assert.equal(back.rejoined, true);
  assert.equal(back.playerId, a.playerId);
  assert.equal(back.roster.order.length, 1);
  assert.equal(back.roster.players[a.playerId].name, 'Luca');
  assert.equal(back.roster.players[a.playerId].connected, true);
  assert.equal(back.roster.players[a.playerId].lastSeen, 5000);
});

test('token sconosciuto con nome: entra come nuovo giocatore', () => {
  const r = R.join(R.createRoster(), { token: 'inventato', name: 'Sara' }, ids());
  assert.equal(r.rejoined, false);
  assert.equal(r.roster.players[r.playerId].name, 'Sara');
});

test('stanza bloccata: niente nuovi ingressi, ma il rientro con token funziona', () => {
  const a = joinOk(R.createRoster(), 'Paolo');
  const locked = { ...a.roster, locked: true };
  assert.equal(R.join(locked, { name: 'Nuovo' }, ids()).error, ERR.GAME_STARTED);
  assert.equal(R.join(locked, { token: a.token }, ids()).rejoined, true);
});

test('sweep segna disconnessi solo i silenziosi oltre la soglia', () => {
  let roster = joinOk(R.createRoster(), 'A', 0).roster;
  const b = joinOk(roster, 'B', 0);
  roster = R.markSeen(b.roster, b.playerId, 14000);
  const { roster: after, dropped } = R.sweep(roster, 16000, 15000);
  assert.equal(dropped.length, 1);
  assert.equal(after.players[b.playerId].connected, true);
});

test('le funzioni non modificano il roster ricevuto', () => {
  const a = joinOk(R.createRoster(), 'Ivo');
  const frozen = structuredClone(a.roster);
  R.markDisconnected(a.roster, a.playerId);
  R.sweep(a.roster, 999999, 1);
  R.remove(a.roster, a.playerId);
  assert.deepEqual(a.roster, frozen);
});

test('elenco pubblico e vista del telefono non contengono token', () => {
  let roster = joinOk(R.createRoster(), 'Uno').roster;
  const due = joinOk(roster, 'Due');
  roster = due.roster;
  const tokens = Object.values(roster.players).map((p) => p.token);
  const pub = JSON.stringify(R.publicList(roster));
  const view = JSON.stringify(R.viewForPlayer(roster, '7K3Q', due.playerId));
  for (const t of tokens) {
    assert.ok(!pub.includes(t), 'token nell\'elenco pubblico');
    assert.ok(!view.includes(t), 'token nella vista del telefono');
  }
  assert.deepEqual(Object.keys(JSON.parse(view)).sort(), ['avatars', 'connectedCount', 'me', 'playersCount', 'roomCode']);
});

// ---------------- Stemmi (Fase 4) ----------------
import { AVATAR_IDS } from '../js/config/avatars.js';

test('ogni giocatore entra con uno stemma libero, diverso dagli altri', () => {
  let roster = R.createRoster();
  for (let i = 0; i < NET.maxPlayers; i++) roster = R.join(roster, { name: `G${i}` }, { ...ids(), rand: 0.99 }).roster;
  const avatars = roster.order.map((id) => roster.players[id].avatar);
  assert.equal(new Set(avatars).size, NET.maxPlayers, 'stemmi doppi');
  assert.ok(avatars.every((a) => AVATAR_IDS.includes(a)));
  assert.ok(AVATAR_IDS.length >= NET.maxPlayers, 'servono stemmi per tutti');
});

test('cambio di stemma: solo libero, valido e in sala d\'attesa', () => {
  const a = joinOk(R.createRoster(), 'Anna');
  const b = joinOk(a.roster, 'Bruno');
  const annaAv = b.roster.players[a.playerId].avatar;
  assert.equal(R.setAvatar(b.roster, b.playerId, annaAv).error, ERR.AVATAR_TAKEN);
  assert.equal(R.setAvatar(b.roster, b.playerId, 'drago-inventato').error, ERR.INVALID_AVATAR);
  const free = R.freeAvatars(b.roster)[0];
  const ok = R.setAvatar(b.roster, b.playerId, free);
  assert.equal(ok.error, undefined);
  assert.equal(ok.roster.players[b.playerId].avatar, free);
  // Rimettere il proprio stemma non è un errore
  assert.equal(R.setAvatar(ok.roster, b.playerId, free).error, undefined);
  assert.equal(R.setAvatar({ ...ok.roster, locked: true }, b.playerId, R.freeAvatars(ok.roster)[0]).error, ERR.GAME_STARTED);
});

test('la vista del telefono contiene gli stemmi di tutti, mai i token', () => {
  const a = joinOk(R.createRoster(), 'Anna');
  const b = joinOk(a.roster, 'Bruno');
  const v = R.viewForPlayer(b.roster, 'ABCD', a.playerId);
  assert.deepEqual(Object.keys(v.avatars).sort(), [a.playerId, b.playerId].sort());
  assert.equal(v.me.avatar, b.roster.players[a.playerId].avatar);
  assert.ok(!JSON.stringify(v).includes('segreto'));
});
