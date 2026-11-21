// Schermate di gioco del telefono (Fase 1: semplici, solo testo).
// Il telefono riceve solo la propria vista filtrata e manda solo azioni.

import { A, FINAL_CHOICES } from '../engine/actions.js';
import { esc, on } from '../ui/dom.js';

const FACTION = { faithfuls: 'Leale', traitors: 'Traditore' };
const FACTION_A = { faithfuls: 'un Leale', traitors: 'un Traditore' };

// Monta i gestori una volta sola e restituisce render(), da chiamare a ogni vista nuova
export function createGameScreen(root, client) {
  const ui = {
    holding: false,      // carta del ruolo girata (tenendo premuto)
    roleSeenOnce: false, // il ruolo è stato guardato almeno una volta
    pending: null,       // scelta in attesa di conferma: { kind, value }
    stepKey: '',         // cambia a ogni nuova fase: azzera la conferma in sospeso
    error: '',
    busy: false,
  };

  const view = () => client.view && client.view.game;
  const nameOf = (id) => {
    const p = view().players.find((x) => x.id === id);
    return p ? p.name : '?';
  };

  async function send(type, payload) {
    ui.busy = true;
    ui.error = '';
    render();
    const res = await client.sendAction(type, payload);
    ui.busy = false;
    ui.pending = null;
    if (!res.ok) ui.error = res.error === 'not-connected' || res.error === 'timeout'
      ? 'Non arrivato al master: riprova.'
      : 'Azione non valida in questo momento.';
    render();
    return res;
  }

  // ---- Carta del ruolo: si gira solo tenendo premuto ----
  // Si aggiorna solo la carta (non tutta la schermata): l'elemento sotto il dito resta lo stesso
  function refreshCards() {
    const v = view();
    if (!v) return;
    for (const card of root.querySelectorAll('[data-hold]')) {
      const tmp = document.createElement('div');
      tmp.innerHTML = roleCardHtml(v, ui, card.classList.contains('is-small'));
      const fresh = tmp.firstElementChild;
      card.className = fresh.className;
      card.innerHTML = fresh.innerHTML;
    }
    const seen = root.querySelector('[data-act="seen"]');
    if (seen && ui.roleSeenOnce && !ui.busy) seen.disabled = false;
  }
  root.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('[data-hold]')) return;
    ui.holding = true;
    ui.roleSeenOnce = true;
    refreshCards();
  });
  const release = () => {
    if (!ui.holding) return;
    ui.holding = false;
    refreshCards();
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('blur', release);
  root.addEventListener('contextmenu', (e) => {
    if (e.target.closest('[data-hold]')) e.preventDefault();
  });

  // ---- Pulsanti ----
  on(root, '[data-act="seen"]', 'click', () => send(A.ROLE_SEEN));
  on(root, '[data-pick]', 'click', (e, btn) => {
    ui.pending = { kind: btn.dataset.kind, value: btn.dataset.pick };
    ui.error = '';
    render();
  });
  on(root, '[data-act="cancel"]', 'click', () => {
    ui.pending = null;
    render();
  });
  on(root, '[data-act="confirm"]', 'click', () => {
    const p = ui.pending;
    if (!p || ui.busy) return;
    if (p.kind === 'vote') send(A.VOTE, { targetId: p.value });
    if (p.kind === 'night') send(A.NIGHT_CHOOSE, { targetId: p.value });
    if (p.kind === 'final') send(A.FINAL_CHOICE, { choice: p.value });
  });
  root.addEventListener('submit', async (e) => {
    if (!e.target.matches('[data-act="chat"]')) return;
    e.preventDefault();
    const input = e.target.querySelector('input');
    const text = input.value.trim();
    if (!text) return;
    const res = await send(A.NIGHT_CHAT, { text });
    if (res.ok) {
      const fresh = root.querySelector('[data-act="chat"] input');
      if (fresh) fresh.value = '';
    }
  });

  function render() {
    const v = view();
    if (!v) return;
    const key = `${v.phase}|${v.day}|${v.step.stage || ''}|${v.step.round || ''}`;
    if (key !== ui.stepKey) {
      ui.stepKey = key;
      ui.pending = null;
      ui.error = '';
      if (v.phase === 'roles') ui.roleSeenOnce = false; // partita nuova: si guarda di nuovo il ruolo
    }

    // Il testo che si sta scrivendo in chat sopravvive al ridisegno
    const chatInput = root.querySelector('[data-act="chat"] input');
    const draft = chatInput ? chatInput.value : '';
    const hadFocus = chatInput && document.activeElement === chatInput;

    const night = v.phase === 'night';
    root.innerHTML = `
      <section class="player-screen game-screen phase-${esc(v.phase)} ${night ? 'is-night' : ''}">
        <header class="game-top">
          <span>${v.day ? `Giorno ${v.day}` : 'Il castello'}</span>
          <span>${esc(v.me.name)}${v.me.status !== 'alive' ? ' · spettatore' : ''}</span>
        </header>
        <div class="game-main">${mainHtml(v, ui, nameOf)}</div>
        ${ui.error ? `<p class="form-error" role="alert">${esc(ui.error)}</p>` : ''}
        ${v.phase === 'roles' ? '' : roleCardHtml(v, ui, true)}
      </section>`;

    const newInput = root.querySelector('[data-act="chat"] input');
    if (newInput) {
      newInput.value = draft;
      if (hadFocus) newInput.focus();
    }
    const log = root.querySelector('.chat-log');
    if (log) log.scrollTop = log.scrollHeight;
  }

  return render;
}

// ---------------- Pezzi di schermata ----------------

function roleCardHtml(v, ui, small = false) {
  const traitor = v.me.faction === 'traitors';
  let face = '<span class="role-hint">Tieni premuto per vedere il tuo ruolo</span>';
  if (ui.holding) {
    const allies = traitor && v.allies && v.allies.length
      ? `<span class="role-allies">Complici: ${v.allies.map((a) => esc(a.name) + (a.status !== 'alive' ? ' (fuori)' : '')).join(', ')}</span>`
      : traitor ? '<span class="role-allies">Nessun complice in gioco</span>' : '';
    face = `<span class="role-name">Sei ${FACTION_A[v.me.faction]}</span>${allies}`;
  }
  return `<button type="button" class="role-card ${small ? 'is-small' : ''} ${ui.holding ? 'is-open' : ''} ${ui.holding && traitor ? 'is-traitor' : ''}" data-hold>${face}</button>`;
}

function confirmHtml(ui, label) {
  return `
    <div class="confirm-bar" role="dialog" aria-label="Conferma">
      <p>${label}</p>
      <div class="confirm-actions">
        <button class="btn btn-ghost" data-act="cancel" ${ui.busy ? 'disabled' : ''}>Annulla</button>
        <button class="btn btn-primary" data-act="confirm" ${ui.busy ? 'disabled' : ''}>Conferma</button>
      </div>
    </div>`;
}

function pickGrid(options, kind, ui, nameOf, extra = () => '', disabled = []) {
  return `<div class="pick-grid">${options.map((id) => disabled.includes(id)
    ? `<button class="btn pick is-ally" disabled>${esc(nameOf(id))}<small>complice</small></button>`
    : `<button class="btn pick ${ui.pending && ui.pending.value === id ? 'is-pending' : ''}" data-pick="${esc(id)}" data-kind="${kind}">
      ${esc(nameOf(id))}${extra(id)}
    </button>`).join('')}</div>`;
}

// "Il castello sospetta di …" (alla Colazione)
function suspectsText(ids, nameOf) {
  if (!ids || !ids.length) return '';
  const names = ids.map((id) => `<strong>${esc(nameOf(id))}</strong>`);
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} e ${names.at(-1)}`;
  return `<p class="suspects">Stanotte il castello sospetta di ${list}.</p>`;
}

const spectator = () => '<p class="muted">Sei fuori dal gioco: segui la partita sullo schermo principale.</p>';

function outcomeText(o, nameOf) {
  if (!o) return '';
  if (o.kind === 'banish') return `${esc(nameOf(o.playerId))} viene bandito.`;
  if (o.kind === 'runoff') return `Parità tra ${o.candidates.map((id) => esc(nameOf(id))).join(' e ')}: si va al ballottaggio.`;
  return o.reason === 'tie' ? 'Ancora parità: nessuno lascia il castello.' : 'Nessun voto: nessuno lascia il castello.';
}

function voteHtml(v, ui, nameOf, title) {
  const st = v.step;
  if (st.stage === 'results') {
    return `<h1>${title}</h1><p class="big">${outcomeText(st.outcome, nameOf)}</p><p class="muted">Guarda lo schermo principale.</p>`;
  }
  const head = `<h1>${st.round === 2 ? 'Ballottaggio' : title}</h1>`;
  if (v.me.status !== 'alive') return head + spectator();
  if (!st.canVote) return `${head}<p class="big">Hai votato ${esc(nameOf(st.myVote))}.</p><p class="muted">In attesa degli altri…</p>`;
  const intro = st.round === 2 ? '<p>Si vota solo tra i giocatori in parità.</p>' : '<p>Chi vuoi bandire dal castello?</p>';
  return head + intro + pickGrid(st.options, 'vote', ui, nameOf) +
    (ui.pending ? confirmHtml(ui, `Votare <strong>${esc(nameOf(ui.pending.value))}</strong>?`) : '');
}

function nightHtml(v, ui, nameOf) {
  const st = v.step;
  if (v.me.status !== 'alive') return `<h1>La notte</h1><p class="muted">Il castello dorme.</p>`;
  const turned = v.me.justTurned
    ? '<p class="turned">Il castello ti ha scelto: <strong>ora sei un Traditore</strong>. Agirai dalla prossima notte. Non dirlo a nessuno.</p>'
    : '';
  // Stessa forma per tutti: titolo, griglia con lo stesso numero di nomi, conferma.
  // I Traditori scelgono chi colpire; gli altri indicano un sospetto (annunciato alla Colazione).
  const allyMarks = (id) => {
    if (!st.killer) return '';
    const who = st.allyPicks.filter((a) => a.targetId === id).map((a) => (a.id === v.me.id ? 'tu' : esc(nameOf(a.id))));
    return who.length ? `<small>${who.join(', ')}</small>` : '';
  };
  let mine = '';
  if (st.myChoice) {
    mine = st.killer
      ? `<p class="muted">La tua scelta: ${esc(nameOf(st.myChoice))} (puoi cambiarla)</p>`
      : `<p class="big">Hai indicato ${esc(nameOf(st.myChoice))}.</p><p class="muted">Torna a dormire: alla colazione il castello svelerà il più sospettato.</p>`;
  }
  const question = st.killer
    ? '<p>Chi colpire stanotte?</p>'
    : '<p>Di chi sospetti?</p><p class="muted small">Nessuno saprà che l\'hai indicato tu.</p>';
  let killerBox = '';
  if (st.killer) {
    const consensus = st.consensus
      ? `<p class="consensus">Accordo raggiunto: <strong>${esc(nameOf(st.consensus))}</strong></p>`
      : '<p class="muted small">Dovete indicare tutti lo stesso nome.</p>';
    const msgs = st.chat.map((m) => `<li><strong>${m.from === v.me.id ? 'Tu' : esc(nameOf(m.from))}:</strong> ${esc(m.text)}</li>`).join('');
    killerBox = `
      ${consensus}
      <div class="chat">
        <ul class="chat-log">${msgs || '<li class="muted">Nessun messaggio.</li>'}</ul>
        <form class="chat-form" data-act="chat" autocomplete="off">
          <input type="text" maxlength="200" placeholder="Scrivi ai complici…" enterkeyhint="send">
          <button class="btn btn-small btn-secondary" type="submit">Invia</button>
        </form>
      </div>`;
  }
  const canPick = !st.myChoice || st.killer;
  const confirmLabel = ui.pending && (st.killer
    ? `Colpire <strong>${esc(nameOf(ui.pending.value))}</strong>?`
    : `Sospettare di <strong>${esc(nameOf(ui.pending.value))}</strong>?`);
  return `<h1>La notte</h1>${turned}${canPick ? question : ''}
    ${canPick ? pickGrid(st.options, 'night', ui, nameOf, allyMarks, st.disabled) : ''}
    ${mine}
    ${ui.pending ? confirmHtml(ui, confirmLabel) : ''}
    ${killerBox}`;
}

function finalHtml(v, ui, nameOf) {
  const st = v.step;
  const title = 'Cerimonia delle Polveri';
  switch (st.stage) {
    case 'choice': {
      if (v.me.status !== 'alive') return `<h1>${title}</h1>${spectator()}`;
      if (!st.canChoose) {
        return `<h1>${title}</h1><p class="big">Hai scelto: ${st.myChoice === FINAL_CHOICES.END ? 'chiudere la partita' : 'bandire ancora'}.</p><p class="muted">In attesa degli altri…</p>`;
      }
      const label = ui.pending && (ui.pending.value === FINAL_CHOICES.END ? 'Chiudere la partita' : 'Bandire ancora');
      return `<h1>${title}</h1><p>Scegli in segreto.</p>
        <div class="final-choices">
          <button class="btn btn-secondary btn-block" data-pick="${FINAL_CHOICES.END}" data-kind="final">Chiudere la partita</button>
          <button class="btn btn-primary btn-block" data-pick="${FINAL_CHOICES.BANISH}" data-kind="final">Bandire ancora</button>
        </div>
        ${ui.pending ? confirmHtml(ui, `<strong>${label}</strong>?`) : ''}`;
    }
    case 'voting':
    case 'results':
      return voteHtml(v, ui, nameOf, title);
    case 'reveal':
      return revealHtml(v, nameOf);
    case 'unveil':
      return `<h1>${title}</h1><p class="big">Le ultime maschere cadono.</p><p class="muted">Guarda lo schermo principale.</p>`;
    default:
      return '';
  }
}

function revealHtml(v, nameOf) {
  const st = v.step;
  if (st.playerId === v.me.id) {
    return `<h1>Sei stato bandito</h1><p class="big">Il castello ora sa che eri ${FACTION_A[st.faction]}.</p>${spectator()}`;
  }
  return `<h1>${esc(nameOf(st.playerId))}</h1><p class="big">era ${FACTION_A[st.faction]}.</p>`;
}

function mainHtml(v, ui, nameOf) {
  const st = v.step;
  switch (v.phase) {
    case 'roles':
      return `<h1>Il tuo ruolo</h1>
        ${roleCardHtml(v, ui)}
        ${st.seen
          ? '<p class="muted">In attesa degli altri…</p>'
          : `<button class="btn btn-primary btn-block" data-act="seen" ${ui.roleSeenOnce && !ui.busy ? '' : 'disabled'}>Ho visto</button>
             <p class="muted small">Copri lo schermo dagli sguardi altrui.</p>`}`;
    case 'breakfast':
      if (st.victimId === v.me.id) {
        return `<h1>Colazione</h1><p class="big">Stanotte sei stato assassinato.</p>${spectator()}`;
      }
      return `<h1>Colazione</h1><p class="big">Guarda lo schermo principale.</p>${suspectsText(st.suspects, nameOf)}`;
    case 'roundtable':
      return voteHtml(v, ui, nameOf, 'Tavola Rotonda');
    case 'reveal':
      return revealHtml(v, nameOf);
    case 'night':
      return nightHtml(v, ui, nameOf);
    case 'final':
      return finalHtml(v, ui, nameOf);
    case 'ended': {
      const won = v.winner === v.me.faction;
      return `<h1>${v.winner === 'traitors' ? 'Vincono i Traditori' : 'Vincono i Leali'}</h1>
        <p class="big">${won ? 'Hai vinto!' : 'Hai perso.'}</p>
        <ul class="final-list">${v.players.map((p) => `<li><span>${esc(p.name)}</span><span class="tag-${p.faction}">${FACTION[p.faction] || ''}</span></li>`).join('')}</ul>`;
    }
    default:
      return '';
  }
}
