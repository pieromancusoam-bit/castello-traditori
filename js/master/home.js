// Schermata Home del master: nuova stanza, riprendi, server di aggancio (piano B).

import { esc, on } from '../ui/dom.js';

// opts: { saved, peerServerText, onNew, onResume, onSaveServer(text) -> boolean }
export function renderHome(root, opts) {
  const { saved } = opts;
  const resume = saved
    ? `<button class="btn btn-secondary" data-act="resume">Riprendi stanza ${esc(saved.roomCode)}
         <small>${saved.roster.order.length} giocatori · ${esc(timeAgo(saved.savedAt))}</small></button>`
    : '';

  root.innerHTML = `
    <section class="master-home">
      <h1 class="title">Il Castello dei Traditori</h1>
      <p class="subtitle">Prototipo di connessione</p>
      <div class="home-actions">
        <button class="btn btn-primary" data-act="new">Nuova stanza</button>
        ${resume}
      </div>
      <details class="settings">
        <summary>Server di aggancio (piano B)</summary>
        <p>Lascia vuoto per usare il servizio gratuito PeerJS Cloud.
           Per un server personale scrivi <code>host:porta/percorso</code>.
           Da GitHub Pages serve un server raggiungibile in <code>https</code>.</p>
        <form data-act="server">
          <input name="ps" type="text" inputmode="url" autocomplete="off" spellcheck="false"
                 placeholder="es. 192.168.1.10:9000/castello" value="${esc(opts.peerServerText)}">
          <button class="btn btn-small" type="submit">Salva</button>
        </form>
        <p class="form-msg" aria-live="polite"></p>
      </details>
    </section>`;

  on(root, '[data-act="new"]', 'click', () => opts.onNew());
  on(root, '[data-act="resume"]', 'click', () => opts.onResume());
  root.querySelector('form[data-act="server"]').addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = opts.onSaveServer(e.target.ps.value);
    root.querySelector('.form-msg').textContent = ok
      ? (e.target.ps.value.trim() ? 'Salvato: le nuove stanze useranno questo server.' : 'Salvato: si usa PeerJS Cloud.')
      : 'Formato non valido. Esempio: 192.168.1.10:9000/castello';
  });
}

function timeAgo(ts) {
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 1) return 'adesso';
  if (min < 60) return `${min} min fa`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h} h fa` : `${Math.round(h / 24)} giorni fa`;
}
