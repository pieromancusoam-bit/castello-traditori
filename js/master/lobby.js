// Sala d'attesa del master: QR, codice stanza, elenco live dei telefoni collegati.

import { esc, on } from '../ui/dom.js';
import { qrSvg } from '../ui/qr.js';
import { errorText } from '../ui/messages.js';
import { wakeLockStatus } from '../platform/wake-lock.js';
import { GAME } from '../config/game-config.js';

const STATUS_LABEL = {
  opening: 'Apro il castello…',
  open: 'Castello aperto',
  reopening: 'Riapro il castello…',
  'signal-lost': 'Servizio di aggancio perso',
  error: 'Problema',
};

// Monta la schermata e restituisce la funzione che la aggiorna
export function mountLobby(root, host, { debug, onClose }) {
  root.innerHTML = `
    <section class="master-lobby">
      <div class="lobby-join">
        <div class="qr" aria-hidden="false"></div>
        <p class="room-label">Codice stanza</p>
        <p class="room-code"></p>
        <p class="join-url"></p>
      </div>
      <div class="lobby-side">
        <div class="status-line" aria-live="polite"></div>
        <h2 class="players-title"></h2>
        <ul class="players"></ul>
        <button class="btn btn-primary btn-start" data-act="start"></button>
        <div class="lobby-footer">
          <span class="wake"></span>
          <button class="btn btn-small btn-ghost" data-act="retry" hidden>Riprova</button>
          <button class="btn btn-small btn-ghost" data-act="close">Chiudi stanza</button>
        </div>
      </div>
      ${debug ? '<pre class="debug-panel"></pre>' : ''}
    </section>`;

  const el = (s) => root.querySelector(s);
  let shownUrl = null;

  on(root, '[data-act="retry"]', 'click', () => host.retryNow());
  on(root, '[data-act="start"]', 'click', () => {
    const off = host.publicPlayers().filter((p) => !p.connected).length;
    if (off && !confirm(`${off} giocatori risultano disconnessi. Iniziare lo stesso?`)) return;
    host.startGame();
  });
  on(root, '[data-act="close"]', 'click', () => {
    if (confirm('Chiudere la stanza? I telefoni collegati verranno scollegati.')) onClose();
  });

  function update() {
    const url = host.joinUrl;
    if (url !== shownUrl) {
      shownUrl = url;
      el('.qr').innerHTML = qrSvg(url);
      el('.room-code').textContent = host.roomCode;
      el('.join-url').textContent = url.replace(/^https?:\/\//, '');
    }

    const err = host.errorCode && host.status !== 'open' ? errorText(host.errorCode) : null;
    el('.status-line').className = `status-line status-${host.status}`;
    el('.status-line').innerHTML = `<strong>${esc(STATUS_LABEL[host.status] || host.status)}</strong>` +
      (err ? `<span>${esc(err.text)}</span>` : '');
    el('[data-act="retry"]').hidden = host.status === 'open' || host.status === 'opening';

    const players = host.publicPlayers();
    const online = players.filter((p) => p.connected).length;
    el('.players-title').textContent = players.length
      ? `${online} ${online === 1 ? 'collegato' : 'collegati'} su ${players.length}`
      : 'In attesa dei giocatori…';
    el('.players').innerHTML = players.map((p) => `
      <li class="player ${p.connected ? 'is-on' : 'is-off'} ${p.wavedRecently ? 'is-waving' : ''}">
        <span class="dot" aria-hidden="true"></span>
        <span class="thumb">${host.photoOf(p.id) ? `<img src="${esc(host.photoOf(p.id))}" alt="">` : ''}</span>
        <span class="name">${esc(p.name)}</span>
        <span class="state">${p.wavedRecently ? 'saluta!' : p.connected ? 'collegato' : 'disconnesso'}</span>
      </li>`).join('');

    const start = el('[data-act="start"]');
    start.disabled = !host.canStart;
    start.textContent = host.canStart
      ? 'Inizia la partita'
      : `Servono almeno ${GAME.minPlayers} giocatori`;

    const wl = wakeLockStatus();
    el('.wake').textContent = wl === 'active' ? 'Schermo sempre acceso' : wl === 'unsupported' ? 'Schermo: blocco non supportato' : 'Schermo: blocco non attivo';

    // Pannello di debug: solo sul master, mai sui telefoni
    const dbg = el('.debug-panel');
    if (dbg) dbg.textContent = JSON.stringify({ status: host.status, errorCode: host.errorCode, roster: host.roster }, null, 2);
  }

  update();
  return update;
}
