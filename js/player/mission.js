// Schermate del telefono durante la missione. Il telefono vede solo le proprie scelte
// e i risultati aggregati. Oro/Piombo e il voto della prova chiedono conferma.

import { esc } from '../ui/dom.js';
import { coins, seconds, LETTERS } from '../ui/format.js';
import { MISSIONS } from '../config/missions.js';

const watch = '<p class="muted">Guarda lo schermo principale.</p>';

export function missionHtml(v, ui, nameOf, confirmHtml) {
  const st = v.step;
  const def = MISSIONS[st.id];
  const m = st.mission;
  const alive = v.me.status === 'alive';
  const head = `<p class="kicker">Missione</p><h1>${esc(def.title)}</h1>`;

  if (st.stage === 'intro') {
    let mine = '';
    if (st.id === 'chest') mine = m.inGroup ? '<p class="big">Sei nel gruppo del forziere.</p>' : '<p class="big">Non sei nel gruppo: osserva bene chi sceglie.</p>';
    if (st.id === 'trial') mine = `<div class="trial-card"><h2>${esc(m.title)}</h2><p>${esc(m.text)}</p></div>`;
    return `${head}<p>${esc(def.playerRules)}</p>${mine}<p class="stake">In palio ${coins(st.value)} monete</p>${watch}`;
  }
  if (st.stage === 'result') return head + resultHtml(st, def);
  if (st.stage === 'board') return `<h1>Tabellone</h1><p class="big">Montepremi: ${coins(v.pot)} monete</p>${watch}`;
  if (!alive) return `${head}<p class="muted">Sei fuori dal gioco: segui la missione sullo schermo principale.</p>`;

  switch (st.id) {
    case 'chest': return head + chestHtml(m, ui, confirmHtml);
    case 'riddle': return head + riddleHtml(m, ui);
    case 'torches': return head + torchHtml(m, ui);
    case 'trial': return head + trialHtml(m, ui, confirmHtml);
    default: return head;
  }
}

function chestHtml(m, ui, confirmHtml) {
  if (!m.inGroup) return '<p class="big">Il gruppo sta scegliendo…</p><p class="muted">Non sei nel gruppo del forziere.</p>';
  if (!m.canChoose) {
    return `<p class="big">Hai messo ${m.myChoice === 'lead' ? 'Piombo' : 'Oro'} nel forziere.</p><p class="muted">Nessuno saprà cosa hai scelto.</p>`;
  }
  const label = ui.pending && (ui.pending.value === 'lead' ? 'Mettere <strong>Piombo</strong>?' : 'Mettere <strong>Oro</strong>?');
  return `<p>Scegli in segreto. Con ${m.leadToFail} Piombo il forziere resta vuoto.</p>
    <div class="chest-choices">
      <button class="btn coin coin-gold ${ui.pending?.value === 'gold' ? 'is-pending' : ''}" data-pick="gold" data-kind="chest">Oro</button>
      <button class="btn coin coin-lead ${ui.pending?.value === 'lead' ? 'is-pending' : ''}" data-pick="lead" data-kind="chest">Piombo</button>
    </div>
    ${ui.pending ? confirmHtml(ui, label) : ''}`;
}

function riddleHtml(m, ui) {
  const reveal = m.sub === 'reveal';
  const opts = m.options.map((o, i) => {
    let cls = '';
    if (reveal) cls = i === m.correctIndex ? 'is-right' : i === m.myAnswer ? 'is-wrong' : 'is-dim';
    else if (m.myAnswer === i) cls = 'is-mine';
    const dis = !m.canAnswer || ui.busy ? 'disabled' : '';
    return `<button class="btn option ${cls}" data-answer="${i}" data-index="${m.index}" ${dis}><span class="opt-letter">${LETTERS[i]}</span>${esc(o)}</button>`;
  }).join('');
  let foot = '';
  if (reveal) {
    const mine = m.myAnswer === null ? 'Non hai risposto.' : m.myAnswer === m.correctIndex ? 'Hai risposto giusto!' : 'Hai sbagliato.';
    const group = m.reveal.groupAnswer === null ? 'Nessuna maggioranza.' : m.reveal.correct ? 'Il gruppo ha indovinato.' : 'Il gruppo ha sbagliato.';
    foot = `<p class="big">${mine}</p><p class="muted">${group}</p>`;
  } else if (!m.canAnswer && m.myAnswer !== null) {
    foot = '<p class="muted">Risposta inviata. In attesa degli altri…</p>';
  }
  return `<p class="q-index">Domanda ${m.index + 1} di ${m.total}</p>
    <p class="question">${esc(m.text)}</p>
    <div class="options">${opts}</div>${foot}`;
}

function torchHtml(m, ui) {
  const t = ui.torch;
  const round = `<p class="q-index">Torcia ${m.round + 1} di ${m.rounds}</p>`;
  const last = m.myTimes.length ? m.myTimes.at(-1) : undefined;
  const lastText = last === undefined ? '' : last === null ? 'Torcia precedente: mancata.' : `Torcia precedente: ${seconds(last)}`;
  if (!t || t.phase === 'done') {
    let msg = 'In attesa degli altri…';
    if (t && t.result === 'early') msg = 'Troppo presto! Torcia persa.';
    else if (t && t.result === 'miss') msg = 'Troppo tardi: la torcia si è spenta.';
    else if (t && typeof t.result === 'number') msg = `${seconds(t.result)}`;
    return `${round}<div class="torch-pad is-done"><div class="torch"><span class="torch-stick"></span></div></div>
      <p class="big">${msg}</p><p class="muted">Aspetta la prossima torcia.</p>`;
  }
  const lit = t.phase === 'lit';
  return `${round}
    <button class="torch-pad ${lit ? 'is-lit' : 'is-wait'}" data-torch aria-label="${lit ? 'Tocca ora!' : 'Aspetta'}">
      <div class="torch ${lit ? 'is-lit' : ''}"><span class="torch-flame"></span><span class="torch-stick"></span></div>
      <span class="torch-label">${lit ? 'TOCCA!' : 'Aspetta la fiamma…'}</span>
    </button>
    <p class="muted small">${esc(lastText)}</p>`;
}

function trialHtml(m, ui, confirmHtml) {
  const card = `<div class="trial-card"><h2>${esc(m.title)}</h2><p>${esc(m.text)}</p></div>`;
  if (m.sub === 'doing') return `${card}<p class="big">Fate la prova insieme!</p>`;
  if (!m.canVote) return `${card}<p class="big">Hai votato: ${m.myVote ? 'riuscita' : 'fallita'}.</p><p class="muted">In attesa degli altri…</p>`;
  const label = ui.pending && (ui.pending.value === 'yes' ? 'La prova è <strong>riuscita</strong>?' : 'La prova è <strong>fallita</strong>?');
  return `${card}<p>La prova è riuscita?</p>
    <div class="final-choices">
      <button class="btn btn-secondary btn-block" data-pick="yes" data-kind="trial">Riuscita</button>
      <button class="btn btn-primary btn-block" data-pick="no" data-kind="trial">Fallita</button>
    </div>
    ${ui.pending ? confirmHtml(ui, label) : ''}`;
}

function resultHtml(st, def) {
  const r = st.result;
  const d = r.detail;
  const lines = {
    chest: () => (d.leadCount === 0 ? 'Solo oro nel forziere.' : `${d.leadCount} Piombo nel forziere.`),
    riddle: () => `${d.correct} risposte giuste su ${d.total}.`,
    torches: () => `Media del gruppo: ${seconds(d.avgMs)}.`,
    trial: () => `${d.yes} riuscita, ${d.no} fallita.`,
  };
  const won = r.coins > 0 ? `<p class="coins-won">+${coins(r.coins)} <span>monete</span></p>` : '<p class="coins-lost">Nessuna moneta</p>';
  return `${won}<p class="big">${esc(lines[st.id] ? lines[st.id]() : '')}</p>${watch}`;
}
