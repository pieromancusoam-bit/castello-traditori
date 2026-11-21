// Punto d'ingresso: dall'URL capisce se avviare il master o il giocatore.
//   /                 -> master
//   /?debug=1         -> master con pannello di debug
//   /?stanza=7K3Q     -> giocatore (il QR punta qui)
//   &debug=nuovo      -> giocatore con identità nuova (prove con più schede)
//   &ps=host:porta/p  -> server di aggancio personale (piano B)

import { normalizeRoomCode, parsePeerServer } from './net/room-code.js';
import { startMaster } from './master/master-app.js';
import { startPlayer } from './player/player-app.js';

const root = document.getElementById('app');
const params = new URLSearchParams(location.search);

// Una pagina ripristinata dalla cache "avanti/indietro" ha i collegamenti morti: ricarica
window.addEventListener('pageshow', (e) => {
  if (e.persisted) location.reload();
});

if (params.has('stanza')) {
  document.body.classList.add('mode-player');
  startPlayer(root, {
    roomCode: normalizeRoomCode(params.get('stanza')),
    peerServer: parsePeerServer(params.get('ps') || ''),
    newIdentity: params.get('debug') === 'nuovo',
  });
} else {
  document.body.classList.add('mode-master');
  startMaster(root, { debug: params.get('debug') === '1' });
}
