// Spettacolo: regista (segnali da due schermate del master) e narratore (frasi).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { viewForMaster } from '../js/engine/view.js';
import { createRng } from '../js/engine/rng.js';
import { cuesFor, sceneKey, voteTimes, LOBBY_VIEW } from '../js/show/director.js';
import { lineFor, emptyMemory, fill } from '../js/show/narrator.js';
import { NARRATOR_LINES } from '../js/config/narrator-lines.js';
import { SHOW } from '../js/config/show-config.js';
import { playRandomGame } from './helpers.js';

// Momenti "di passaggio": leggono un testo già pronto (regole del gioco, scena)
const PASS_THROUGH = new Set(['mission.rules', 'scene.read']);

test('ogni momento ha 4–5 frasi, la versione "prima volta" e solo variabili note', () => {
  const known = new Set(['name', 'names', 'coins', 'title', 'slot', 'perDay', 'theme', 'text', 'rules', 'scene', 'share']);
  for (const [moment, def] of Object.entries(NARRATOR_LINES)) {
    if (!PASS_THROUGH.has(moment)) {
      assert.ok(def.lines.length >= 4 && def.lines.length <= 5, `${moment}: ${def.lines.length} frasi`);
      assert.equal(new Set(def.lines).size, def.lines.length, `${moment}: frasi doppie`);
    }
    for (const line of [...def.lines, ...(def.first || [])]) {
      for (const [, v] of line.matchAll(/\{(\w+)\}/g)) assert.ok(known.has(v), `${moment}: variabile {${v}} sconosciuta`);
    }
  }
});

test('ogni momento usato dal regista esiste tra le frasi', () => {
  const src = readFileSync(new URL('../js/show/director.js', import.meta.url), 'utf8');
  const used = new Set([...src.matchAll(/say\(\s*'([\w.]+)'/g)].map((m) => m[1]));
  // Momenti scelti con l'operatore ternario: say(x ? 'a' : 'b')
  for (const m of src.matchAll(/say\([^;]*?\?\s*'([\w.]+)'\s*:\s*'([\w.]+)'/g)) { used.add(m[1]); used.add(m[2]); }
  for (const m of src.matchAll(/'((?:reveal|unveil|end|votes|mission|dusk)\.[\w.]+)'/g)) used.add(m[1]);
  assert.ok(used.size > 40, `solo ${used.size} momenti trovati`);
  for (const m of used) assert.ok(NARRATOR_LINES[m], `manca il momento ${m}`);
});

test('il narratore non ripete la stessa frase due volte di fila e spiega la regola solo la prima volta', () => {
  const rng = createRng(3);
  let mem = emptyMemory();
  let last = null;
  for (let i = 0; i < 200; i++) {
    const r = lineFor({ type: 'say', moment: 'votes.banish', vars: { name: 'Anna' } }, mem, () => rng.next());
    assert.notEqual(r.text, last);
    assert.ok(r.text.includes('Anna'));
    last = r.text;
    mem = r.memory;
  }
  // Prima volta: spiegazione; poi le frasi brevi
  const cue = { type: 'say', moment: 'night', vars: {} };
  const a = lineFor(cue, emptyMemory(), () => 0);
  assert.equal(a.text, NARRATOR_LINES.night.first[0]);
  const b = lineFor(cue, a.memory, () => 0);
  assert.ok(NARRATOR_LINES.night.lines.includes(b.text));
  // once: le regole di un gioco si leggono una volta sola
  const rules = { type: 'say', moment: 'mission.rules', vars: { rules: 'Regole.' }, once: 'rules:chest' };
  const r1 = lineFor(rules, emptyMemory(), () => 0);
  assert.equal(r1.text, 'Regole.');
  assert.equal(lineFor(rules, r1.memory, () => 0).text, null);
  assert.equal(fill('Ciao {name}{x}', { name: 'Bea' }), 'Ciao Bea');
});

test('la chiave della scena non cambia con i conteggi', () => {
  const v = { phase: 'roundtable', day: 2, step: { stage: 'voting', round: 1, votedCount: 1, voterCount: 6 } };
  assert.equal(sceneKey(v), sceneKey({ ...v, step: { ...v.step, votedCount: 4 } }));
  assert.notEqual(sceneKey(v), sceneKey({ ...v, step: { ...v.step, stage: 'results' } }));
});

test('i voti si rivelano uno alla volta, poi l\'esito', () => {
  const t = voteTimes(3);
  assert.equal(t.at(0), SHOW.votes.firstMs);
  assert.equal(t.at(2), SHOW.votes.firstMs + 2 * SHOW.votes.stepMs);
  assert.equal(t.outcome, t.at(2) + SHOW.votes.outcomeMs);
});

test('partite casuali: ogni frase è completa e si dice solo ciò che è sullo schermo', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 60; seed++) {
    const rng = createRng(seed + 77);
    let mem = emptyMemory();
    let prev = LOBBY_VIEW;
    playRandomGame({
      players: 5 + (seed % 12),
      seed,
      onState: (s) => {
        const next = viewForMaster(s);
        const cues = cuesFor(prev, next);
        for (const c of cues) {
          assert.ok(['music', 'sound', 'say'].includes(c.type), `segnale sconosciuto ${c.type}`);
          if (c.type !== 'say') continue;
          seen.add(c.moment);
          assert.ok(Number.isFinite(c.at) && c.at >= 0);
          const r = lineFor(c, mem, () => rng.next());
          mem = r.memory;
          if (r.text === null) continue;
          assert.ok(!/[{}]/.test(r.text), `${c.moment}: variabile non sostituita in "${r.text}"`);
          assert.ok(!r.text.includes('undefined') && !r.text.includes('null'), `${c.moment}: "${r.text}"`);
          // Variabili testuali e nomi di giocatori presenti sullo schermo (mai "?")
          for (const v of Object.values(c.vars)) {
            assert.equal(typeof v, 'string', `${c.moment}: variabile non testuale`);
            assert.ok(v !== '?' && !v.includes('?,') && !v.startsWith('? '), `${c.moment}: giocatore sconosciuto`);
          }
        }
        // Stessa schermata = nessun segnale nuovo (niente frasi ripetute a ogni conteggio)
        assert.deepEqual(cuesFor(next, structuredClone(next)), []);
        prev = next;
      },
    });
  }
  // Le partite casuali attraversano quasi tutti i momenti
  for (const m of ['roles', 'breakfast.first', 'breakfast.victim', 'mission.intro', 'mission.rules', 'roundtable.voting',
    'votes.banish', 'reveal.traitor', 'reveal.faithful', 'night', 'final.choice', 'final.unveil', 'end.traitors', 'end.faithfuls', 'event']) {
    assert.ok(seen.has(m), `momento mai raggiunto: ${m}`);
  }
});

// ---------------- Vibrazioni dei telefoni ----------------
import { viewFor } from '../js/engine/view.js';
import { phoneBuzz } from '../js/show/phone-cues.js';

test('OBBLIGATORIO: ogni telefono vibra negli stessi momenti, qualunque sia il ruolo', () => {
  let buzzes = 0;
  for (let seed = 1; seed <= 60; seed++) {
    let prev = null;
    playRandomGame({
      players: 5 + (seed % 12),
      seed,
      onState: (s) => {
        if (prev) {
          const kinds = s.order.map((id) => phoneBuzz(viewFor(prev, id), viewFor(s, id)));
          assert.ok(kinds.every((k) => k === kinds[0]), `seed ${seed}, fase ${s.phase}: vibrazioni diverse ${JSON.stringify(kinds)}`);
          if (kinds[0]) buzzes++;
        }
        prev = s;
      },
    });
  }
  assert.ok(buzzes > 500, `solo ${buzzes} vibrazioni`);
});

// ---------------- Numeri detti a voce ----------------
import { numberToWords, spokenText } from '../js/show/spoken.js';

test('i numeri si leggono per esteso, anche con il punto delle migliaia', () => {
  const cases = { 0: 'zero', 1: 'uno', 21: 'ventuno', 23: 'ventitré', 28: 'ventotto', 100: 'cento', 108: 'centotto',
    180: 'centottanta', 250: 'duecentocinquanta', 1000: 'mille', 1250: 'milleduecentocinquanta', 2000: 'duemila',
    10500: 'diecimilacinquecento', 1000000: 'un milione', 2300000: 'due milioni trecentomila' };
  for (const [n, w] of Object.entries(cases)) assert.equal(numberToWords(Number(n)), w);
  assert.equal(spokenText('In palio ci sono 1.250 monete, gioco 2 di 3.'), 'In palio ci sono milleduecentocinquanta monete, gioco due di tre.');
  assert.equal(spokenText('Il montepremi è di 12.000 monete.'), 'Il montepremi è di dodicimila monete.');
});

// ---------------- Spiegazione delle regole ----------------
import { rulesSlides } from '../js/config/rules-intro.js';
import { resolveSettings } from '../js/engine/state.js';

test('le regole a inizio partita seguono le impostazioni e non dicono quanti sono i Traditori', () => {
  for (const n of [5, 8, 12, 16]) {
    const all = rulesSlides(resolveSettings(n, { roles: { seer: true, knight: true, secretTraitor: true } }));
    const text = JSON.stringify(all);
    assert.ok(all.some((s) => s.items && s.items.length === 5), 'manca la diapositiva degli oggetti');
    assert.ok(text.includes('Veggente'));
    if (n >= 8) assert.ok(text.includes('Traditore Segreto'));
    assert.ok(!/\b(un|uno|due|tre|quattro|\d+) Traditori?\b/i.test(text.replace(/un Traditore\./g, '')), `numero di Traditori nelle regole (${n})`);
    for (const s of all) assert.ok(s.title && s.lines.length && s.say.length > 20);
  }
  const bare = rulesSlides(resolveSettings(6, { missions: false, roles: { seer: false, knight: false, secretTraitor: false }, events: { fog: false, doubleStakes: false, banquet: false, daylightMurder: false } }));
  assert.ok(!JSON.stringify(bare).includes('Veggente'));
  assert.ok(!bare.some((s) => s.items), 'senza giochi niente oggetti');
});
