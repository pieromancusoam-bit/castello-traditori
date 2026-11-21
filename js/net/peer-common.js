// Parti comuni a master e telefono per creare un peer PeerJS.
// PeerJS è caricato da /vendor con un <script> classico: espone window.Peer.

import { NET } from '../config/net-config.js';

export function peerAvailable() {
  return typeof window.Peer === 'function' && typeof window.RTCPeerConnection === 'function';
}

// ps: server di aggancio personale { host, port, path } oppure null (PeerJS Cloud)
export function peerOptions(ps) {
  const opts = { debug: 1 };
  if (ps) {
    opts.host = ps.host;
    opts.port = ps.port;
    opts.path = ps.path || '/';
    // Da una pagina https il browser accetta solo connessioni sicure (wss)
    opts.secure = location.protocol === 'https:' || ps.port === 443;
  }
  return opts;
}

export function createPeer(id, ps) {
  const opts = peerOptions(ps);
  return id ? new window.Peer(id, opts) : new window.Peer(opts);
}

export const CONN_OPTIONS = { reliable: true, serialization: 'json' };

const encoder = new TextEncoder();

// Dimensione in byte di un messaggio come lo spedisce PeerJS (JSON in UTF-8)
export const messageBytes = (msg) => encoder.encode(JSON.stringify(msg)).byteLength;

// Invio protetto: un canale appena chiuso non deve far cadere il gioco.
// Un messaggio troppo grande non parte: PeerJS chiuderebbe il canale.
export function safeSend(conn, msg) {
  try {
    if (messageBytes(msg) > NET.messageMaxBytes) {
      console.warn(`Messaggio "${msg.t}" troppo grande, non inviato`);
      return false;
    }
    if (conn && conn.open) {
      conn.send(msg);
      return true;
    }
  } catch { /* canale chiuso */ }
  return false;
}
