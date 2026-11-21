// Avvio della modalità giocatore: nome -> collegamento -> sala d'attesa (con ritratto) -> partita.
// L'identità (codice stanza + token) resta nel browser per rientrare dopo un ricaricamento.

import { Client } from '../net/client.js';
import { peerAvailable } from '../net/peer-common.js';
import { ACTIONS } from '../net/protocol.js';
import { local, session, KEYS } from '../platform/storage.js';
import { keepAwake, wakeLockStatus, onWakeLockChange } from '../platform/wake-lock.js';
import { errorText } from '../ui/messages.js';
import { esc, on } from '../ui/dom.js';
import { fileToPortrait } from './photo.js';
import { createGameScreen } from './game.js';

const NAME_ERRORS = new Set(['NAME_REQUIRED', 'NAME_TAKEN']);

export function startPlayer(root, { roomCode, peerServer, newIdentity }) {
  if (!roomCode) return renderMessage(root, 'invalid-room');
  if (!peerAvailable()) return renderMessage(root, 'browser-incompatible');

  // &debug=nuovo: identità per scheda (sessionStorage), per simulare più giocatori
  const store = newIdentity ? session : local;
  const saved = store.get(KEYS.player);
  const sameRoom = saved && saved.roomCode === roomCode;
  const identity = sameRoom ? { token: saved.token, name: saved.name } : { name: saved?.name || '' };

  let client = null;
  let gameRender = null;
  let myPhoto = store.get(KEYS.myPhoto);
  let photoState = { sending: false, rejected: false, msg: '' };

  const saveIdentity = (id) => store.set(KEYS.player, { roomCode, token: id.token, name: id.name });

  function connect(name) {
    keepAwake(); // dentro il tocco dell'utente, quando possibile
    if (client) {
      client.rejoinWithName(name);
      return;
    }
    client = new Client({
      roomCode,
      peerServer,
      identity: { ...identity, name },
      saveIdentity,
      onChange: render,
    });
    client.start();
  }

  function render() {
    if (!client) return renderNameForm(root, { roomCode, name: identity.name, onSubmit: connect });
    if (client.phase === 'stopped' && NAME_ERRORS.has(client.errorCode)) {
      return renderNameForm(root, { roomCode, name: client.identity.name, error: client.errorCode, onSubmit: connect });
    }
    if (client.phase === 'joined' && client.view) {
      if (client.view.game) {
        if (!gameRender) gameRender = createGameScreen(root, client);
        return gameRender();
      }
      autoSendPhoto();
      return renderWaiting(root, client, myPhoto, photoState.msg);
    }
    return renderConnecting(root, client);
  }

  // Delegati una volta sola: le schermate si ridisegnano spesso
  on(root, '[data-act="wave"]', 'click', async (e, btn) => {
    btn.disabled = true;
    btn.textContent = 'Saluto inviato…';
    const res = await client.sendAction(ACTIONS.WAVE);
    btn.textContent = res.ok ? 'Il master ti ha visto!' : 'Non arrivato, riprova';
    setTimeout(() => render(), 1500);
  });
  on(root, '[data-act="retry"]', 'click', () => client && client.retryNow());

  // Ritratto: scatto (o scelta) -> piccolo JPEG -> master
  root.addEventListener('change', async (e) => {
    if (!e.target.matches('[data-act="photo-input"]')) return;
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    photoState.msg = 'Preparo il ritratto…';
    render();
    try {
      myPhoto = await fileToPortrait(file);
      store.set(KEYS.myPhoto, myPhoto);
      photoState.rejected = false;
      await sendPhoto();
    } catch {
      photoState.msg = 'Non riesco a usare questa foto. Riprova.';
      render();
    }
  });

  async function sendPhoto() {
    if (!client || !myPhoto || photoState.sending) return;
    photoState.sending = true;
    const res = await client.sendAction(ACTIONS.SET_PHOTO, { data: myPhoto });
    photoState.sending = false;
    if (res.ok) photoState.msg = 'Il tuo ritratto è appeso nel castello.';
    else {
      photoState.msg = 'Ritratto non arrivato al master.';
      if (res.error === 'INVALID_PHOTO') photoState.rejected = true;
    }
    render();
  }

  // Dopo un rientro il master potrebbe non avere il ritratto: lo rimanda da solo
  function autoSendPhoto() {
    if (myPhoto && !client.view.hasPhoto && !photoState.sending && !photoState.rejected) sendPhoto();
  }

  onWakeLockChange(() => client && client.phase === 'joined' && render());

  // Con un token salvato per questa stanza si rientra subito, senza chiedere il nome
  if (sameRoom && saved.token) connect(saved.name);
  else render();
}

function renderNameForm(root, { roomCode, name, error, onSubmit }) {
  const err = error ? errorText(error) : null;
  root.innerHTML = `
    <section class="player-screen player-join">
      <p class="eyebrow">Stanza ${esc(roomCode)}</p>
      <h1 class="title">Il Castello dei Traditori</h1>
      <form class="join-form">
        <label for="name">Il tuo nome</label>
        <input id="name" name="name" type="text" maxlength="16" autocomplete="nickname"
               autocapitalize="words" enterkeyhint="go" required value="${esc(name || '')}">
        ${err ? `<p class="form-error" role="alert"><strong>${esc(err.title)}.</strong> ${esc(err.text)}</p>` : ''}
        <button class="btn btn-primary btn-block" type="submit">Entra nel castello</button>
      </form>
    </section>`;
  const form = root.querySelector('form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = form.name.value.trim();
    if (value) onSubmit(value);
  });
  if (error) {
    form.name.focus();
    form.name.select();
  } else if (!name) {
    form.name.focus();
  }
}

function renderConnecting(root, client) {
  const err = client.errorCode ? errorText(client.errorCode) : null;
  const stopped = client.phase === 'stopped';
  const title = err ? err.title : client.phase === 'retrying' ? 'Mi ricollego…' : 'Entro nel castello…';
  root.innerHTML = `
    <section class="player-screen player-connecting">
      <p class="eyebrow">Stanza ${esc(client.roomCode)}</p>
      ${stopped ? '' : '<div class="spinner" aria-hidden="true"></div>'}
      <h1>${esc(title)}</h1>
      ${err ? `<p class="muted">${esc(err.text)}</p>` : ''}
      ${client.attempt > 0 ? `<p class="muted small">Tentativo ${client.attempt + 1}</p>` : ''}
      ${stopped ? '' : '<button class="btn btn-secondary btn-block" data-act="retry">Riprova ora</button>'}
    </section>`;
}

function renderWaiting(root, client, myPhoto, photoMsg) {
  const v = client.view;
  const wl = wakeLockStatus();
  const initials = v.me.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  root.innerHTML = `
    <section class="player-screen player-waiting">
      <p class="eyebrow">Stanza ${esc(v.roomCode)}</p>
      <h1>Benvenuto, ${esc(v.me.name)}</h1>
      <p class="big">Guarda lo schermo principale</p>
      <p class="muted">${v.connectedCount} ${v.connectedCount === 1 ? 'giocatore collegato' : 'giocatori collegati'}</p>
      <div class="my-portrait">
        <div class="mini-frame">${myPhoto ? `<img src="${esc(myPhoto)}" alt="Il tuo ritratto">` : `<span>${esc(initials)}</span>`}</div>
        <label class="btn btn-secondary btn-block">${myPhoto ? 'Cambia ritratto' : 'Scatta il tuo ritratto'}
          <input type="file" accept="image/*" capture="user" data-act="photo-input" hidden>
        </label>
        <p class="muted small">${esc(photoMsg || 'Facoltativo. La foto va solo allo schermo principale.')}</p>
      </div>
      <button class="btn btn-ghost btn-block" data-act="wave">Saluta il master</button>
      <footer class="conn-footer">
        <span class="dot on" aria-hidden="true"></span> Collegato
        · ${wl === 'active' ? 'schermo sempre acceso' : wl === 'unsupported' ? 'tieni lo schermo acceso' : 'blocco schermo non attivo'}
      </footer>
    </section>`;
}

function renderMessage(root, code) {
  const e = errorText(code);
  root.innerHTML = `<section class="player-screen fatal"><h1>${esc(e.title)}</h1><p>${esc(e.text)}</p></section>`;
}
