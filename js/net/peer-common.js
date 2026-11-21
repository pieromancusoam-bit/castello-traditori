// Parti comuni a master e telefono per creare un peer PeerJS.
// PeerJS è caricato da /vendor con un <script> classico: espone window.Peer.

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

// Invio protetto: un canale appena chiuso non deve far cadere il gioco
export function safeSend(conn, msg) {
  try {
    if (conn && conn.open) {
      conn.send(msg);
      return true;
    }
  } catch { /* canale chiuso */ }
  return false;
}
