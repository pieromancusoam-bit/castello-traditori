// TEST OBBLIGATORIO E PERMANENTE: nessuna vista di un Leale contiene il ruolo di un altro
// giocatore. Si giocano molte partite casuali e si controlla ogni vista a ogni passo.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { viewFor, viewForMaster } from '../js/engine/view.js';
import { PHASE } from '../js/engine/state.js';
import { ROLE } from '../js/engine/roles.js';
import { createRng } from '../js/engine/rng.js';
import { playRandomGame, newGame, withRoles, seeRoles, advance, ok } from './helpers.js';
import { A } from '../js/engine/actions.js';

// Giocatori la cui fazione è pubblica (banditi, rivelati nella Cerimonia, partita finita)
function revealedIds(s) {
  if (s.phase === PHASE.ENDED) return new Set(s.order);
  const r = new Set(s.order.filter((id) => s.players[id].status === 'banished'));
  if (s.phase === PHASE.FINAL && s.phaseData.stage === 'unveil') s.phaseData.revealed.forEach((id) => r.add(id));
  return r;
}

// Scorre tutto l'oggetto: nessun oggetto che parla di un giocatore "nascosto" ne porta ruolo o fazione
function assertNoHiddenRoles(view, hidden, label) {
  const walk = (o) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== 'object') return;
    if (typeof o.id === 'string' && hidden.has(o.id)) {
      assert.ok(!('role' in o), `${label}: ruolo di ${o.id} presente`);
      assert.ok(o.faction === undefined || o.faction === null, `${label}: fazione di ${o.id} presente`);
    }
    Object.values(o).forEach(walk);
  };
  walk(view);
}

// Stesso stato ma con i ruoli dei giocatori nascosti rimescolati tra loro
function permuteHiddenRoles(s, hidden, rng) {
  const list = [...hidden];
  const roles = rng.shuffle(list.map((id) => s.players[id].role));
  const copy = structuredClone(s);
  list.forEach((id, i) => { copy.players[id].role = roles[i]; });
  return copy;
}

const SEEDS = 150;

test('OBBLIGATORIO: nessuna vista di un Leale contiene il ruolo di un altro giocatore', () => {
  let checked = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const rng = createRng(seed + 1000);
    playRandomGame({
      players: 5 + (seed % 12),
      seed,
      onState: (s) => {
        const revealed = revealedIds(s);
        for (const pid of s.order) {
          if (s.players[pid].role !== ROLE.FAITHFUL) continue;
          const hidden = new Set(s.order.filter((id) => id !== pid && !revealed.has(id)));
          const view = viewFor(s, pid);
          const label = `seed ${seed}, fase ${s.phase}, Leale ${pid}`;

          // 1. Nessun ruolo o fazione nascosti, nessun complice
          assertNoHiddenRoles(view, hidden, label);
          assert.equal(view.allies, null, `${label}: complici presenti`);

          // 2. Nessuna chat dei Traditori, nessun voto individuale
          const json = JSON.stringify(view);
          assert.ok(!json.includes('messaggio segreto'), `${label}: chat dei Traditori presente`);
          assert.ok(!json.includes('"votes"'), `${label}: voti individuali presenti`);

          // 3. Non interferenza: rimescolando i ruoli nascosti la vista non cambia di una virgola
          if (hidden.size > 1) {
            const other = permuteHiddenRoles(s, hidden, rng);
            assert.deepEqual(viewFor(other, pid), view, `${label}: la vista dipende dai ruoli nascosti`);
          }
          checked++;
        }
      },
    });
  }
  assert.ok(checked > 10000, `controllate solo ${checked} viste`);
});

test('lo schermo del master non contiene ruoli nascosti e non dipende da essi', () => {
  for (let seed = 1; seed <= 80; seed++) {
    const rng = createRng(seed + 5000);
    playRandomGame({
      players: 5 + (seed % 12),
      seed,
      onState: (s) => {
        const revealed = revealedIds(s);
        const hidden = new Set(s.order.filter((id) => !revealed.has(id)));
        const view = viewForMaster(s);
        const label = `seed ${seed}, fase ${s.phase}`;
        assertNoHiddenRoles(view, hidden, label);
        const json = JSON.stringify(view);
        assert.ok(!json.includes('"role"'), `${label}: campo role sullo schermo`);
        assert.ok(!json.includes('messaggio segreto'), `${label}: chat sullo schermo`);
        if (s.phaseData.stage === 'voting') assert.ok(!json.includes('"voterId"'), `${label}: voti prima della chiusura`);
        if (hidden.size > 1) assert.deepEqual(viewForMaster(permuteHiddenRoles(s, hidden, rng)), view, `${label}: dipende dai ruoli`);
      },
    });
  }
});

test('i Traditori vedono i complici; di notte chat e scelte dei complici', () => {
  let s = advance(seeRoles(withRoles(newGame(8), ['p1', 'p2'])));
  s = advance(advance(s)); // nessun voto -> notte
  s = ok(s, { type: A.NIGHT_CHAT, playerId: 'p1', payload: { text: 'messaggio segreto' } });
  s = ok(s, { type: A.NIGHT_CHOOSE, playerId: 'p2', payload: { targetId: 'p5' } });
  const v = viewFor(s, 'p1');
  assert.deepEqual(v.allies.map((a) => a.id), ['p2']);
  assert.equal(v.step.chat[0].text, 'messaggio segreto');
  assert.deepEqual(v.step.allyPicks, [{ id: 'p1', targetId: null }, { id: 'p2', targetId: 'p5' }]);
  assert.ok(!v.step.options.includes('p2'), 'un complice non è un bersaglio');
  const leale = viewFor(s, 'p5');
  assert.equal(leale.step.chat, null);
  assert.equal(leale.step.allyPicks, null);
});

test('di notte un Leale vede la stessa forma di schermata di un Traditore', () => {
  let s = advance(seeRoles(withRoles(newGame(8), ['p1', 'p2'])));
  s = advance(advance(s));
  const keysOf = (v) => Object.keys(v.step).sort();
  assert.deepEqual(keysOf(viewFor(s, 'p5')), keysOf(viewFor(s, 'p1')));
});

test('vista di un giocatore sconosciuto: null', () => {
  assert.equal(viewFor(newGame(5), 'nessuno'), null);
});
