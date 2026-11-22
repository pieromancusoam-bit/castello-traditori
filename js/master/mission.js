// Schermo del master durante i giochi del giorno e tabellone.
// Usa solo viewForMaster: durante il gioco conteggi; a gioco chiuso le tracce
// (chi ha fatto cosa), mai i ruoli.

import { esc } from '../ui/dom.js';
import { coins, seconds, listNames, LETTERS } from '../ui/format.js';
import { MISSIONS } from '../config/missions.js';
import { symbolSvg, symbolName, estimateSvg } from '../ui/symbols.js';

const FACTION = { faithfuls: 'Leale', traitors: 'Traditore' };
const names = (ids, nameOf) => listNames(ids.map((id) => `<strong>${esc(nameOf(id))}</strong>`));
const progress = (done, total, verb) => `<p class="progress"><strong>${done}</strong> su ${total} ${verb}</p>`;
const yearText = (y) => (y < 0 ? `${-y} a.C.` : String(y));

export function missionAdvanceLabel(st) {
  const m = st.mission;
  switch (st.stage) {
    case 'intro': return 'Inizia il gioco';
    case 'play':
      switch (st.id) {
        case 'chest': return 'Apri il forziere';
        case 'riddle':
          if (m.sub === 'question') return 'Chiudi la domanda';
          return m.index + 1 < m.total ? 'Prossima domanda' : 'Risultato';
        case 'torches': return m.round + 1 < m.rounds ? 'Prossima torcia' : 'Risultato';
        case 'trial': return m.sub === 'doing' ? 'Fine della prova' : 'Chiudi il voto';
        case 'estimate': return m.sub === 'look' ? 'Copri l\'immagine' : 'Chiudi le stime';
        case 'memory': return m.sub === 'show' ? 'Fine della catena' : 'Chiudi le scelte';
        case 'chronology': return 'Chiudi la fila';
        case 'messenger': return 'Chiudi le risposte';
        default: return 'Avanti';
      }
    case 'result': return st.slot < st.perDay ? 'Prossimo gioco' : 'Tabellone';
    default: return 'Alla Tavola Rotonda';
  }
}

export function missionStageHtml(v, nameOf) {
  const st = v.step;
  const def = MISSIONS[st.id];
  if (st.stage === 'board') return boardHtml(v, nameOf);
  const head = `<p class="kicker">Giorno ${v.day} · gioco ${st.slot} di ${st.perDay}</p><h1>${esc(def.title)}</h1>`;
  if (st.stage === 'intro') return head + introHtml(st, def, nameOf);
  if (st.stage === 'result') return head + resultHtml(st, nameOf);
  return head + playHtml(st, nameOf);
}

function introHtml(st, def, nameOf) {
  const m = st.mission;
  let extra = '';
  if (st.id === 'chest') extra = `<p class="lead">Il castello sceglie: ${names(m.group, nameOf)}.</p>`;
  if (st.id === 'riddle') extra = `<p class="muted">${m.total} domande · vale la risposta della maggioranza</p>`;
  if (st.id === 'torches') extra = `<p class="muted">${m.rounds} torce · premio pieno sotto ${seconds(m.fullBelowMs)} di media</p>`;
  if (st.id === 'trial') extra = `<div class="trial-card"><h2>${esc(m.title)}</h2><p>${esc(m.text)}</p></div>`;
  if (st.id === 'estimate') extra = `<p class="lead">Contate le ${esc(m.object)}!</p>`;
  if (st.id === 'messenger') extra = `<p class="lead">Il messaggero è ${names([m.messengerId], nameOf)}.</p>`;
  return `<p class="rules">${esc(def.rules)}</p>${extra}
    <p class="stake">In palio <strong>${coins(st.value)}</strong> monete</p>`;
}

function playHtml(st, nameOf) {
  const m = st.mission;
  switch (st.id) {
    case 'chest':
      return `<div class="chest-scene" aria-hidden="true"><div class="chest"></div></div>
        <p class="lead">${names(m.group, nameOf)} scelgono in segreto: Oro o Piombo.</p>
        ${progress(m.chosenCount, m.group.length, 'hanno scelto')}`;
    case 'riddle': {
      const reveal = m.sub === 'reveal';
      const opts = m.options.map((o, i) => {
        const cls = reveal ? (i === m.correctIndex ? 'is-right' : i === m.reveal.groupAnswer ? 'is-wrong' : 'is-dim') : '';
        const who = reveal && m.reveal.byOption[i].length ? `<span class="opt-who">${m.reveal.byOption[i].map((id) => esc(nameOf(id))).join(', ')}</span>` : '';
        const count = reveal ? `<span class="opt-count">${m.reveal.counts[i]}</span>` : '';
        return `<li class="${cls}"><span class="opt-letter">${LETTERS[i]}</span><span class="opt-text">${esc(o)}${who}</span>${count}</li>`;
      }).join('');
      let foot = progress(m.answeredCount ?? 0, m.playerCount, 'hanno risposto');
      if (reveal) {
        foot = m.reveal.groupAnswer === null
          ? '<p class="outcome bad">Nessuna maggioranza: risposta persa.</p>'
          : `<p class="outcome ${m.reveal.correct ? 'good' : 'bad'}">Il gruppo ha scelto ${LETTERS[m.reveal.groupAnswer]}: ${m.reveal.correct ? 'giusto!' : 'sbagliato.'}</p>`;
      }
      return `<p class="q-index">Domanda ${m.index + 1} di ${m.total}</p>
        <p class="question">${esc(m.text)}</p>
        <ol class="options">${opts}</ol>${foot}`;
    }
    case 'torches':
      return `<div class="torch-scene" aria-hidden="true"><div class="torch is-lit"><span class="torch-flame"></span><span class="torch-stick"></span></div></div>
        <p class="lead">Torcia ${m.round + 1} di ${m.rounds}: guardate il vostro telefono!</p>
        ${progress(m.reportedCount, m.playerCount, 'hanno toccato')}`;
    case 'trial':
      if (m.sub === 'doing') return `<div class="trial-card is-big"><h2>${esc(m.title)}</h2><p>${esc(m.text)}</p></div>`;
      return `<p class="lead">La prova è riuscita? Votate dal telefono.</p>
        <div class="trial-card"><h2>${esc(m.title)}</h2></div>
        ${progress(m.votedCount, m.playerCount, 'hanno votato')}`;
    case 'estimate':
      if (m.picture) return `<div class="estimate-frame">${estimateSvg(m.picture)}</div>`;
      return `<p class="lead">Quante ${esc(m.object)} c'erano? Scrivetelo sul telefono.</p>
        ${progress(m.guessedCount, m.playerCount, 'hanno risposto')}`;
    case 'memory':
      if (m.chain) {
        // La catena scorre da sola: un simbolo alla volta, con il nome accanto (animazione CSS)
        const items = m.chain.map((c, i) => `
          <div class="chain-item" style="animation-delay:${m.introMs + i * m.itemMs}ms;animation-duration:${m.itemMs}ms">
            ${symbolSvg(c.symbol)}<p class="chain-name">${esc(nameOf(c.playerId))}</p>
          </div>`).join('');
        return `<div class="chain-stage">${items}<p class="chain-ready lead" style="animation-delay:0ms;animation-duration:${m.introMs}ms">Pronti… ricordate il vostro simbolo!</p></div>`;
      }
      return `<p class="lead">Quale era il vostro simbolo? Sceglietelo sul telefono.</p>
        ${progress(m.pickedCount, m.playerCount, 'hanno scelto')}`;
    case 'chronology':
      return `<p class="lead">Leggete ad alta voce il vostro evento e mettetevi d'accordo sull'ordine, dal più antico al più recente.</p>
        ${progress(m.placedCount, m.playerCount, 'hanno scelto il proprio posto')}`;
    case 'messenger':
      return `<p class="lead">${names([m.messengerId], nameOf)} descrive la scena, senza le parole proibite.</p>
        <ol class="options">${m.options.map((o, i) => `<li><span class="opt-letter">${i + 1}</span><span>${esc(o)}</span></li>`).join('')}</ol>
        ${progress(m.chosenCount, m.playerCount, 'hanno scelto')}`;
    default:
      return '';
  }
}

// ---------------- Risultati e tracce ----------------

function traceHtml(st, nameOf) {
  const d = st.result.detail;
  const nm = (id) => esc(nameOf(id));
  switch (st.id) {
    case 'riddle':
      return `<ul class="trace-list">${[...d.scores].sort((a, b) => b.correct - a.correct)
        .map((x) => `<li><span>${nm(x.id)}</span><strong>${x.correct} su ${d.total}</strong></li>`).join('')}</ul>`;
    case 'torches': {
      const slowest = d.ranking.at(-1);
      return `<ol class="trace-list">${d.ranking.map((x) => `
        <li class="${x === slowest ? 'is-flag' : ''}"><span>${nm(x.id)}</span>
          <strong>${seconds(x.avgMs)}</strong>
          <small>${[x.early ? `${x.early} in anticipo` : '', x.missed ? `${x.missed} mancate` : ''].filter(Boolean).join(' · ')}</small></li>`).join('')}</ol>`;
    }
    case 'trial': {
      const fail = d.failIds.length ? `<p class="trace-line">Hanno detto <strong>fallita</strong>: ${names(d.failIds, nameOf)}.</p>` : '<p class="trace-line">Nessuno ha detto "fallita".</p>';
      const abst = d.abstainIds.length ? `<p class="trace-line muted">Non hanno votato: ${names(d.abstainIds, nameOf)}.</p>` : '';
      return fail + abst;
    }
    case 'estimate':
      return `<ul class="trace-list">${[...d.estimates].sort((a, b) => Math.abs((a.value ?? 1e9) - d.count) - Math.abs((b.value ?? 1e9) - d.count))
        .map((x) => `<li class="${x.value === null || Math.abs(x.value - d.count) > d.count * 0.5 ? 'is-flag' : ''}"><span>${nm(x.id)}</span><strong>${x.value ?? '—'}</strong></li>`).join('')}</ul>`;
    case 'memory':
      return `<div class="memory-rows">${d.rows.map((r) => `
        <div class="memory-row ${r.chosen === r.symbol ? 'is-ok' : 'is-flag'}">
          ${symbolSvg(r.symbol)}<span>${nm(r.id)}</span>
          <small>${r.chosen === null ? 'nessuna scelta' : r.chosen === r.symbol ? 'giusto' : `ha scelto ${esc(symbolName(r.chosen))}`}</small>
        </div>`).join('')}</div>`;
    case 'chronology':
      return `<ol class="chrono-list">${d.rows.map((r) => `
        <li class="${r.position === r.correctPosition ? 'is-ok' : 'is-flag'}">
          <span class="chrono-year">${yearText(r.year)}</span>
          <span class="chrono-text">${esc(r.text)}</span>
          <span class="chrono-who">${nm(r.id)} · ${r.position === null ? 'nessun posto' : `posto ${r.position}`}</span>
        </li>`).join('')}</ol>`;
    case 'messenger':
      return `<p class="trace-line">Messaggero: <strong>${nm(d.messengerId)}</strong> · la scena era «${esc(d.options[d.correctIndex])}»</p>
        <ul class="trace-list">${d.guessList.map((x) => `<li class="${x.choice === d.correctIndex ? '' : 'is-flag'}"><span>${nm(x.id)}</span><small>${x.choice === null ? 'nessuna scelta' : esc(d.options[x.choice])}</small></li>`).join('')}</ul>`;
    default:
      return '';
  }
}

function resultHtml(st, nameOf) {
  const r = st.result;
  const d = r.detail;
  const lines = {
    chest: () => (d.leadCount === 0 ? 'Solo oro nel forziere.' : `${d.leadCount === 1 ? 'Un Piombo' : `${d.leadCount} Piombo`} nel forziere.`),
    riddle: () => `${d.correct} ${d.correct === 1 ? 'risposta giusta' : 'risposte giuste'} su ${d.total}.`,
    torches: () => `Media del gruppo: ${seconds(d.avgMs)}.`,
    trial: () => `${d.yes} dicono riuscita, ${d.no} fallita.`,
    estimate: () => `Erano ${d.count} ${d.object}; la media del gruppo è ${d.avg}.`,
    memory: () => `${d.correct} simboli ricordati su ${d.total}.`,
    chronology: () => `${d.correct} eventi al posto giusto su ${d.total}.`,
    messenger: () => `${d.correct} su ${d.total} hanno riconosciuto la scena.`,
  };
  const verdict = r.coins > 0
    ? `<p class="coins-won">+${coins(r.coins)} <span>monete</span></p>`
    : `<p class="coins-lost">${st.id === 'chest' ? 'Il forziere resta vuoto' : 'Nessuna moneta'}</p>`;
  const chestNote = st.id === 'chest' && d.leadCount > 0 ? '<p class="muted">Chi ha messo il piombo? Il castello non lo dirà mai.</p>' : '';
  return `<div class="mission-result ${r.coins > 0 ? 'is-won' : 'is-lost'}">
      ${verdict}
      <p class="lead">${esc(lines[st.id] ? lines[st.id]() : '')}</p>
      ${chestNote}
      <div class="trace">${traceHtml(st, nameOf)}</div>
    </div>`;
}

// ---------------- Tabellone ----------------

export function boardHtml(v, nameOf) {
  const alive = v.players.filter((p) => p.status === 'alive');
  const banished = v.players.filter((p) => p.status === 'banished');
  const murdered = v.players.filter((p) => p.status === 'murdered');
  const col = (title, list, fmt) => `<section class="board-col"><h2>${title} <span class="count">${list.length}</span></h2>
    <ul>${list.map(fmt).join('') || '<li class="muted">Nessuno</li>'}</ul></section>`;
  const missions = v.missions.map((m) => `<li><span>G${m.day} · ${esc(MISSIONS[m.id].title)}</span><strong class="${m.coins ? '' : 'muted'}">${m.coins ? `+${coins(m.coins)}` : '0'}</strong></li>`).join('');
  return `<div class="board">
    <div class="board-pot">
      <p class="kicker">Montepremi</p>
      <p class="pot-value">${coins(v.pot)}</p>
      <p class="muted">${v.day ? `Giorno ${v.day}` : ''}</p>
    </div>
    <div class="board-cols">
      ${col('In gioco', alive, (p) => `<li>${esc(p.name)}</li>`)}
      ${col('Banditi', banished, (p) => `<li>${esc(p.name)} <span class="tag faction-${p.faction}">${FACTION[p.faction]}</span></li>`)}
      ${col('Assassinati', murdered, (p) => `<li>${esc(p.name)}</li>`)}
      <section class="board-col"><h2>Giochi</h2><ul class="board-missions">${missions || '<li class="muted">Ancora nessuno</li>'}</ul></section>
    </div>
  </div>`;
}

export function prizeHtml(v, nameOf) {
  const pr = v.prize;
  if (!pr) return '';
  if (!pr.pot) return '<p class="prize muted">Il montepremi è vuoto: si gioca per la gloria.</p>';
  return `<p class="prize">Montepremi <strong>${coins(pr.pot)}</strong> monete:
    ${pr.winners.length === 1 ? `tutte per ${names(pr.winners, nameOf)}` : `<strong>${coins(pr.share)}</strong> a testa per ${names(pr.winners, nameOf)}`}.</p>`;
}

// ---------------- Presentazioni ----------------

export function presentationAdvanceLabel(st) {
  return st.next ? 'Prossimo' : 'Ai giochi del giorno';
}

export function presentationHtml(v, nameOf, portraitHtml) {
  const st = v.step;
  return `<p class="kicker">Presentazioni · ${st.index + 1} di ${st.total}</p>
    <div class="presenter">
      <div class="presenter-portrait">${portraitHtml(st.playerId)}</div>
      <div>
        <h1>${esc(nameOf(st.playerId))}</h1>
        <p class="presenter-theme">${esc(st.theme)}</p>
      </div>
    </div>
    ${st.next ? `<p class="muted">Dopo: ${esc(nameOf(st.next))}</p>` : ''}`;
}
