// Schermate di gioco del telefono.
// Il telefono riceve solo la propria vista filtrata e manda solo azioni.

import { A, FINAL_CHOICES } from '../engine/actions.js';
import { esc, on } from '../ui/dom.js';
import { missionHtml } from './mission.js';
import { countdownHtml, runCountdown } from '../ui/countdown.js';
import { coins } from '../ui/format.js';
import { inventoryButtonHtml, inventoryHtml, itemHintHtml, giftHtml } from './inventory.js';
import { EVENTS } from '../config/game-config.js';

const FACTION = { faithfuls: 'Leale', traitors: 'Traditore' };
const FACTION_A = { faithfuls: 'un Leale', traitors: 'un Traditore' };
const SPECIAL_NAME = { seer: 'Veggente', knight: 'Cavaliere', secret_traitor: 'Traditore Segreto' };

// Monta i gestori una volta sola e restituisce render(), da chiamare a ogni vista nuova
export function createGameScreen(root, client) {
  const ui = {
    holding: false,      // carta del ruolo girata (tenendo premuto)
    roleSeenOnce: false, // il ruolo è stato guardato almeno una volta
    pending: null,       // scelta in attesa di conferma: { kind, value }
    stepKey: '',         // cambia a ogni nuova fase: azzera la conferma in sospeso
    error: '',
    busy: false,
    timer: null,         // { key, ms, start }: conto alla rovescia locale del timer del master
    torch: null,         // Le Torce: { key, round, phase: 'wait'|'lit'|'done', litAt, result, timers }
    inventory: false,    // pannello degli oggetti aperto
    vision: false,       // Veggente: griglia della visione aperta
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

  // ---- Timer: il telefono conta da quando riceve una chiave nuova ----
  // Il master manda anche il tempo rimasto: chi rientra a metà non riparte da capo
  function syncTimer(v) {
    const t = v.step && v.step.timer;
    if (!t) ui.timer = null;
    else if (!ui.timer || ui.timer.key !== t.key) {
      const left = client.view && Number.isFinite(client.view.timerLeft) ? client.view.timerLeft : t.ms;
      ui.timer = { key: t.key, ms: t.ms, start: Date.now() - Math.max(0, t.ms - left) };
    }
  }
  runCountdown(root, () => (ui.timer ? { left: ui.timer.ms - (Date.now() - ui.timer.start), total: ui.timer.ms } : null));

  // ---- Le Torce: il tempo di reazione si misura qui, sul telefono ----
  function stopTorch() {
    if (ui.torch) ui.torch.timers.forEach(clearTimeout);
  }
  function syncTorch(v) {
    const st = v.step;
    if (v.phase !== 'mission' || st.id !== 'torches' || st.stage !== 'play' || !st.mission.canTap) {
      if (ui.torch && ui.torch.phase !== 'done') {
        stopTorch();
        ui.torch = null;
      }
      return;
    }
    const m = st.mission;
    const key = `${v.day}|${m.round}`;
    if (ui.torch && ui.torch.key === key) return;
    stopTorch();
    const torch = { key, round: m.round, phase: 'wait', litAt: 0, result: null, timers: [] };
    ui.torch = torch;
    torch.timers.push(setTimeout(() => {
      if (ui.torch !== torch) return;
      torch.phase = 'lit';
      render();
      torch.litAt = performance.now();
      requestAnimationFrame(() => { torch.litAt = performance.now(); }); // dal momento in cui si vede
      torch.timers.push(setTimeout(() => tapTorch('miss'), m.litMs));
    }, m.delayMs));
  }
  function tapTorch(kind = 'tap') {
    const torch = ui.torch;
    if (!torch || torch.phase === 'done') return;
    let ms = null;
    const early = torch.phase === 'wait';
    if (early) torch.result = 'early';
    else if (kind === 'miss') torch.result = 'miss';
    else {
      ms = Math.round(performance.now() - torch.litAt);
      torch.result = ms;
    }
    torch.phase = 'done';
    stopTorch();
    send(A.MISSION_INPUT, early ? { round: torch.round, ms, early: true } : { round: torch.round, ms });
  }
  root.addEventListener('pointerdown', (e) => {
    if (e.target.closest('[data-torch]')) {
      e.preventDefault();
      tapTorch();
    }
  });

  // ---- Pulsanti ----
  on(root, '[data-act="seen"]', 'click', () => send(A.ROLE_SEEN));
  on(root, '[data-pick]', 'click', (e, btn) => {
    ui.pending = { kind: btn.dataset.kind, value: btn.dataset.pick };
    ui.error = '';
    render();
  });
  on(root, '[data-act="vision"]', 'click', () => {
    ui.vision = !ui.vision;
    ui.pending = null;
    render();
  });
  on(root, '[data-act="inventory"]', 'click', () => {
    ui.inventory = !ui.inventory;
    ui.pending = null;
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
    if (p.kind === 'chest') send(A.MISSION_INPUT, { choice: p.value });
    if (p.kind === 'trial') send(A.MISSION_INPUT, { ok: p.value === 'yes' });
    if (p.kind === 'chrono') send(A.MISSION_INPUT, { position: Number(p.value) });
    if (p.kind === 'messenger') send(A.MISSION_INPUT, { choice: Number(p.value) });
    if (p.kind === 'bridge') send(A.MISSION_INPUT, { choice: p.value });
    if (p.kind === 'letter') send(A.MISSION_INPUT, { open: p.value === 'open' });
    if (p.kind === 'offer') send(A.SEDUCTION_ANSWER, { accept: p.value === 'yes' });
    if (p.kind === 'vision') send(A.NIGHT_VISION, { targetId: p.value }).then(() => { ui.vision = false; render(); });
    if (p.kind === 'swap') send(A.NIGHT_SWAP, { targetId: p.value === 'keep' ? null : p.value });
    if (p.kind === 'scene') send(A.SCENE_TOUCH, { targetId: p.value });
    if (p.kind === 'item') send(A.USE_ITEM, { item: p.value });
    if (p.kind === 'curse') send(A.USE_ITEM, { item: 'curse', targetId: p.value }).then((res) => {
      if (res.ok) {
        ui.inventory = false;
        render();
      }
    });
  });
  // Catena della Memoria: il simbolo parte subito (c'è poco tempo)
  on(root, '[data-symbol]', 'click', (e, btn) => {
    if (!ui.busy) send(A.MISSION_INPUT, { symbol: Number(btn.dataset.symbol) });
  });
  // Prima notte con un solo Traditore: Assassinare o Sedurre
  on(root, '[data-plan]', 'click', (e, btn) => {
    if (!ui.busy) send(A.NIGHT_PLAN, { plan: btn.dataset.plan });
  });
  // Enigma: la risposta parte subito (c'è poco tempo)
  on(root, '[data-answer]', 'click', (e, btn) => {
    if (ui.busy) return;
    send(A.MISSION_INPUT, { index: Number(btn.dataset.index), answer: Number(btn.dataset.answer) });
  });
  root.addEventListener('submit', (e) => {
    if (!e.target.matches('[data-act="estimate"]')) return;
    e.preventDefault();
    const value = Number(e.target.querySelector('input').value);
    if (Number.isInteger(value) && value > 0) send(A.MISSION_INPUT, { value });
  });
  // Codice della Cripta e offerta dell'Asta
  root.addEventListener('submit', (e) => {
    if (e.target.matches('[data-act="crypt"]')) {
      e.preventDefault();
      const code = e.target.querySelector('input').value.trim();
      if (/^\d+$/.test(code)) send(A.MISSION_INPUT, { code });
    }
    if (e.target.matches('[data-act="auction"]')) {
      e.preventDefault();
      const bid = Number(e.target.querySelector('input').value);
      if (Number.isInteger(bid) && bid >= 0) send(A.MISSION_INPUT, { bid });
    }
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
    const m = v.step.mission || {};
    const key = `${v.phase}|${v.day}|${v.step.stage || ''}|${v.step.round || ''}|${m.sub || ''}|${m.index ?? ''}`;
    if (key !== ui.stepKey) {
      ui.stepKey = key;
      ui.pending = null;
      ui.error = '';
      ui.inventory = false; // fase nuova: si torna alla schermata di gioco
      ui.vision = false;
      if (v.phase === 'roles') ui.roleSeenOnce = false; // partita nuova: si guarda di nuovo il ruolo
    }
    syncTimer(v);
    syncTorch(v);

    // Il testo che si sta scrivendo in chat sopravvive al ridisegno
    const chatInput = root.querySelector('[data-act="chat"] input');
    const draft = chatInput ? chatInput.value : '';
    const hadFocus = chatInput && document.activeElement === chatInput;

    const night = v.phase === 'night';
    root.innerHTML = `
      <section class="player-screen game-screen phase-${esc(v.phase)} ${night ? 'is-night' : ''}">
        <header class="game-top">
          <span>${v.day ? `Giorno ${v.day}` : 'Il castello'}</span>
          <span class="top-pot">${coins(v.pot)} monete</span>
          <span>${esc(v.me.name)}${v.me.status !== 'alive' ? ' · spettatore' : ''}</span>
          ${night || v.me.status !== 'alive' ? '' : inventoryButtonHtml(v, ui)}
        </header>
        ${countdownHtml('phone-countdown')}
        <div class="game-main">${ui.inventory && !night ? inventoryHtml(v, ui, nameOf, confirmHtml) : withItems(v, ui, mainHtml(v, ui, nameOf))}</div>
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

// Oggetti nelle schermate di gioco: avviso se ce n'è uno da usare adesso, oggetto vinto
function withItems(v, ui, html) {
  if (v.phase === 'night' || v.phase === 'roles' || v.me.status !== 'alive') return html;
  const gift = v.phase === 'mission' && v.step.stage === 'result' ? giftHtml(v.step.myGift) : '';
  const p = ui.pending;
  const confirm = p && p.kind === 'item'
    ? confirmHtml(ui, `Usare <strong>${p.value === 'dagger' ? 'il Pugnale' : p.value === 'seal' ? 'il Sigillo' : 'lo Specchio'}</strong>? Non tornerà indietro.`)
    : '';
  return gift + itemHintHtml(v) + html + confirm;
}

// Maledetti di oggi e Sigilli usati (pubblici)
function cursesText(v, nameOf) {
  const out = [];
  for (const id of v.curses) out.push(id === v.me.id ? '<p class="curse-line">Sei <strong>maledetto</strong>: alla Tavola Rotonda di oggi non voti.</p>' : `<p class="curse-line"><strong>${esc(nameOf(id))}</strong> è maledetto: oggi non vota.</p>`);
  for (const id of v.sealed) out.push(`<p class="curse-line muted">${id === v.me.id ? 'Hai' : `<strong>${esc(nameOf(id))}</strong> ha`} spezzato la Maledizione con il Sigillo.</p>`);
  return out.join('');
}

function roleCardHtml(v, ui, small = false) {
  const traitor = v.me.faction === 'traitors';
  let face = '<span class="role-hint">Tieni premuto per vedere il tuo ruolo</span>';
  if (ui.holding) {
    const allies = traitor && v.allies && v.allies.length
      ? `<span class="role-allies">Complici: ${v.allies.map((a) => esc(a.name) + (a.status !== 'alive' ? ' (fuori)' : '')).join(', ')}</span>`
      : traitor ? '<span class="role-allies">Non conosci complici in gioco</span>' : '';
    const special = ROLE_TEXT[v.me.role];
    const vision = v.me.vision
      ? `<span class="role-allies">La tua visione: ${esc((v.players.find((p) => p.id === v.me.vision.targetId) || {}).name || '?')} è ${FACTION_A[v.me.vision.faction]}</span>`
      : '';
    face = special
      ? `<span class="role-name">Sei ${special.name}</span><span class="role-power">${special.text}</span>${allies}${vision}`
      : `<span class="role-name">Sei ${FACTION_A[v.me.faction]}</span>${allies}`;
  }
  return `<button type="button" class="role-card ${small ? 'is-small' : ''} ${ui.holding ? 'is-open' : ''} ${ui.holding && traitor ? 'is-traitor' : ''}" data-hold>${face}</button>`;
}

// Ruoli speciali: nome e potere sulla carta del ruolo
const ROLE_TEXT = {
  seer: { name: 'il Veggente', text: 'Sei Leale. Una volta per partita, di notte, scopri la fazione di un giocatore.' },
  knight: { name: 'il Cavaliere', text: 'Sei Leale. Parti con uno Scudo: ti salva da un omicidio.' },
  secret_traitor: { name: 'il Traditore Segreto', text: 'I Traditori non sanno chi sei. Una volta per partita puoi cambiare la loro vittima.' },
};

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
  const curses = v.phase === 'roundtable' ? cursesText(v, nameOf) : '';
  if (st.stage === 'discussion') {
    return `<h1>${title}</h1>${curses}<p class="big">Discutete: chi sono i Traditori?</p><p class="muted">Il voto si apre quando la clessidra è vuota.</p>`;
  }
  if (st.stage === 'results') {
    return `<h1>${title}</h1><p class="big">${outcomeText(st.outcome, nameOf)}</p><p class="muted">Guarda lo schermo principale.</p>`;
  }
  const head = `<h1>${st.round === 2 ? 'Ballottaggio' : title}</h1>${curses}`;
  if (v.me.status !== 'alive') return head + spectator();
  if (st.cursed) return `${head}<p class="muted">Gli altri stanno votando…</p>`;
  if (!st.canVote) return `${head}<p class="big">Hai votato ${esc(nameOf(st.myVote))}${st.dagger ? ', con il Pugnale' : ''}.</p><p class="muted">In attesa degli altri…</p>`;
  const intro = st.round === 2 ? '<p>Si vota solo tra i giocatori in parità.</p>' : '<p>Chi vuoi bandire dal castello?</p>';
  return head + intro + pickGrid(st.options, 'vote', ui, nameOf) +
    (ui.pending && ui.pending.kind === 'vote' ? confirmHtml(ui, `Votare <strong>${esc(nameOf(ui.pending.value))}</strong>?`) : '');
}

function nightHtml(v, ui, nameOf) {
  const st = v.step;
  if (v.me.status !== 'alive') return `<h1>La notte</h1><p class="muted">Il castello dorme.</p>`;
  // Offerta ricevuta (Seduzione o Ultimatum, anonima): accettare o rifiutare in segreto
  if (st.offer && st.offer.incoming) return offerHtml(v, ui);
  const turned = v.me.justTurned
    ? '<p class="turned">Il castello ti ha scelto: <strong>ora sei un Traditore</strong>. Agirai dalla prossima notte. Non dirlo a nessuno.</p>'
    : '';
  const rest = st.rest === 'banquet'
    ? '<p class="turned">Stanotte c\'è il Banchetto: nessuno morirà.</p>'
    : st.rest === 'daylight' ? '<p class="turned">Il sangue è già stato versato oggi: stanotte nessuno morirà.</p>' : '';
  const offering = st.killer && st.plan !== null && st.plan !== 'murder';
  // Stessa forma per tutti: titolo, griglia con lo stesso numero di nomi, conferma.
  // I Traditori scelgono chi colpire; gli altri indicano un sospetto (annunciato alla Colazione).
  const allyMarks = (id) => {
    if (!st.killer) return '';
    const who = st.allyPicks.filter((a) => a.targetId === id).map((a) => (a.id === v.me.id ? 'tu' : esc(nameOf(a.id))));
    return who.length ? `<small>${who.join(', ')}</small>` : '';
  };
  let mine = '';
  if (offering && st.offer) {
    mine = `<p class="big">${st.offer.kind === 'ultimatum' ? 'Ultimatum inviato' : 'Offerta inviata'} a ${esc(nameOf(st.offer.targetId))}.</p><p class="muted">Alla colazione saprai cosa ha risposto.</p>`;
  } else if (st.myChoice) {
    mine = st.killer
      ? `<p class="muted">La tua scelta: ${esc(nameOf(st.myChoice))} (puoi cambiarla)</p>`
      : `<p class="big">Hai indicato ${esc(nameOf(st.myChoice))}.</p><p class="muted">Torna a dormire: alla colazione il castello svelerà il più sospettato.</p>`;
  }
  let planBox = '';
  if (st.canSeduce || st.canUltimatum) {
    const btn = (plan, label) => `<button class="btn ${st.plan === plan ? 'btn-primary' : 'btn-ghost'}" data-plan="${plan}">${label}</button>`;
    planBox = `<div class="plan-toggle">${btn('murder', 'Assassinare')}${st.canSeduce ? btn('seduce', 'Sedurre') : ''}${st.canUltimatum ? btn('ultimatum', 'Ultimatum') : ''}</div>
      <p class="muted small">${st.canSeduce
    ? 'Sei l\'unico Traditore: stanotte puoi uccidere oppure offrire a un Leale di unirsi a te.'
    : 'Un complice è stato bandito: stanotte potete offrire a un Leale di unirsi a voi. Se rifiuta, sarà lui la vittima.'}</p>`;
  }
  const question = st.plan === 'seduce'
    ? '<p>Chi vuoi sedurre?</p>'
    : st.plan === 'ultimatum' ? '<p>A chi offrire l\'Ultimatum? Dovete indicare tutti lo stesso nome.</p>'
    : st.killer ? '<p>Chi colpire stanotte?</p>'
    : '<p>Di chi sospetti?</p><p class="muted small">Nessuno saprà che l\'hai indicato tu.</p>';
  // Chat e accordo servono a chi uccide insieme ad altri (non a chi seduce, non a chi è solo)
  let killerBox = '';
  if (st.killer && st.plan !== 'seduce' && st.allyPicks.length > 1) killerBox = consensusHtml(st, nameOf) + chatHtml(v, st, nameOf, true);
  const canPick = offering ? !st.offer : !st.myChoice || st.killer;
  const p = ui.pending;
  let confirm = '';
  if (p && p.kind === 'night') {
    confirm = confirmHtml(ui, st.plan === 'seduce'
      ? `Sedurre <strong>${esc(nameOf(p.value))}</strong>? Non potrai cambiare.`
      : st.plan === 'ultimatum' ? `Ultimatum a <strong>${esc(nameOf(p.value))}</strong>?`
      : st.killer ? `Colpire <strong>${esc(nameOf(p.value))}</strong>?`
      : `Sospettare di <strong>${esc(nameOf(p.value))}</strong>?`);
  }
  if (p && p.kind === 'vision') confirm = confirmHtml(ui, `Scrutare <strong>${esc(nameOf(p.value))}</strong>? Hai una sola visione per partita.`);
  if (p && p.kind === 'swap') confirm = confirmHtml(ui, p.value === 'keep' ? 'Lasciare la vittima scelta dai Traditori?' : `Cambiare la vittima con <strong>${esc(nameOf(p.value))}</strong>? Puoi farlo una sola volta.`);
  const grid = ui.vision ? '' : `${canPick ? question : ''}
    ${canPick ? pickGrid(st.options, 'night', ui, nameOf, allyMarks, st.disabled) : ''}
    ${mine}`;
  const vision = v.me.vision
    ? `<p class="muted small">La tua visione: ${esc(nameOf(v.me.vision.targetId))} è ${FACTION_A[v.me.vision.faction]}.</p>`
    : '';
  return `<h1>La notte</h1>${turned}${rest}${planBox}${vision}
    ${seerHtml(v, ui, nameOf)}
    ${grid}
    ${confirm}
    ${killerBox}
    ${secretHtml(v, ui, nameOf)}`;
}

function offerHtml(v, ui) {
  const st = v.step;
  const ultimatum = st.offer.kind === 'ultimatum';
  if (st.offer.answer === true) {
    const inGame = (v.allies || []).filter((a) => a.status === 'alive');
    const allies = inGame.length ? ` I tuoi complici: <strong>${inGame.map((a) => esc(a.name)).join(', ')}</strong>.` : '';
    return `<h1>La notte</h1><p class="turned">Hai accettato: <strong>ora sei un Traditore</strong>.${allies} Ucciderete insieme dalla prossima notte. Non dirlo a nessuno.</p>`;
  }
  if (st.offer.answer === false) {
    return ultimatum
      ? '<h1>La notte</h1><p class="big">Hai rifiutato. Resti Leale fino alla fine.</p><p class="muted">I Traditori non perdonano: all\'alba lo saprai.</p>'
      : '<h1>La notte</h1><p class="big">Hai rifiutato l\'offerta. Resti Leale.</p><p class="muted">Torna a dormire.</p>';
  }
  let label = '';
  if (ui.pending) {
    if (ui.pending.value === 'yes') label = '<strong>Accettare</strong> e diventare Traditore?';
    else label = ultimatum ? '<strong>Rifiutare</strong>? Stanotte la vittima sarai tu.' : '<strong>Rifiutare</strong> e restare Leale?';
  }
  const text = ultimatum
    ? '<p class="big">Ultimatum: i Traditori ti offrono di unirti a loro.</p><p class="muted">Se accetti diventi Traditore. <strong>Se rifiuti, stanotte la vittima sarai tu.</strong></p>'
    : '<p class="big">I Traditori ti offrono di unirti a loro.</p><p class="muted">Se accetti diventi Traditore. Se rifiuti resti Leale, e nessuno saprà dell\'offerta.</p>';
  return `<h1>La notte</h1>
    <div class="offer ${ultimatum ? 'is-ultimatum' : ''}">${text}</div>
    <div class="final-choices">
      <button class="btn btn-primary btn-block" data-pick="yes" data-kind="offer">Accetto</button>
      <button class="btn btn-secondary btn-block" data-pick="no" data-kind="offer">Rifiuto</button>
    </div>
    ${ui.pending ? confirmHtml(ui, label) : ''}`;
}

function consensusHtml(st, nameOf) {
  return st.consensus
    ? `<p class="consensus">Accordo raggiunto: <strong>${esc(nameOf(st.consensus))}</strong></p>`
    : '<p class="muted small">I Traditori devono indicare tutti lo stesso nome.</p>';
}

// Chat dei Traditori; il Traditore Segreto la legge soltanto
function chatHtml(v, st, nameOf, canWrite) {
  const msgs = st.chat.map((m) => `<li><strong>${m.from === v.me.id ? 'Tu' : esc(nameOf(m.from))}:</strong> ${esc(m.text)}</li>`).join('');
  const form = canWrite
    ? `<form class="chat-form" data-act="chat" autocomplete="off">
        <input type="text" maxlength="200" placeholder="Scrivi ai complici…" enterkeyhint="send">
        <button class="btn btn-small btn-secondary" type="submit">Invia</button>
      </form>`
    : '';
  return `<div class="chat"><ul class="chat-log">${msgs || '<li class="muted">Nessun messaggio.</li>'}</ul>${form}</div>`;
}

// Veggente: la visione (una per partita), prima del sospetto
function seerHtml(v, ui, nameOf) {
  const st = v.step;
  if (!st.canVision) return '';
  if (!ui.vision) {
    return `<p class="seer-box"><button class="btn btn-secondary btn-small" data-act="vision">Usa la tua visione</button>
      <span class="muted small">Una sola volta per partita: scopri la fazione di un giocatore.</span></p>`;
  }
  return `<p>Chi vuoi scrutare? <button class="btn btn-ghost btn-small" data-act="vision">Non ora</button></p>${pickGrid(st.options, 'vision', ui, nameOf)}`;
}

// Traditore Segreto: osserva i Traditori e, ad accordo raggiunto, può cambiare la vittima
function secretHtml(v, ui, nameOf) {
  const sec = v.step.secret;
  if (!sec || !v.step.allyPicks) return '';
  const st = v.step;
  const picks = st.allyPicks.map((a) => `<li>${esc(nameOf(a.id))} ➜ ${a.targetId ? esc(nameOf(a.targetId)) : '…'}</li>`).join('');
  let action = '';
  if (sec.plan && sec.plan !== 'murder') action = '<p class="muted small">Stanotte i Traditori fanno un\'offerta: niente da cambiare.</p>';
  else if (sec.swap) action = `<p class="turned">Hai cambiato la vittima: <strong>${esc(nameOf(sec.swap))}</strong>.</p>`;
  else if (sec.canSwap && st.consensus) {
    action = `<p>Vittima scelta: <strong>${esc(nameOf(st.consensus))}</strong>. Vuoi cambiarla? (una volta per partita)</p>
      ${pickGrid(sec.swapOptions, 'swap', ui, nameOf)}
      <button class="btn btn-ghost btn-block" data-pick="keep" data-kind="swap">Lascia la loro scelta</button>`;
  } else if (sec.canSwap) action = '<p class="muted small">Quando si accorderanno potrai cambiare la vittima, una sola volta per partita.</p>';
  else if (sec.swapUsed) action = '<p class="muted small">Hai già usato il tuo potere.</p>';
  return `<div class="secret-box"><h2>Gli altri Traditori</h2><p class="muted small">Non sanno chi sei. Leggi, ma non puoi scrivere.</p>
    <ul class="ally-picks">${picks}</ul>${consensusHtml(st, nameOf)}${chatHtml(v, st, nameOf, false)}${action}</div>`;
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
    case 'choice-reveal':
      return `<h1>${title}</h1><p class="big">Il castello rivela le scelte.</p><p class="muted">Guarda lo schermo principale.</p>`;
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
      return `<h1>Colazione</h1><p class="big">Guarda lo schermo principale.</p>${st.failed ? '<p class="turned">Stanotte i Traditori hanno colpito… ma l\'omicidio è fallito.</p>' : ''}${seductionText(v, nameOf)}${suspectsText(st.suspects, nameOf)}${cursesText(v, nameOf)}${eventText(v)}`;
    case 'scene':
      return sceneHtml(v, ui, nameOf);
    case 'dusk':
      if (st.victimId === v.me.id) return `<h1>Il tramonto</h1><p class="big">Sei stato assassinato alla luce del giorno.</p>${spectator()}`;
      return `<h1>Il tramonto</h1><p class="big">${st.reason === 'murdered' ? `${esc(nameOf(st.victimId))} è stato ucciso alla luce del giorno.` : 'Nessuno è caduto al tramonto.'}</p><p class="muted">Guarda lo schermo principale.</p>`;
    case 'presentations':
      return st.mine
        ? `<p class="kicker">Presentazioni</p><h1>Tocca a te!</h1><div class="trial-card"><h2>${esc(st.theme)}</h2></div><p class="muted">Hai il tempo della clessidra.</p>`
        : `<p class="kicker">Presentazioni</p><h1>${esc(nameOf(st.playerId))}</h1><p class="big">${esc(st.theme)}</p>${st.next === v.me.id ? '<p class="turned">Dopo tocca a te: preparati!</p>' : ''}`;
    case 'mission':
      return missionHtml(v, ui, nameOf, confirmHtml);
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
        ${prizeText(v)}
        <ul class="final-list">${v.players.map((p) => `<li><span>${esc(p.name)}</span><span class="tag-${p.faction}">${SPECIAL_NAME[p.role] || FACTION[p.faction] || ''}</span></li>`).join('')}</ul>`;
    }
    default:
      return '';
  }
}

// Montepremi a fine partita: la propria quota, se si è tra i vincitori sopravvissuti
function prizeText(v) {
  const pr = v.prize;
  if (!pr) return '';
  if (pr.winners.includes(v.me.id)) {
    return pr.pot ? `<p class="coins-won">+${coins(pr.share)} <span>monete</span></p>` : '<p class="muted">Montepremi vuoto: vinci per la gloria.</p>';
  }
  return `<p class="muted">Montepremi: ${coins(pr.pot)} monete ai vincitori sopravvissuti.</p>`;
}

// Evento del giorno (alla Colazione); al Traditore designato anche il suo compito
function eventText(v) {
  const ev = v.event;
  if (!ev || ev.cancelled) return '';
  const def = EVENTS[ev.id];
  const extra = ev.id === 'doubleStakes' ? ` Tocca al gioco n. ${ev.slot}.` : '';
  const killer = v.step.daylightKiller
    ? '<p class="turned">Oggi tocca a te: durante la scena tocca la tua vittima. Morirà al tramonto.</p>'
    : '';
  return `<div class="event-box"><p class="kicker">Evento: ${esc(def.name)}</p><p>${esc(def.text + extra)}</p></div>${killer}`;
}

// Omicidio a vista: la stessa griglia per tutti; solo il tocco del Traditore designato conta
function sceneHtml(v, ui, nameOf) {
  const st = v.step;
  const head = '<p class="kicker">Omicidio a vista</p><h1>La scena</h1>';
  if (v.me.status !== 'alive') return head + spectator();
  if (st.myTouch) return `${head}<p class="big">Hai toccato ${esc(nameOf(st.myTouch))}.</p><p class="muted">Guarda lo schermo principale.</p>`;
  const intro = st.killer
    ? '<p>Tocca la tua vittima. Nessuno vedrà il tuo dito: tutti toccano un nome.</p>'
    : '<p>Tocca un nome qualsiasi, così nessuno si tradisce. Il tuo tocco non uccide.</p>';
  return head + intro + pickGrid(st.options, 'scene', ui, nameOf, () => '', st.disabled)
    + (ui.pending && ui.pending.kind === 'scene' ? confirmHtml(ui, `Toccare <strong>${esc(nameOf(ui.pending.value))}</strong>?`) : '');
}

// Esito della Seduzione: solo a chi ha sedotto (il sedotto lo sa già)
function seductionText(v, nameOf) {
  const sd = v.step.seduction;
  if (!sd || sd.targetId === v.me.id) return '';
  if (sd.kind === 'ultimatum') {
    return sd.accepted
      ? `<p class="turned">${esc(nameOf(sd.targetId))} ha accettato l'Ultimatum: è dei vostri.</p>`
      : `<p class="turned">${esc(nameOf(sd.targetId))} ha rifiutato l'Ultimatum, e l'ha pagata.</p>`;
  }
  return sd.accepted
    ? `<p class="turned">${esc(nameOf(sd.targetId))} ha accettato: ora siete in due.</p>`
    : `<p class="turned">${esc(nameOf(sd.targetId))} ha rifiutato la tua offerta.</p>`;
}
