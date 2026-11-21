// Schermo del master durante la partita (Fase 1: testo semplice, più la parete dei ritratti).
// Mostra solo viewForMaster: niente ruoli nascosti, lo schermo lo vedono tutti.

import { A } from '../engine/actions.js';
import { esc, on } from '../ui/dom.js';
import { portraitWallHtml } from './portrait-wall.js';

const FACTION_A = { faithfuls: 'un Leale', traitors: 'un Traditore' };
const FACTION = { faithfuls: 'Leale', traitors: 'Traditore' };

export function mountGame(root, host, { debug, onClose }) {
  root.innerHTML = `
    <section class="master-game">
      <header class="game-bar"></header>
      <div class="stage"></div>
      <footer class="game-footer">
        <span class="conn"></span>
        <button class="btn btn-small btn-ghost" data-act="close">Chiudi stanza</button>
        <button class="btn btn-small btn-ghost" data-act="lobby" hidden>Nuova partita, stessi giocatori</button>
        <button class="btn btn-primary btn-advance" data-act="advance"></button>
      </footer>
      ${debug ? '<pre class="debug-panel"></pre>' : ''}
    </section>`;

  const el = (s) => root.querySelector(s);
  let shownStage = '';

  on(root, '[data-act="advance"]', 'click', () => host.dispatch({ type: A.ADVANCE }));
  on(root, '[data-act="lobby"]', 'click', () => host.backToLobby());
  on(root, '[data-act="close"]', 'click', () => {
    if (confirm('Chiudere la stanza? La partita salvata verrà cancellata.')) onClose();
  });

  function update() {
    const v = host.masterView();
    if (!v) return;
    const nameOf = (id) => (v.players.find((p) => p.id === id) || { name: '?' }).name;
    const alive = v.players.filter((p) => p.status === 'alive').length;

    el('.master-game').className = `master-game phase-${v.phase}`;
    el('.game-bar').innerHTML = `
      <span>${v.day ? `Giorno ${v.day}` : 'Il castello'}</span>
      <span>${alive} in gioco su ${v.players.length}</span>
      <span>Stanza ${esc(host.roomCode)}</span>`;

    // Il palco si ridisegna solo se cambia davvero: così le animazioni non ripartono
    const stageKey = JSON.stringify(v);
    if (stageKey !== shownStage) {
      shownStage = stageKey;
      el('.stage').innerHTML = stageHtml(v, nameOf, host);
    }

    const label = advanceLabel(v);
    el('[data-act="advance"]').hidden = !label;
    el('[data-act="advance"]').textContent = label || '';
    el('[data-act="lobby"]').hidden = v.phase !== 'ended';

    const off = host.publicPlayers().filter((p) => !p.connected).map((p) => p.name);
    el('.conn').textContent = off.length ? `Disconnessi: ${off.join(', ')}` : 'Tutti collegati';
    el('.conn').className = `conn ${off.length ? 'has-off' : ''}`;

    // Pannello di debug: stato completo, SOLO sul master con ?debug=1
    const dbg = el('.debug-panel');
    if (dbg) dbg.textContent = JSON.stringify(host.game, null, 2);
  }

  update();
  return update;
}

function advanceLabel(v) {
  const st = v.step;
  switch (v.phase) {
    case 'roles': return 'Inizia la giornata';
    case 'breakfast': return 'Prosegui';
    case 'roundtable':
      return st.stage === 'voting' ? 'Chiudi la votazione' : st.outcome.kind === 'runoff' ? 'Al ballottaggio' : st.outcome.kind === 'banish' ? 'Rivela la fazione' : 'Prosegui';
    case 'reveal': return 'Prosegui';
    case 'night': return 'Fai sorgere il sole';
    case 'final':
      switch (st.stage) {
        case 'choice': return 'Chiudi la scelta';
        case 'voting': return 'Chiudi la votazione';
        case 'results': return st.outcome.kind === 'runoff' ? 'Al ballottaggio' : st.outcome.kind === 'banish' ? 'Rivela la fazione' : 'Prosegui';
        case 'reveal': return 'Prosegui';
        case 'unveil': return st.remaining > 0 ? 'Rivela il prossimo' : 'Verdetto finale';
        default: return 'Prosegui';
      }
    default: return null;
  }
}

const progress = (done, total, verb) => `<p class="progress"><strong>${done}</strong> su ${total} ${verb}</p>`;

function outcomeHtml(o, nameOf) {
  if (o.kind === 'banish') return `<strong>${esc(nameOf(o.playerId))}</strong> lascia il castello.`;
  if (o.kind === 'runoff') return `Parità tra ${o.candidates.map((id) => `<strong>${esc(nameOf(id))}</strong>`).join(' e ')}: ballottaggio.`;
  return o.reason === 'tie' ? 'Ancora parità: oggi nessuno lascia il castello.' : 'Nessun voto: oggi nessuno lascia il castello.';
}

function voteStageHtml(st, nameOf, title) {
  if (st.stage === 'voting') {
    const runoff = st.round === 2
      ? `<p class="lead">Ballottaggio tra ${st.candidates.map((id) => `<strong>${esc(nameOf(id))}</strong>`).join(' e ')}</p>`
      : '<p class="lead">Discutete. Poi votate dal telefono chi bandire.</p>';
    const banish = st.banishCount ? `<p class="muted">${st.banishCount === 1 ? 'Qualcuno ha' : `${st.banishCount} giocatori hanno`} scelto di bandire ancora.</p>` : '';
    return `<h1>${st.round === 2 ? 'Ballottaggio' : title}</h1>${banish}${runoff}${progress(st.votedCount, st.voterCount, 'hanno votato')}`;
  }
  const counts = {};
  for (const v of st.votes) counts[v.targetId] = (counts[v.targetId] || 0) + 1;
  const rows = st.votes.map((v) => `<li><span>${esc(nameOf(v.voterId))}</span><span class="arrow">➜</span><span>${esc(nameOf(v.targetId))}</span></li>`).join('');
  const tally = Object.entries(counts).sort((a, b) => b[1] - a[1])
    .map(([id, n]) => `<li><strong>${esc(nameOf(id))}</strong> ${n} ${n === 1 ? 'voto' : 'voti'}</li>`).join('');
  return `<h1>I voti</h1>
    <div class="votes-layout">
      <ul class="vote-list">${rows || '<li class="muted">Nessun voto</li>'}</ul>
      <ul class="tally">${tally}</ul>
    </div>
    <p class="outcome">${outcomeHtml(st.outcome, nameOf)}</p>`;
}

function revealStageHtml(st, nameOf) {
  return `<div class="reveal">
    <p class="lead">${esc(nameOf(st.playerId))}</p>
    <h1 class="reveal-faction faction-${st.faction}">era ${FACTION_A[st.faction]}</h1>
  </div>`;
}

function stageHtml(v, nameOf, host) {
  const st = v.step;
  switch (v.phase) {
    case 'roles':
      return `<h1>I ruoli sono stati assegnati</h1>
        <p class="lead">Guardate il vostro telefono. Tenete premuto per scoprire chi siete.</p>
        ${progress(st.seenCount, st.total, 'hanno visto il proprio ruolo')}`;
    case 'breakfast': {
      let msg;
      if (st.firstDay) msg = 'Il castello si sveglia. Tutti sono scesi a colazione… per ora.';
      else if (st.victimId) msg = `Stanotte i Traditori hanno colpito: <strong>${esc(nameOf(st.victimId))}</strong> non scenderà più a colazione.`;
      else msg = 'Stanotte nessuno è stato assassinato.';
      // I più sospettati della notte, senza dire chi li ha indicati
      const names = st.suspects.map((id) => `<strong>${esc(nameOf(id))}</strong>`);
      const suspects = names.length
        ? `<p class="suspects-line">Il castello sospetta di ${names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} e ${names.at(-1)}`}.</p>`
        : '';
      return `<h1>Colazione</h1>
        <p class="lead ${st.victimId ? 'after-break' : ''}">${msg}</p>
        ${suspects}
        ${portraitWallHtml(v.players, { photoOf: (id) => host.photoOf(id), breakingId: st.victimId, suspects: st.suspects })}`;
    }
    case 'roundtable':
      return voteStageHtml(st, nameOf, 'Tavola Rotonda');
    case 'reveal':
      return revealStageHtml(st, nameOf);
    case 'night':
      return `<h1>La notte</h1>
        <p class="lead">Chiudete gli occhi… Tutti toccano il proprio telefono.</p>
        ${progress(st.touchedCount, st.total, 'hanno fatto una scelta')}`;
    case 'final':
      switch (st.stage) {
        case 'choice':
          return `<h1>Cerimonia delle Polveri</h1>
            <p class="lead">Ognuno sceglie in segreto: chiudere la partita o bandire ancora.</p>
            ${progress(st.chosenCount, st.total, 'hanno scelto')}`;
        case 'voting':
        case 'results':
          return voteStageHtml(st, nameOf, 'Cerimonia delle Polveri');
        case 'reveal':
          return revealStageHtml(st, nameOf);
        case 'unveil': {
          const live = v.players.filter((p) => p.status === 'alive');
          return `<h1>Le ultime maschere</h1>
            <ul class="unveil">${live.map((p) => `
              <li class="${p.faction ? `faction-${p.faction}` : 'is-hidden'}">
                <span>${esc(p.name)}</span><strong>${p.faction ? FACTION[p.faction] : '?'}</strong>
              </li>`).join('')}</ul>`;
        }
        default:
          return '';
      }
    case 'ended':
      return `<h1 class="winner faction-${v.winner}">${v.winner === 'traitors' ? 'Vincono i Traditori' : 'Vincono i Leali'}</h1>
        <ul class="unveil">${v.players.map((p) => `
          <li class="faction-${p.faction} ${p.status !== 'alive' ? 'is-out' : ''}">
            <span>${esc(p.name)}${p.status === 'banished' ? ' · bandito' : p.status === 'murdered' ? ' · assassinato' : ''}</span>
            <strong>${FACTION[p.faction]}</strong>
          </li>`).join('')}</ul>`;
    default:
      return '';
  }
}
