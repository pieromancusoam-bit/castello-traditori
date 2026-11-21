// Avvio della modalità master: Home -> Sala d'attesa.

import { Host, loadSavedRoom } from '../net/host.js';
import { peerAvailable } from '../net/peer-common.js';
import { parsePeerServer, formatPeerServer } from '../net/room-code.js';
import { local, KEYS } from '../platform/storage.js';
import { keepAwake, onWakeLockChange } from '../platform/wake-lock.js';
import { renderHome } from './home.js';
import { mountLobby } from './lobby.js';
import { errorText } from '../ui/messages.js';
import { esc } from '../ui/dom.js';

export function startMaster(root, { debug }) {
  if (!peerAvailable()) return renderFatal(root, 'browser-incompatible');

  let host = null;
  let update = () => {};

  function showHome() {
    renderHome(root, {
      saved: loadSavedRoom(),
      peerServerText: formatPeerServer(local.get(KEYS.peerServer)),
      onNew: () => openRoom(null),
      onResume: () => openRoom(loadSavedRoom()),
      onSaveServer: (text) => {
        if (!text.trim()) {
          local.remove(KEYS.peerServer);
          return true;
        }
        const ps = parsePeerServer(text);
        if (!ps) return false;
        local.set(KEYS.peerServer, ps);
        return true;
      },
    });
  }

  function openRoom(saved) {
    keepAwake(); // dentro il tocco dell'utente
    if (saved) {
      host = new Host({ roomCode: saved.roomCode, peerServer: saved.peerServer, roster: saved.roster, resuming: true, onChange: () => update() });
    } else {
      const prev = loadSavedRoom();
      if (prev) local.remove(KEYS.room(prev.roomCode));
      host = new Host({ peerServer: local.get(KEYS.peerServer), onChange: () => update() });
    }
    update = mountLobby(root, host, {
      debug,
      onClose: () => {
        host.close({ forget: true });
        host = null;
        update = () => {};
        showHome();
      },
    });
    host.start();
  }

  onWakeLockChange(() => update());
  showHome();
}

function renderFatal(root, code) {
  const e = errorText(code);
  root.innerHTML = `<section class="fatal"><h1>${esc(e.title)}</h1><p>${esc(e.text)}</p></section>`;
}
