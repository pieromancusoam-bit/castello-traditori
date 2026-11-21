// Schermo del master durante la missione del giorno e tabellone.
// Usa solo viewForMaster: conteggi e risultati aggregati, mai le scelte individuali.

import { esc } from '../ui/dom.js';
import { coins, seconds, listNames, LETTERS } from '../ui/format.js';
import { MISSIONS } from '../config/missions.js';

const FACTION = { faithfuls: 'Leale', traitors: 'Traditore' };
const names = (ids, nameOf) => listNames(ids.map((id) => `<strong>${esc(nameOf(id))}</strong>`));
const progress = (done, total, verb) => `<p class="progress"><strong>${done}</strong> su ${total} ${verb}</p>`;

export function missionAdvanceLabel(st) {
  const m = st.mission;
  switch (st.stage) {
    case 'intro': return 'Inizia la missione';
    case 'play':
      switch (st.id) {
        case 'chest': return 'Apri il forziere';
        case 'riddle':
          if (m.sub === 'question') return 'Chiudi la domanda';
          return m.index + 1 < m.total ? 'Prossima domanda' : 'Risultato';
        case 'torches': return m.round + 1 < m.rounds ? 'Prossima torcia' : 'Risultato';
        case 'trial': return m.sub === 'doing' ? 'Fine della prova' : 'Chiudi il voto';
        default: return 'Avanti';
      }
    case 'result': return 'Tabellone';
    default: return 'Alla Tavola Rotonda';
  }
}

export function missionStageHtml(v, nameOf) {
  const st = v.step;
  const def = MISSIONS[st.id];
  if (st.stage === 'board') return boardHtml(v, nameOf);
  const head = `<p class="kicker">Missione del giorno ${v.day}</p><h1>${esc(def.title)}</h1>`;
  if (st.stage === 'intro') return head + introHtml(st, def, nameOf);
  if (st.stage === 'result') return head + resultHtml(st);
  return head + playHtml(st, nameOf);
}

function introHtml(st, def, nameOf) {
  const m = st.mission;
  let extra = '';
  if (st.id === 'chest') extra = `<p class="lead">Il castello sceglie: ${names(m.group, nameOf)}.</p>`;
  if (st.id === 'riddle') extra = `<p class="muted">${m.total} domande · vale la risposta della maggioranza</p>`;
  if (st.id === 'torches') extra = `<p class="muted">${m.rounds} torce · premio pieno sotto ${seconds(m.fullBelowMs)} di media</p>`;
  if (st.id === 'trial') extra = `<div class="trial-card"><h2>${esc(m.title)}</h2><p>${esc(m.text)}</p></div>`;
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
        const count = reveal ? `<span class="opt-count">${m.reveal.counts[i]}</span>` : '';
        return `<li class="${cls}"><span class="opt-letter">${LETTERS[i]}</span><span>${esc(o)}</span>${count}</li>`;
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
      if (m.sub === 'doing') {
        return `<div class="trial-card is-big"><h2>${esc(m.title)}</h2><p>${esc(m.text)}</p></div>`;
      }
      return `<p class="lead">La prova è riuscita? Votate dal telefono.</p>
        <div class="trial-card"><h2>${esc(m.title)}</h2></div>
        ${progress(m.votedCount, m.playerCount, 'hanno votato')}`;
    default:
      return '';
  }
}

function resultHtml(st) {
  const r = st.result;
  const d = r.detail;
  let detail = '';
  switch (st.id) {
    case 'chest':
      detail = d.leadCount === 0 ? 'Solo oro nel forziere.' : `${d.leadCount === 1 ? 'Un Piombo' : `${d.leadCount} Piombo`} nel forziere.`;
      break;
    case 'riddle':
      detail = `${d.correct} ${d.correct === 1 ? 'risposta giusta' : 'risposte giuste'} su ${d.total}.`;
      break;
    case 'torches':
      detail = `Media del gruppo: ${seconds(d.avgMs)}.`;
      break;
    case 'trial':
      detail = `${d.yes} dicono riuscita, ${d.no} fallita.`;
      break;
    default:
  }
  const verdict = r.coins > 0
    ? `<p class="coins-won">+${coins(r.coins)} <span>monete</span></p>`
    : `<p class="coins-lost">${st.id === 'chest' ? 'Il forziere resta vuoto' : 'Nessuna moneta'}</p>`;
  return `<div class="mission-result ${r.coins > 0 ? 'is-won' : 'is-lost'}">
      ${verdict}
      <p class="lead">${esc(detail)}</p>
      ${st.id === 'chest' && d.leadCount > 0 ? '<p class="muted">Chi ha messo il piombo? Il castello non lo dirà mai.</p>' : ''}
    </div>`;
}

// ---------------- Tabellone ----------------

export function boardHtml(v, nameOf) {
  const alive = v.players.filter((p) => p.status === 'alive');
  const banished = v.players.filter((p) => p.status === 'banished');
  const murdered = v.players.filter((p) => p.status === 'murdered');
  const col = (title, list, fmt) => `<section class="board-col"><h2>${title} <span class="count">${list.length}</span></h2>
    <ul>${list.map(fmt).join('') || '<li class="muted">Nessuno</li>'}</ul></section>`;
  const missions = v.missions.map((m) => `<li><span>Giorno ${m.day} · ${esc(MISSIONS[m.id].title)}</span><strong class="${m.coins ? '' : 'muted'}">${m.coins ? `+${coins(m.coins)}` : '0'}</strong></li>`).join('');
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
      <section class="board-col"><h2>Missioni</h2><ul class="board-missions">${missions || '<li class="muted">Ancora nessuna</li>'}</ul></section>
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
