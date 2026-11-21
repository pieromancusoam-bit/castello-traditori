import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, REJECT, cleanChatText } from '../js/engine/reducer.js';
import { PHASE } from '../js/engine/state.js';
import { A, FINAL_CHOICES } from '../js/engine/actions.js';
import { ROLE } from '../js/engine/roles.js';
import { GAME } from '../js/config/game-config.js';
import {
  newGame, withRoles, ok, rejected, advance, alive, seeRoles, voteAll, deepFreeze, playRandomGame,
} from './helpers.js';

// Partita con ruoli fissati, già alla Tavola Rotonda del giorno 1
function atRoundtable(n, traitors) {
  return advance(seeRoles(withRoles(newGame(n), traitors)));
}
const choose = (s, playerId, targetId) => ok(s, { type: A.NIGHT_CHOOSE, playerId, payload: { targetId } });
const firstOther = (s, id, pool = alive(s)) => pool.find((x) => x !== id);

test('nuova partita: fase Ruoli, numero giusto di Traditori, tutti vivi', () => {
  for (const n of [5, 7, 10, 16]) {
    const s = newGame(n);
    assert.equal(s.phase, PHASE.ROLES);
    const traitors = s.order.filter((id) => s.players[id].role === ROLE.TRAITOR);
    assert.equal(traitors.length, s.settings.traitorCount);
    assert.ok(s.order.every((id) => s.players[id].status === 'alive'));
  }
  assert.throws(() => newGame(GAME.minPlayers - 1));
});

test('quando tutti hanno visto il ruolo si va alla prima Colazione, senza vittima', () => {
  const s = seeRoles(newGame(6));
  assert.equal(s.phase, PHASE.BREAKFAST);
  assert.equal(s.day, 1);
  assert.equal(s.phaseData.victimId, null);
  assert.equal(s.phaseData.firstDay, true);
});

test('azioni rifiutate: origine sbagliata, fase sbagliata, giocatore sconosciuto', () => {
  const s = newGame(5);
  assert.equal(rejected(s, { type: A.ADVANCE, playerId: 'p1' }), REJECT.NOT_ALLOWED);
  assert.equal(rejected(s, { type: A.ROLE_SEEN }), REJECT.NOT_ALLOWED);
  assert.equal(rejected(s, { type: A.ROLE_SEEN, playerId: 'zz' }), REJECT.NOT_ALLOWED);
  assert.equal(rejected(s, { type: 'BOH', playerId: 'p1' }), REJECT.UNKNOWN_ACTION);
  assert.equal(rejected(s, { type: A.VOTE, playerId: 'p1', payload: { targetId: 'p2' } }), REJECT.WRONG_PHASE);
});

test('il motore non modifica lo stato ricevuto', () => {
  const s = deepFreeze(newGame(5));
  const next = applyAction(s, { type: A.ROLE_SEEN, playerId: 'p1' });
  assert.notEqual(next.state, s);
  assert.equal(s.phaseData.seen.p1, undefined);
});

test('Tavola Rotonda: voto valido, doppio voto e voto per sé rifiutati', () => {
  let s = atRoundtable(6, ['p1']);
  assert.equal(s.phase, PHASE.ROUNDTABLE);
  assert.equal(rejected(s, { type: A.VOTE, playerId: 'p2', payload: { targetId: 'p2' } }), REJECT.INVALID_TARGET);
  s = ok(s, { type: A.VOTE, playerId: 'p2', payload: { targetId: 'p1' } });
  assert.equal(rejected(s, { type: A.VOTE, playerId: 'p2', payload: { targetId: 'p3' } }), REJECT.ALREADY_DONE);
  assert.equal(rejected(s, { type: A.VOTE, playerId: 'p3', payload: {} }), REJECT.INVALID_PAYLOAD);
});

test('tutti votano lo stesso: risultati, poi Rivelazione con fazione, poi Notte', () => {
  let s = atRoundtable(6, ['p1']);
  s = voteAll(s, (id) => (id === 'p1' ? 'p2' : 'p1'));
  assert.equal(s.phaseData.stage, 'results');
  assert.deepEqual(s.phaseData.outcome, { kind: 'banish', playerId: 'p1' });
  s = advance(s);
  assert.equal(s.phase, PHASE.REVEAL);
  assert.equal(s.phaseData.faction, 'traitors');
  assert.equal(s.players.p1.status, 'banished');
  assert.deepEqual(s.history.at(-1), { day: 1, type: 'banished', playerId: 'p1', faction: 'traitors' });
  s = advance(s);
  assert.equal(s.phase, PHASE.NIGHT);
});

test('"Avanti" chiude la votazione: chi non ha votato è astenuto', () => {
  let s = atRoundtable(6, ['p1']);
  s = ok(s, { type: A.VOTE, playerId: 'p2', payload: { targetId: 'p3' } });
  s = advance(s);
  assert.equal(s.phaseData.stage, 'results');
  assert.deepEqual(s.phaseData.outcome, { kind: 'banish', playerId: 'p3' });
});

test('parità: ballottaggio, e con nuova parità nessuno bandito', () => {
  let s = atRoundtable(6, ['p1']);
  // p4: 2 voti, p5: 2 voti, p6 e p1: 1 voto
  const tie = { p1: 'p4', p2: 'p4', p3: 'p5', p4: 'p5', p5: 'p6', p6: 'p1' };
  s = voteAll(s, (id) => tie[id]);
  assert.deepEqual(s.phaseData.outcome, { kind: 'runoff', candidates: ['p4', 'p5'] });
  s = advance(s);
  assert.equal(s.phaseData.stage, 'voting');
  assert.equal(s.phaseData.ballot.round, 2);
  assert.equal(rejected(s, { type: A.VOTE, playerId: 'p1', payload: { targetId: 'p6' } }), REJECT.INVALID_TARGET);
  // 3 a 3 tra p4 e p5
  const runoffTie = { p1: 'p4', p2: 'p4', p3: 'p5', p4: 'p5', p5: 'p4', p6: 'p5' };
  s = voteAll(s, (id) => runoffTie[id]);
  assert.deepEqual(s.phaseData.outcome, { kind: 'none', reason: 'tie' });
  s = advance(s);
  assert.equal(s.phase, PHASE.NIGHT);
  assert.equal(alive(s).length, 6);
  assert.equal(s.history.at(-1).type, 'no-banish');
});

// Partita da 7 con 2 Traditori (p1, p2) arrivata alla Notte senza banditi
function atNight7() {
  let s = atRoundtable(7, ['p1', 'p2']);
  s = advance(s); // nessun voto
  s = advance(s); // risultati -> notte
  assert.equal(s.phase, PHASE.NIGHT);
  return s;
}

test('Notte: i Traditori d\'accordo e i Leali che hanno scelto -> Colazione con la vittima', () => {
  let s = atNight7();
  assert.equal(s.phaseData.mode, 'murder');
  s = choose(s, 'p1', 'p3');
  s = choose(s, 'p2', 'p4'); // disaccordo
  for (const id of ['p3', 'p4', 'p5', 'p6', 'p7']) s = choose(s, id, firstOther(s, id));
  assert.equal(s.phase, PHASE.NIGHT, 'senza accordo la notte non finisce da sola');
  s = choose(s, 'p2', 'p3'); // accordo
  assert.equal(s.phase, PHASE.BREAKFAST);
  assert.equal(s.day, 2);
  assert.equal(s.phaseData.victimId, 'p3');
  assert.equal(s.players.p3.status, 'murdered');
  assert.deepEqual(s.history.at(-1), { day: 1, type: 'murdered', playerId: 'p3' }); // niente fazione
});

test('Notte: un Traditore non può scegliere un complice; la scelta di un Leale non uccide', () => {
  let s = atNight7();
  assert.equal(rejected(s, { type: A.NIGHT_CHOOSE, playerId: 'p1', payload: { targetId: 'p2' } }), REJECT.INVALID_TARGET);
  assert.equal(rejected(s, { type: A.NIGHT_CHOOSE, playerId: 'p3', payload: { targetId: 'p3' } }), REJECT.INVALID_TARGET);
  s = choose(s, 'p3', 'p4');
  s = advance(s); // nessun Traditore ha scelto
  assert.equal(s.phaseData.victimId, null);
  assert.equal(s.players.p4.status, 'alive');
  assert.equal(s.history.at(-1).type, 'no-murder');
});

test('Notte forzata con "Avanti": vince la vittima più indicata', () => {
  let s = atNight7();
  s = choose(s, 'p1', 'p5');
  s = advance(s);
  assert.equal(s.phaseData.victimId, 'p5');
});

test('Notte forzata con parità tra i Traditori: vittima estratta tra le indicate', () => {
  let s = atNight7();
  s = choose(s, 'p1', 'p5');
  s = choose(s, 'p2', 'p6');
  s = advance(s);
  assert.ok(['p5', 'p6'].includes(s.phaseData.victimId));
});

test('chat notturna: solo i Traditori vivi, testo ripulito', () => {
  let s = atNight7();
  assert.equal(rejected(s, { type: A.NIGHT_CHAT, playerId: 'p3', payload: { text: 'ciao' } }), REJECT.NOT_ALLOWED);
  assert.equal(rejected(s, { type: A.NIGHT_CHAT, playerId: 'p1', payload: { text: '   ' } }), REJECT.INVALID_PAYLOAD);
  s = ok(s, { type: A.NIGHT_CHAT, playerId: 'p1', payload: { text: '  prendiamo\n\n Marco ' } });
  assert.deepEqual(s.phaseData.chat, [{ from: 'p1', text: 'prendiamo Marco' }]);
  assert.equal(cleanChatText('x'.repeat(500)).length, GAME.chatMaxLength);
});

test('tutti i Traditori banditi con più di 4 vivi: il castello ne crea uno nuovo, niente omicidio', () => {
  let s = atRoundtable(7, ['p1']);
  s = voteAll(s, (id) => (id === 'p1' ? 'p2' : 'p1'));
  s = advance(advance(s)); // rivelazione -> notte
  assert.equal(s.phase, PHASE.NIGHT);
  assert.equal(s.phaseData.mode, 'castle');
  const newId = s.phaseData.newTraitorId;
  assert.notEqual(newId, 'p1');
  assert.equal(s.players[newId].role, ROLE.TRAITOR);
  assert.equal(s.players[newId].turnedOnDay, 1);
  assert.equal(rejected(s, { type: A.NIGHT_CHAT, playerId: newId, payload: { text: 'ciao' } }), REJECT.WRONG_PHASE);
  for (const id of alive(s)) s = choose(s, id, firstOther(s, id));
  assert.equal(s.phase, PHASE.BREAKFAST);
  assert.equal(s.phaseData.victimId, null);
  assert.equal(alive(s).length, 6);

  // La notte dopo il nuovo Traditore uccide
  s = advance(s); // tavola rotonda
  s = advance(advance(s)); // nessun voto -> notte
  assert.equal(s.phaseData.mode, 'murder');
  const victim = alive(s).find((id) => id !== newId);
  s = choose(s, newId, victim);
  s = advance(s);
  assert.equal(s.players[victim].status, 'murdered');
});

test('finale dopo la Rivelazione: con 5 giocatori, il primo bando porta a 4 e alla Cerimonia', () => {
  let s = atRoundtable(5, ['p1']);
  s = voteAll(s, (id) => (id === 'p2' ? 'p3' : 'p2'));
  s = advance(advance(s));
  assert.equal(s.phase, PHASE.FINAL);
  assert.equal(s.phaseData.stage, 'choice');
});

test('finale alla Colazione: l\'omicidio porta a 4 e dopo la Colazione parte la Cerimonia', () => {
  let s = atRoundtable(6, ['p1']);
  s = voteAll(s, (id) => (id === 'p2' ? 'p3' : 'p2'));
  s = advance(advance(s)); // p2 bandito, 5 vivi -> notte
  assert.equal(s.phase, PHASE.NIGHT);
  s = choose(s, 'p1', 'p3');
  s = advance(s);
  assert.equal(s.phase, PHASE.BREAKFAST);
  assert.equal(alive(s).length, 4);
  s = advance(s);
  assert.equal(s.phase, PHASE.FINAL);
});

// Partita da 5 (Traditore p1) arrivata alla Cerimonia con 4 vivi (p5 bandito)
function atCeremony() {
  let s = atRoundtable(5, ['p1']);
  s = voteAll(s, (id) => (id === 'p5' ? 'p4' : 'p5'));
  s = advance(advance(s));
  assert.equal(s.phase, PHASE.FINAL);
  return s;
}
const pick = (s, id, choice) => ok(s, { type: A.FINAL_CHOICE, playerId: id, payload: { choice } });

test('Cerimonia: tutti "Chiudere" -> rivelazioni una alla volta -> fine', () => {
  let s = atCeremony();
  for (const id of alive(s)) s = pick(s, id, FINAL_CHOICES.END);
  assert.equal(s.phaseData.stage, 'unveil');
  assert.deepEqual(s.phaseData.revealed, []);
  for (let i = 1; i <= 4; i++) {
    s = advance(s);
    assert.equal(s.phaseData.revealed.length, i);
  }
  s = advance(s);
  assert.equal(s.phase, PHASE.ENDED);
  assert.equal(s.winner, 'traitors'); // p1 è sopravvissuto
});

test('Cerimonia: chi non sceglie vale "Chiudere"', () => {
  let s = atCeremony();
  s = pick(s, 'p1', FINAL_CHOICES.END);
  s = advance(s);
  assert.equal(s.phaseData.stage, 'unveil');
});

test('Cerimonia: un "Bandire" -> voto -> bando con rivelazione -> si sceglie di nuovo', () => {
  let s = atCeremony();
  s = pick(s, 'p2', FINAL_CHOICES.BANISH);
  for (const id of ['p1', 'p3', 'p4']) s = pick(s, id, FINAL_CHOICES.END);
  assert.equal(s.phaseData.stage, 'voting');
  assert.equal(s.phaseData.banishCount, 1);
  s = voteAll(s, (id) => (id === 'p1' ? 'p2' : 'p1'));
  assert.deepEqual(s.phaseData.outcome, { kind: 'banish', playerId: 'p1' });
  s = advance(s);
  assert.equal(s.phaseData.stage, 'reveal');
  assert.equal(s.phaseData.faction, 'traitors');
  s = advance(s);
  assert.equal(s.phaseData.stage, 'choice');
  for (const id of alive(s)) s = pick(s, id, FINAL_CHOICES.END);
  while (s.phase !== PHASE.ENDED) s = advance(s);
  assert.equal(s.winner, 'faithfuls');
});

test('Cerimonia: parità e ballottaggio pari -> nessuno esce, si torna a scegliere', () => {
  let s = atCeremony();
  s = pick(s, 'p2', FINAL_CHOICES.BANISH);
  s = advance(s);
  const tie = { p1: 'p2', p2: 'p1', p3: 'p2', p4: 'p1' };
  s = voteAll(s, (id) => tie[id]);
  assert.equal(s.phaseData.outcome.kind, 'runoff');
  s = advance(s);
  s = voteAll(s, (id) => tie[id]);
  assert.deepEqual(s.phaseData.outcome, { kind: 'none', reason: 'tie' });
  s = advance(s);
  assert.equal(s.phaseData.stage, 'choice');
  assert.equal(alive(s).length, 4);
});

test('Cerimonia: si scende al massimo fino a 2, poi solo rivelazioni', () => {
  let s = atCeremony();
  for (let round = 0; round < 2; round++) {
    s = pick(s, alive(s)[0], FINAL_CHOICES.BANISH);
    s = advance(s);
    const target = alive(s).at(-1);
    s = voteAll(s, (id) => (id === target ? alive(s)[0] : target));
    s = advance(s); // risultati -> reveal
    s = advance(s); // reveal -> scelta o rivelazioni
  }
  assert.equal(alive(s).length, 2);
  assert.equal(s.phaseData.stage, 'unveil');
  assert.equal(rejected(s, { type: A.FINAL_CHOICE, playerId: alive(s)[0], payload: { choice: 'end' } }), REJECT.WRONG_PHASE);
});

test('a partita finita il master non può più avanzare', () => {
  let s = atCeremony();
  s = advance(s);
  while (s.phase !== PHASE.ENDED) s = advance(s);
  assert.equal(rejected(s, { type: A.ADVANCE }), REJECT.WRONG_PHASE);
});

test('200 partite casuali da 5 a 16 giocatori arrivano tutte alla fine con un vincitore', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const players = 5 + (seed % 12);
    const end = playRandomGame({ players, seed });
    assert.equal(end.phase, PHASE.ENDED);
    assert.ok(['traitors', 'faithfuls'].includes(end.winner));
    const live = alive(end).length;
    assert.ok(live >= 2 && live <= end.settings.finalThreshold, `vivi a fine partita: ${live}`);
  }
});

test('salvataggio: dopo un passaggio in JSON la partita prosegue identica', () => {
  const seed = 99;
  const states = [];
  playRandomGame({ players: 9, seed, onState: (s) => states.push(s) });
  // Ogni stato sopravvive al passaggio in JSON (come in localStorage) senza perdere nulla
  for (const s of states) assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
  // E il generatore riprende da dove era: stesso stato ricaricato, stesso esito
  const night = states.find((s) => s.phase === PHASE.NIGHT);
  const reloaded = JSON.parse(JSON.stringify(night));
  assert.deepEqual(advance(reloaded), advance(night));
});
