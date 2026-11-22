// Schermo del master durante la partita: fasi, missioni, tabellone e parete dei ritratti.
// Mostra solo viewForMaster: niente ruoli nascosti, lo schermo lo vedono tutti.

import { A } from '../engine/actions.js';
import { esc, on } from '../ui/dom.js';
import { portraitWallHtml, portraitFrameHtml } from './portrait-wall.js';
import { GAME } from '../config/game-config.js';
import { missionStageHtml, missionAdvanceLabel, boardHtml, prizeHtml, presentationHtml, presentationAdvanceLabel } from './mission.js';
import { countdownHtml, runCountdown } from '../ui/countdown.js';
import { coins } from '../ui/format.js';
import { MISSIONS } from '../config/missions.js';
import { EVENTS, ITEMS } from '../config/game-config.js';
import { MISSION_IDS } from '../engine/missions/index.js';
import { openAudioPanel } from './audio-panel.js';
import { SHOW } from '../config/show-config.js';
import { voteTimes } from '../show/director.js';

// Solo prove (?debug=1): scelta del prossimo gioco e del prossimo evento
function debugBarHtml(host) {
  const opts = (list, label) => `<option value="">${label}</option>${list.map(([id, name]) => `<option value="${id}">${esc(name)}</option>`).join('')}`;
  const players = host.game ? host.game.order.map((id) => [id, host.game.players[id].name]) : [];
  return `<div class="debug-bar">
    <select data-debug="mission">${opts(MISSION_IDS.map((id) => [id, MISSIONS[id].title]), 'Prossimo gioco: a caso')}</select>
    <select data-debug="event">${opts(Object.entries(EVENTS).map(([id, e]) => [id, e.name]), 'Prossimo evento: a caso')}</select>
    <select data-debug-give="item">${opts(Object.entries(ITEMS).map(([id, e]) => [id, e.name]), 'Dai un oggetto…')}</select>
    <select data-debug-give="player">${opts(players, '…a chi?')}</select>
  </div>`;
}

const FACTION_A = { faithfuls: 'un Leale', traitors: 'un Traditore' };
const FACTION = { faithfuls: 'Leale', traitors: 'Traditore' };
const SPECIAL_NAME = { seer: 'Veggente', knight: 'Cavaliere', secret_traitor: 'Traditore Segreto' };

export function mountGame(root, host, { debug, onClose, show }) {
  root.innerHTML = `
    <section class="master-game">
      <header class="game-bar"></header>
      ${countdownHtml('master-countdown')}
      <div class="stage"></div>
      <div class="board-overlay" hidden></div>
      <footer class="game-footer">
        <span class="conn"></span>
        <button class="btn btn-small btn-ghost" data-act="close">Chiudi stanza</button>
        <button class="btn btn-small btn-ghost" data-act="audio">Audio</button>
        <button class="btn btn-small btn-secondary" data-act="board">Tabellone</button>
        <button class="btn btn-small btn-ghost" data-act="lobby" hidden>Nuova partita, stessi giocatori</button>
        <button class="btn btn-primary btn-advance" data-act="advance"></button>
      </footer>
      ${debug ? `${debugBarHtml(host)}<pre class="debug-panel"></pre>` : ''}
    </section>`;

  const el = (s) => root.querySelector(s);
  let shownStage = '';
  let busy = false; // animazione in corso: "Avanti" nascosto
  const timers = [];

  let boardOpen = false;
  on(root, '[data-act="audio"]', 'click', () => openAudioPanel(show));
  // Mentre il narratore parla "Avanti" aspetta: tenendolo premuto si salta
  let holdTimer = null;
  on(root, '[data-act="advance"]', 'pointerdown', (e, btn) => {
    if (!btn.classList.contains('is-waiting')) return;
    btn.classList.add('is-holding');
    holdTimer = setTimeout(() => {
      btn.classList.remove('is-holding');
      el('.stage').classList.add('is-skipped');
      show.skip();
    }, SHOW.skipHoldMs);
  });
  const cancelHold = () => {
    clearTimeout(holdTimer);
    const b = el('[data-act="advance"]');
    if (b) b.classList.remove('is-holding');
  };
  root.addEventListener('pointerup', cancelHold);
  root.addEventListener('pointerleave', cancelHold);
  root.addEventListener('pointercancel', cancelHold);
  show.watch(() => update());

  on(root, '[data-act="advance"]', 'click', (e, btn) => {
    if (btn.classList.contains('is-waiting')) return;
    // Solo per le prove (?debug=1): salta la discussione minima della Tavola Rotonda
    const v = host.masterView();
    const skip = debug && v && v.phase === 'roundtable' && v.step.stage === 'discussion';
    host.dispatch(skip ? { type: A.ADVANCE, payload: { force: true } } : { type: A.ADVANCE });
  });
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
  root.addEventListener('change', (e) => {
    const sel = e.target.closest('[data-debug]');
    if (sel && sel.value) {
      host.dispatch({ type: A.DEBUG_NEXT, payload: { [sel.dataset.debug]: sel.value } });
      sel.value = '';
    }
    // Dai un oggetto: scelti oggetto e giocatore
    if (e.target.closest('[data-debug-give]')) {
      const item = root.querySelector('[data-debug-give="item"]');
      const player = root.querySelector('[data-debug-give="player"]');
      if (item.value && player.value) {
        host.dispatch({ type: A.DEBUG_NEXT, payload: { give: { playerId: player.value, item: item.value } } });
        item.value = '';
        player.value = '';
      }
    }
  });
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
      show.update(v);
      el('.stage').classList.remove('is-skipped');
      el('.stage').innerHTML = stageHtml(v, nameOf, host);
      timers.splice(0).forEach(clearTimeout);
      busy = false;
      if (v.phase === 'final' && v.step.stage === 'choice-reveal') {
        busy = true;
        playCeremony(el('.stage'), v, nameOf, host, timers, show, () => {
          busy = false;
          update();
        });
      }
    }

    let label = advanceLabel(v);
    if (!label && debug && v.phase === 'roundtable' && v.step.stage === 'discussion') label = 'Salta la discussione (prova)';
    const adv = el('[data-act="advance"]');
    const waiting = Boolean(label) && !busy && show.busy();
    adv.hidden = !label || busy;
    adv.classList.toggle('is-waiting', waiting);
    adv.textContent = waiting ? 'Il narratore parla… (tieni premuto per saltare)' : label || '';
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
    case 'presentations': return presentationAdvanceLabel(st);
    case 'roundtable':
      if (st.stage === 'discussion') return null; // la discussione minima non si salta
      return st.stage === 'voting' ? 'Chiudi la votazione' : st.outcome.kind === 'runoff' ? 'Al ballottaggio' : st.outcome.kind === 'banish' ? 'Rivela la fazione' : 'Prosegui';
    case 'reveal': return 'Prosegui';
    case 'scene': return 'Fine della scena';
    case 'dusk': return 'Prosegui';
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

// Evento del giorno, annunciato alla Colazione
function eventHtml(v) {
  const ev = v.event;
  if (!ev || ev.cancelled) return '';
  const def = EVENTS[ev.id];
  const extra = ev.id === 'doubleStakes' ? ` Tocca al gioco n. ${ev.slot} di oggi.` : '';
  return `<div class="event-banner event-${ev.id}"><p class="kicker">Evento del castello</p><h2>${esc(def.name)}</h2><p>${esc(def.text + extra)}</p></div>`;
}

// Maledetti di oggi (mai chi ha lanciato la Maledizione) e Sigilli usati
export function cursesHtml(v, nameOf) {
  const out = v.curses.map((id) => `<p class="curse-line"><strong>${esc(nameOf(id))}</strong> è stato maledetto: alla Tavola Rotonda non vota.</p>`);
  out.push(...v.sealed.map((id) => `<p class="curse-line is-sealed"><strong>${esc(nameOf(id))}</strong> ha spezzato la Maledizione con il Sigillo.</p>`));
  return out.join('');
}

function voteStageHtml(st, nameOf, title) {
  if (st.stage === 'voting') {
    const runoff = st.round === 2
      ? `<p class="lead">Ballottaggio tra ${st.candidates.map((id) => `<strong>${esc(nameOf(id))}</strong>`).join(' e ')}</p>`
      : '<p class="lead">Discutete. Poi votate dal telefono chi bandire.</p>';
    const banish = st.banishCount ? `<p class="muted">${st.banishCount === 1 ? 'Qualcuno ha' : `${st.banishCount} giocatori hanno`} scelto di bandire ancora.</p>` : '';
    const second = st.second ? '<p class="event-line">Dopo il Banchetto: <strong>seconda votazione</strong> del giorno.</p>' : '';
    const fog = st.fog ? '<p class="event-line">Nebbia: i voti si vedranno solo come conteggio.</p>' : '';
    return `<h1>${st.round === 2 ? 'Ballottaggio' : title}</h1>${second}${fog}${banish}${runoff}${progress(st.votedCount, st.voterCount, 'hanno votato')}`;
  }
  // Nebbia: solo il conteggio, senza chi ha votato
  if (st.fog) {
    // Dal meno votato al più votato: la suspense cresce fino all'ultimo
    const T = voteTimes(st.fogCounts.length);
    const fogRows = [...st.fogCounts].sort((a, b) => a.count - b.count)
      .map((c, i) => `<li class="vote-in" style="${delay(T.at(i))}"><strong>${esc(nameOf(c.targetId))}</strong> ${c.count} ${c.count === 1 ? 'voto' : 'voti'}</li>`).join('');
    const dag = st.daggerCount ? `<p class="muted vote-in" style="${delay(T.outcome)}">${st.daggerCount === 1 ? 'Un voto contava' : `${st.daggerCount} voti contavano`} doppio (Pugnale).</p>` : '';
    return `<h1>I voti nella nebbia</h1><p class="lead">La nebbia nasconde chi ha votato chi.</p>
      <ul class="tally is-fog">${fogRows || '<li class="muted">Nessun voto</li>'}</ul>${dag}
      <p class="outcome vote-in" style="${delay(T.outcome)}">${outcomeHtml(st.outcome, nameOf)}</p>`;
  }
  const counts = {};
  for (const v of st.votes) counts[v.targetId] = (counts[v.targetId] || 0) + (v.double ? 2 : 1);
  // I voti compaiono uno alla volta (tempi uguali ai rintocchi del regista)
  const T = voteTimes(st.votes.length);
  const rows = st.votes.map((v, i) => `<li class="vote-in ${v.double ? 'is-double' : ''}" style="${delay(T.at(i))}"><span>${esc(nameOf(v.voterId))}</span><span class="arrow">➜</span><span>${esc(nameOf(v.targetId))}${v.double ? ' <span class="dagger-mark" title="Pugnale">×2</span>' : ''}</span></li>`).join('');
  const tally = Object.entries(counts).sort((a, b) => b[1] - a[1])
    .map(([id, n]) => `<li><strong>${esc(nameOf(id))}</strong> ${n} ${n === 1 ? 'voto' : 'voti'}</li>`).join('');
  return `<h1>I voti</h1>
    <div class="votes-layout">
      <ul class="vote-list">${rows || '<li class="muted">Nessun voto</li>'}</ul>
      <ul class="tally vote-in" style="${delay(T.outcome)}">${tally}</ul>
    </div>
    <p class="outcome vote-in" style="${delay(T.outcome)}">${outcomeHtml(st.outcome, nameOf)}</p>`;
}

const delay = (ms) => `animation-delay:${ms}ms`;

// Bandito: il nome pulsa come un cuore nel silenzio, poi arriva la fazione
function revealStageHtml(st, nameOf) {
  return `<div class="reveal" style="--silence:${SHOW.revealSilenceMs}ms">
    <p class="lead reveal-name">${esc(nameOf(st.playerId))}</p>
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
      else if (st.failed) msg = 'Stanotte i Traditori hanno colpito… ma <strong>l\'omicidio è fallito</strong>. Qualcuno era protetto da uno Scudo.';
      else msg = 'Stanotte nessuno è stato assassinato.';
      // I più sospettati della notte, senza dire chi li ha indicati
      const names = st.suspects.map((id) => `<strong>${esc(nameOf(id))}</strong>`);
      const suspects = names.length
        ? `<p class="suspects-line">Il castello sospetta di ${names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} e ${names.at(-1)}`}.</p>`
        : '';
      return `<h1>Colazione</h1>
        <p class="lead ${st.victimId ? 'after-break' : ''}">${msg}</p>
        ${suspects}
        ${eventHtml(v)}
        ${cursesHtml(v, nameOf)}
        ${portraitWallHtml(v.players, { photoOf: (id) => host.photoOf(id), breakingId: st.victimId, suspects: st.suspects })}`;
    }
    case 'mission':
      return missionStageHtml(v, nameOf);
    case 'presentations':
      return presentationHtml(v, nameOf, (id) => portraitFrameHtml(v.players.find((p) => p.id === id), host.photoOf(id)));
    case 'roundtable':
      if (st.stage === 'discussion') {
        return `<h1>Tavola Rotonda</h1>
          ${cursesHtml(v, nameOf)}
          <p class="lead">Discutete: chi sono i Traditori? Il voto si apre quando la clessidra è vuota.</p>
          <div class="discussion-clock" aria-hidden="true"></div>`;
      }
      return (st.stage === 'voting' ? cursesHtml(v, nameOf) : '') + voteStageHtml(st, nameOf, 'Tavola Rotonda');
    case 'reveal':
      return revealStageHtml(st, nameOf);
    case 'scene':
      return `<p class="kicker">Omicidio a vista</p><h1>La scena</h1>
        <p class="scene-text">${esc(st.scene)}</p>
        <p class="lead">Tutti toccano un nome sul telefono. Uno di quei tocchi uccide.</p>
        ${progress(st.touchedCount, st.total, 'hanno toccato')}`;
    case 'dusk': {
      const text = st.reason === 'murdered'
        ? `Al tramonto il castello scopre il delitto: <strong>${esc(nameOf(st.victimId))}</strong> è stato ucciso alla luce del giorno.`
        : st.reason === 'gone' ? 'Al tramonto il pugnale cerca la sua vittima… ma ha già lasciato il castello.'
        : 'Al tramonto nessuno è caduto: il Traditore non ha colpito.';
      return `<h1>Il tramonto</h1><p class="lead ${st.victimId ? 'after-break' : ''}">${text}</p>
        ${portraitWallHtml(v.players, { photoOf: (id) => host.photoOf(id), breakingId: st.victimId, suspects: [] })}`;
    }
    case 'night': {
      const rest = v.event && !v.event.cancelled && (v.event.id === 'banquet' || v.event.id === 'daylightMurder')
        ? `<p class="event-line">${v.event.id === 'banquet' ? 'Stanotte c\'è il Banchetto: nessuno morirà.' : 'Il sangue è già stato versato: stanotte nessuno morirà.'}</p>`
        : '';
      return `<h1>La notte</h1>${rest}
        <p class="lead">Chiudete gli occhi… Tutti toccano il proprio telefono.</p>
        ${progress(st.touchedCount, st.total, 'hanno fatto una scelta')}`;
    }
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
          // L'ultimo svelato arriva dopo un silenzio
          const newest = st.revealed.at(-1);
          return `<h1>Le ultime maschere</h1>
            <ul class="unveil" style="--silence:${SHOW.unveilSilenceMs}ms">${live.map((p) => `
              <li class="${p.faction ? `faction-${p.faction}` : 'is-hidden'} ${p.id === newest ? 'is-new' : ''}">
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
            <strong>${SPECIAL_NAME[p.role] || FACTION[p.faction]}</strong>
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
function playCeremony(stage, v, nameOf, host, timers, show, onDone) {
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
      show.sound('flame');
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
