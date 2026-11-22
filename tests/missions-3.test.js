// Fase 3: Il Codice della Cripta, Il Ponte, L'Asta, La Lettera Sigillata.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { A } from '../js/engine/actions.js';
import { REJECT } from '../js/engine/reducer.js';
import { viewFor, viewForMaster } from '../js/engine/view.js';
import { newGame, withRoles, seeRoles, advance, ok, rejected } from './helpers.js';

// Partita con un solo gioco al giorno, forzato; si arriva al momento del gioco
function play(mission, { n = 6, traitors = ['p1'], pot = 0 } = {}) {
  let s = seeRoles(withRoles(newGame(n, 1, { missions: true, missionsPerDay: 1 }), traitors));
  s.pot = pot;
  s = ok(s, { type: A.DEBUG_NEXT, payload: { mission } });
  s = advance(advance(s)); // regole -> gioco
  assert.equal(s.phaseData.id, mission);
  assert.equal(s.phaseData.stage, 'play');
  return s;
}
const input = (s, playerId, payload) => ok(s, { type: A.MISSION_INPUT, playerId, payload });

// ---- Il Codice della Cripta ----

test('Cripta: ognuno ha un frammento; i Traditori lo hanno falso e lo sanno', () => {
  const s = play('crypt', { n: 8, traitors: ['p1', 'p2'] });
  const d = s.phaseData.data;
  for (const id of s.order) {
    const m = viewFor(s, id).step.mission;
    const frag = d.fragments[d.slotOf[id]];
    const traitor = ['p1', 'p2'].includes(id);
    assert.equal(m.fake, traitor);
    assert.equal(m.fragment, traitor ? frag.lie : frag.truth);
    assert.notEqual(frag.lie, frag.truth);
  }
  // Lo schermo non vede né frammenti né codice
  const json = JSON.stringify(viewForMaster(s));
  assert.ok(!json.includes(d.secretCode) || d.secretCode.length < 4);
  assert.ok(!json.includes('fragment'));
});

test('Cripta: i frammenti veri bastano a ricostruire il codice (con 4 giocatori o più)', () => {
  for (let seed = 1; seed <= 40; seed++) {
    let s = seeRoles(withRoles(newGame(8, seed, { missions: true, missionsPerDay: 1 }), ['p1']));
    s = ok(s, { type: A.DEBUG_NEXT, payload: { mission: 'crypt' } });
    s = advance(advance(s));
    const d = s.phaseData.data;
    // Le prime 4 versioni vere dicono ogni cifra
    const direct = d.fragments.slice(0, 4).map((f) => f.truth);
    for (let i = 0; i < 4; i++) assert.ok(direct[i].endsWith(`${d.secretCode[i]}.`));
  }
});

test('Cripta: vale il codice della maggioranza; monete per cifra giusta; tracce con i codici scritti', () => {
  let s = play('crypt', { n: 6 });
  const code = s.phaseData.data.secretCode;
  const wrong2 = `${code.slice(0, 2)}${(Number(code[2]) + 1) % 10}${(Number(code[3]) + 1) % 10}`;
  assert.equal(rejected(s, { type: A.MISSION_INPUT, playerId: 'p2', payload: { code: '12a4' } }), REJECT.INVALID_PAYLOAD);
  for (const id of ['p1', 'p2', 'p3']) s = input(s, id, { code: wrong2 });
  for (const id of ['p4', 'p5']) s = input(s, id, { code });
  s = advance(s); // p6 non scrive
  const r = s.phaseData.result;
  assert.equal(r.detail.groupAnswer, wrong2);
  assert.equal(r.detail.correct, 2);
  assert.equal(r.coins, 500);
  assert.equal(r.detail.typed.find((x) => x.id === 'p6').value, null);
});

// ---- Il Ponte ----

test('Ponte: entrambi si fidano -> monete; scelte segrete fino alla fine', () => {
  let s = play('bridge');
  const [a, b] = s.phaseData.data.pair;
  const other = s.order.find((id) => id !== a && id !== b);
  assert.equal(rejected(s, { type: A.MISSION_INPUT, playerId: other, payload: { choice: 'trust' } }), REJECT.NOT_ALLOWED);
  s = input(s, a, { choice: 'trust' });
  assert.ok(!JSON.stringify(viewFor(s, b)).includes('"trust"'));
  assert.ok(!JSON.stringify(viewForMaster(s)).includes('"trust"'));
  s = input(s, b, { choice: 'trust' });
  assert.equal(s.phaseData.result.coins, 1000);
  assert.deepEqual(s.phaseData.result.detail.pair, [{ id: a, trust: true }, { id: b, trust: true }]);
});

test('Ponte: chi tradisce da solo prende un oggetto (che resta segreto)', () => {
  let s = play('bridge');
  const [a, b] = s.phaseData.data.pair;
  s = input(s, a, { choice: 'betray' });
  s = input(s, b, { choice: 'trust' });
  const r = viewForMaster(s).step.result;
  assert.equal(r.coins, 0);
  assert.equal(r.detail.betrayerId, a);
  assert.equal(s.players[a].items.length, 1);
  assert.equal(viewFor(s, a).step.myGift, s.players[a].items[0]);
  assert.equal(viewFor(s, b).step.myGift, null);
  assert.ok(!JSON.stringify(viewForMaster(s)).includes(s.players[a].items[0]));
});

test('Ponte: entrambi tradiscono -> niente per nessuno', () => {
  let s = play('bridge');
  const [a, b] = s.phaseData.data.pair;
  s = input(s, a, { choice: 'betray' });
  s = input(s, b, { choice: 'betray' });
  assert.equal(s.phaseData.result.coins, 0);
  assert.equal(s.phaseData.gift, undefined);
});

// ---- L'Asta ----

test('Asta: vince l\'offerta più alta, il montepremi scende del prezzo, il vincitore resta segreto', () => {
  let s = play('auction', { pot: 3000 });
  assert.equal(rejected(s, { type: A.MISSION_INPUT, playerId: 'p1', payload: { bid: 3001 } }), REJECT.INVALID_PAYLOAD);
  const bids = { p1: 100, p2: 800, p3: 0, p4: 300, p5: 50, p6: 0 };
  for (const [id, bid] of Object.entries(bids)) s = input(s, id, { bid });
  assert.equal(s.pot, 2200);
  assert.deepEqual(s.players.p2.items, ['shield']);
  const r = viewForMaster(s).step.result;
  assert.deepEqual(r.detail, { price: 800, sold: true });
  // Il vincitore non compare sullo schermo: lo schermo è identico se avesse vinto p4
  let t = play('auction', { pot: 3000 });
  for (const [id, bid] of Object.entries({ ...bids, p2: 300, p4: 800 })) t = input(t, id, { bid });
  assert.deepEqual(viewForMaster(t), viewForMaster(s));
  assert.equal(viewFor(s, 'p2').step.myGift, 'shield');
  assert.equal(viewFor(s, 'p4').step.myGift, null);
  // Le offerte altrui non arrivano ai telefoni
  assert.equal(viewFor(s, 'p4').step.mission.myBid, 300);
  assert.ok(!JSON.stringify(viewFor(s, 'p4')).includes('"bids"'));
});

test('Asta: nessuna offerta -> niente venduto; con il montepremi vuoto si offre solo zero', () => {
  let s = play('auction', { pot: 0 });
  assert.equal(rejected(s, { type: A.MISSION_INPUT, playerId: 'p1', payload: { bid: 1 } }), REJECT.INVALID_PAYLOAD);
  s = advance(s);
  assert.deepEqual(s.phaseData.result.detail, { price: 0, sold: false });
  assert.equal(s.pot, 0);
});

// ---- La Lettera Sigillata ----

test('Lettera: chi rinuncia fa guadagnare il gruppo', () => {
  let s = play('letter', { pot: 1000 });
  const k = s.phaseData.data.keeperId;
  const other = s.order.find((id) => id !== k);
  assert.equal(rejected(s, { type: A.MISSION_INPUT, playerId: other, payload: { open: true } }), REJECT.NOT_ALLOWED);
  s = input(s, k, { open: false });
  assert.equal(s.pot, 2000);
  assert.deepEqual(s.phaseData.result.detail, { keeperId: k, opened: false });
  assert.deepEqual(s.players[k].items, []);
});

test('Lettera: chi apre prende un oggetto segreto e il gruppo perde metà del valore', () => {
  let s = play('letter', { pot: 1000 });
  const k = s.phaseData.data.keeperId;
  s = input(s, k, { open: true });
  assert.equal(s.pot, 500);
  assert.equal(s.players[k].items.length, 1);
  assert.equal(viewForMaster(s).step.result.detail.opened, true);
  assert.equal(viewFor(s, k).step.myGift, s.players[k].items[0]);
});

test('Lettera: senza scelta si rinuncia; Doppia posta passa al gioco dopo', () => {
  let s = play('letter');
  s = advance(s);
  assert.equal(s.phaseData.result.detail.opened, false);
  assert.equal(s.phaseData.double, false);
});
