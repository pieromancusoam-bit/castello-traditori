// Schermo del master durante la partita: fasi, missioni, tabellone e parete dei ritratti.
// Mostra solo viewForMaster: niente ruoli nascosti, lo schermo lo vedono tutti.

import { A } from '../engine/actions.js';
import { esc, on } from '../ui/dom.js';
import { portraitWallHtml, portraitFrameHtml } from './portrait-wall.js';
import { GAME } from '../config/game-config.js';
import { missionStageHtml, missionAdvanceLabel, boardHtml, prizeHtml } from './mission.js';
import { countdownHtml, runCountdown } from '../ui/countdown.js';
import { coins } from '../ui/format.js';

const FACTION_A = { faithfuls: 'un Leale', traitors: 'un Traditore' };
const FACTION = { faithfuls: 'Leale', traitors: 'Traditore' };

export function mountGame(root, host, { debug, onClose }) {
  root.innerHTML = `
    <section class="master-game">
      <header class="game-bar"></header>
      ${countdownHtml('master-countdown')}
      <div class="stage"></div>
      <div class="board-overlay" hidden></div>
      <footer class="game-footer">
        <span class="conn"></span>
        <button class="btn btn-small btn-ghost" data-act="close">Chiudi stanza</button>
        <button class="btn btn-small btn-secondary" data-act="board">Tabellone</button>
        <button class="btn btn-small btn-ghost" data-act="lobby" hidden>Nuova partita, stessi giocatori</button>
        <button class="btn btn-primary btn-advance" data-act="advance"></button>
      </footer>
      ${debug ? '<pre class="debug-panel"></pre>' : ''}
    </section>`;

  const el = (s) => root.querySelector(s);
  let shownStage = '';
  let busy = false; // animazione in corso: "Avanti" nascosto
  const timers = [];

  let boardOpen = false;
  on(root, '[data-act="advance"]', 'click', () => host.dispatch({ type: A.ADVANCE }));
  on(root, '[data-act="board"]', 'click', () => {
    boardOpen = !boardOpen;
    update();
  });
  // Conto alla rovescia del timer della partita (missioni), dall'orologio del master
  runCountdown(root, () => {
    const v = host.masterView();
    const t = v && v.step && v.step.timer;
    if (!t) return null;
    const left = host.timerLeft(t.key);
    return left === null ? null : { left, total: t.ms };
  });
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
      <span class="bar-pot">Montepremi <strong>${coins(v.pot)}</strong></span>
      <span>${alive} in gioco su ${v.players.length}</span>
      <span>Stanza ${esc(host.roomCode)}</span>`;

    const overlay = el('.board-overlay');
    overlay.hidden = !boardOpen;
    if (boardOpen) overlay.innerHTML = boardHtml(v, nameOf);
    el('[data-act="board"]').textContent = boardOpen ? 'Chiudi il tabellone' : 'Tabellone';
    // Dopo la missione il tabellone arriva da solo: niente doppione del pulsante
    el('[data-act="board"]').hidden = !boardOpen && v.phase === 'mission' && (v.step.stage === 'result' || v.step.stage === 'board');

    // Il palco si ridisegna solo se cambia davvero: così le animazioni non ripartono
    const stageKey = JSON.stringify(v);
    if (stageKey !== shownStage) {
      shownStage = stageKey;
      el('.stage').innerHTML = stageHtml(v, nameOf, host);
      timers.splice(0).forEach(clearTimeout);
      busy = false;
      if (v.phase === 'final' && v.step.stage === 'choice-reveal') {
        busy = true;
        playCeremony(el('.stage'), v, nameOf, host, timers, () => {
          busy = false;
          update();
        });
      }
    }

    const label = advanceLabel(v);
    el('[data-act="advance"]').hidden = !label || busy;
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
    case 'mission': return missionAdvanceLabel(st);
    case 'roundtable':
      return st.stage === 'voting' ? 'Chiudi la votazione' : st.outcome.kind === 'runoff' ? 'Al ballottaggio' : st.outcome.kind === 'banish' ? 'Rivela la fazione' : 'Prosegui';
    case 'reveal': return 'Prosegui';
    case 'night': return 'Fai sorgere il sole';
    case 'final':
      switch (st.stage) {
        case 'choice': return 'Chiudi la scelta';
        case 'choice-reveal': return st.reveal.some((r) => r.choice === 'banish') ? 'Al voto' : 'Le ultime maschere';
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
    case 'mission':
      return missionStageHtml(v, nameOf);
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
        case 'choice-reveal':
          // Riempito da playCeremony, passo dopo passo
          return `<div class="ceremony">
              <div class="cer-intro">
                <h1>Le polveri si accendono…</h1>
                <p class="lead">Il castello rivela le scelte, una alla volta.</p>
              </div>
              <div class="cer-spot" hidden></div>
              <div class="cer-summary" hidden></div>
            </div>`;
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
        ${prizeHtml(v, nameOf)}
        <ul class="unveil">${v.players.map((p) => `
          <li class="faction-${p.faction} ${p.status !== 'alive' ? 'is-out' : ''}">
            <span>${esc(p.name)}${p.status === 'banished' ? ' · bandito' : p.status === 'murdered' ? ' · assassinato' : ''}</span>
            <strong>${FACTION[p.faction]}</strong>
          </li>`).join('')}</ul>`;
    default:
      return '';
  }
}

// ---------------- Cerimonia: rivelazione delle scelte ----------------

const CHOICE_LABEL = { end: 'Chiudere la partita', banish: 'Bandire ancora' };

function flamesHtml(choice) {
  // Fiamme in CSS: verdi per "Chiudere", rosse per "Bandire"
  const tongues = Array.from({ length: 7 }, (_, i) => `<span class="tongue t${i}"></span>`).join('');
  return `<div class="flames flames-${choice}" aria-hidden="true">${tongues}</div>`;
}

// Attesa, poi per ogni giocatore: ritratto e nome, poi le fiamme. Infine il riepilogo.
function playCeremony(stage, v, nameOf, host, timers, onDone) {
  const T = GAME.ceremonyReveal;
  const intro = stage.querySelector('.cer-intro');
  const spot = stage.querySelector('.cer-spot');
  const summary = stage.querySelector('.cer-summary');
  const list = v.step.reveal;
  const playerOf = (id) => v.players.find((p) => p.id === id);
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));

  let t = T.introMs;
  later(t, () => {
    intro.hidden = true;
    spot.hidden = false;
  });

  list.forEach((r) => {
    later(t, () => {
      spot.className = 'cer-spot';
      spot.innerHTML = `
        <div class="cer-portrait">
          ${portraitFrameHtml(playerOf(r.playerId), host.photoOf(r.playerId))}
          <div class="cer-flame-slot"></div>
        </div>
        <p class="cer-name">${esc(nameOf(r.playerId))}</p>
        <p class="cer-choice"></p>`;
    });
    t += T.portraitMs;
    later(t, () => {
      spot.classList.add(`is-${r.choice}`);
      spot.querySelector('.cer-flame-slot').innerHTML = flamesHtml(r.choice);
      spot.querySelector('.cer-choice').textContent = CHOICE_LABEL[r.choice];
    });
    t += T.flameMs;
  });

  later(t, () => {
    spot.hidden = true;
    const banish = list.filter((r) => r.choice === 'banish').length;
    summary.hidden = false;
    summary.innerHTML = `
      <h1>${banish ? 'Si bandisce ancora' : 'Tutti chiudono la partita'}</h1>
      <div class="cer-row">${list.map((r) => `
        <figure class="cer-mini is-${r.choice}">
          ${portraitFrameHtml(playerOf(r.playerId), host.photoOf(r.playerId))}
          ${flamesHtml(r.choice)}
          <figcaption>${esc(nameOf(r.playerId))}</figcaption>
        </figure>`).join('')}</div>
      <p class="lead">${banish ? 'Almeno uno vuole bandire ancora: si vota.' : 'È il momento delle ultime maschere.'}</p>`;
    onDone();
  });
}
