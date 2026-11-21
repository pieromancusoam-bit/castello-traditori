// Lato master: apre la stanza su PeerJS, accetta i telefoni, tiene il battito,
// salva la stanza e la riapre con "Riprendi".

import { NET } from '../config/net-config.js';
import { MSG, ERR, ACTIONS, validateMessage, makeMessage } from './protocol.js';
import * as R from './roster.js';
import { generateRoomCode, peerIdFor } from './room-code.js';
import { createPeer, safeSend } from './peer-common.js';
import { local, KEYS } from '../platform/storage.js';
import { randomHex, cryptoRandom } from '../ui/dom.js';

// status: 'opening' | 'open' | 'reopening' | 'signal-lost' | 'error'
export class Host {
  constructor({ roomCode = null, peerServer = null, roster = null, resuming = false, onChange = () => {} }) {
    this.roomCode = roomCode || generateRoomCode(cryptoRandom);
    this.peerServer = peerServer;
    this.roster = roster ? R.markAllDisconnected(roster) : R.createRoster();
    this.resuming = resuming;
    this.onChange = onChange;

    this.status = 'opening';
    this.errorCode = null;
    this.peer = null;
    this.everOpened = false;
    this.conns = new Map(); // playerId -> DataConnection
    this.connToPlayer = new Map(); // DataConnection -> playerId
    this.waves = new Map(); // playerId -> istante dell'ultimo saluto
    this.idWaitStarted = 0;
    this.signalAttempt = 0;
    this.retryTimer = null;
    this.beatTimer = null;
    this.beatN = 0;
    this.closed = false;
  }

  start() {
    this._createPeer();
    this.beatTimer = setInterval(() => this._heartbeat(), NET.heartbeatMs);
    // Libera subito l'ID su PeerJS quando la pagina si chiude o si ricarica
    this._onUnload = () => this.peer && this.peer.destroy();
    window.addEventListener('pagehide', this._onUnload);
    this._save();
  }

  // Chiude la stanza e dimentica il salvataggio
  close({ forget = true } = {}) {
    this.closed = true;
    clearInterval(this.beatTimer);
    clearTimeout(this.retryTimer);
    window.removeEventListener('pagehide', this._onUnload);
    if (this.peer) this.peer.destroy();
    if (forget) {
      local.remove(KEYS.room(this.roomCode));
      if (local.get(KEYS.lastRoom) === this.roomCode) local.remove(KEYS.lastRoom);
    }
  }

  retryNow() {
    clearTimeout(this.retryTimer);
    this.idWaitStarted = 0;
    this.signalAttempt = 0;
    this._replacePeer();
  }

  get joinUrl() {
    const url = new URL(location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('stanza', this.roomCode);
    if (this.peerServer) {
      url.searchParams.set('ps', `${this.peerServer.host}:${this.peerServer.port}${this.peerServer.path || '/'}`);
    }
    return url.toString();
  }

  publicPlayers() {
    const now = Date.now();
    return R.publicList(this.roster).map((p) => ({ ...p, wavedRecently: now - (this.waves.get(p.id) || 0) < 4000 }));
  }

  // ---- Peer e server di aggancio ----

  _setStatus(status, errorCode = null) {
    this.status = status;
    this.errorCode = errorCode;
    this.onChange(this);
  }

  _createPeer() {
    const peer = createPeer(peerIdFor(this.roomCode), this.peerServer);
    this.peer = peer;
    peer.on('open', () => {
      if (peer !== this.peer) return;
      this.everOpened = true;
      this.resuming = true; // da qui in poi l'ID è "nostro": se cade, si riprende lo stesso
      this.idWaitStarted = 0;
      this.signalAttempt = 0;
      this._setStatus('open');
    });
    peer.on('connection', (conn) => {
      if (peer === this.peer) this._acceptConnection(conn);
    });
    peer.on('disconnected', () => {
      // Perso il server di aggancio: i canali già aperti con i telefoni restano vivi
      if (peer !== this.peer || this.closed || peer.destroyed) return;
      this._setStatus('signal-lost', 'network');
      this._scheduleSignalRetry();
    });
    peer.on('error', (err) => {
      if (peer !== this.peer || this.closed) return;
      this._onPeerError(err);
    });
  }

  _onPeerError(err) {
    const type = err && err.type;
    if (type === 'browser-incompatible') return this._setStatus('error', type);
    if (type === 'peer-unavailable') return; // non riguarda il master

    if (type === 'unavailable-id') {
      if (!this.resuming) {
        // Stanza nuova con codice già in uso da qualcun altro: ne scegliamo un altro
        local.remove(KEYS.room(this.roomCode));
        this.roomCode = generateRoomCode(cryptoRandom);
        this._save();
        return this._replacePeer();
      }
      if (!this.idWaitStarted) this.idWaitStarted = Date.now();
      if (Date.now() - this.idWaitStarted > NET.resumeIdMaxWaitMs) {
        return this._setStatus('error', 'id-stuck');
      }
      this._setStatus('reopening', 'unavailable-id');
      clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(() => this._replacePeer(), NET.resumeIdRetryMs);
      return;
    }

    // network, server-error, socket-error, socket-closed, ...
    this._setStatus('signal-lost', type === 'server-error' ? 'server-error' : 'network');
    this._scheduleSignalRetry();
  }

  _scheduleSignalRetry() {
    clearTimeout(this.retryTimer);
    const delays = NET.signalRetryDelaysMs;
    const delay = delays[Math.min(this.signalAttempt, delays.length - 1)];
    this.signalAttempt++;
    this.retryTimer = setTimeout(() => {
      if (this.closed) return;
      const p = this.peer;
      if (p && !p.destroyed && p.disconnected) {
        try { p.reconnect(); } catch { this._replacePeer(); }
      } else if (!p || p.destroyed) {
        this._replacePeer();
      }
    }, delay);
  }

  _replacePeer() {
    if (this.closed) return;
    const old = this.peer;
    this.peer = null;
    if (old && !old.destroyed) old.destroy();
    this._setStatus(this.resuming ? 'reopening' : 'opening', this.errorCode);
    this._createPeer();
  }

  // ---- Telefoni ----

  _acceptConnection(conn) {
    conn.on('data', (raw) => this._onData(conn, raw));
    conn.on('close', () => this._onConnClosed(conn));
    conn.on('error', () => this._onConnClosed(conn));
  }

  _onConnClosed(conn) {
    const pid = this.connToPlayer.get(conn);
    this.connToPlayer.delete(conn);
    if (pid && this.conns.get(pid) === conn) {
      this.conns.delete(pid);
      this.roster = R.markDisconnected(this.roster, pid);
      this._changed();
    }
  }

  _onData(conn, raw) {
    if (!validateMessage(raw, 'player').ok) {
      safeSend(conn, makeMessage(MSG.ERROR, { code: ERR.INVALID_MESSAGE }));
      return;
    }
    if (raw.t === MSG.HELLO) return this._onHello(conn, raw);

    const pid = this.connToPlayer.get(conn);
    if (!pid) {
      safeSend(conn, makeMessage(MSG.ERROR, { code: ERR.NOT_JOINED }));
      return;
    }
    const wasConnected = this.roster.players[pid]?.connected;
    this.roster = R.markSeen(this.roster, pid, Date.now());
    if (!wasConnected) this._changed();

    if (raw.t === MSG.PING) safeSend(conn, makeMessage(MSG.PONG, { n: raw.n }));
    if (raw.t === MSG.ACTION) this._onAction(conn, pid, raw);
  }

  _onHello(conn, msg) {
    const known = this.connToPlayer.get(conn);
    if (known) return; // già presentato su questo canale

    const res = R.join(this.roster, msg, { newId: `p_${randomHex(4)}`, newToken: randomHex(16), now: Date.now() });
    if (res.error) {
      safeSend(conn, makeMessage(MSG.ERROR, { code: res.error }));
      return;
    }
    this.roster = res.roster;

    // Un canale vecchio dello stesso giocatore (es. prima del ricaricamento) va chiuso
    const old = this.conns.get(res.playerId);
    if (old && old !== conn) {
      this.connToPlayer.delete(old);
      try { old.close(); } catch { /* già chiuso */ }
    }
    this.conns.set(res.playerId, conn);
    this.connToPlayer.set(conn, res.playerId);

    safeSend(conn, makeMessage(MSG.WELCOME, { playerId: res.playerId, token: res.token }));
    this._changed();
  }

  _onAction(conn, pid, msg) {
    if (msg.type === ACTIONS.WAVE) {
      this.waves.set(pid, Date.now());
      safeSend(conn, makeMessage(MSG.ACK, { nonce: msg.nonce, ok: true }));
      this.onChange(this);
      setTimeout(() => this.onChange(this), 4100); // spegne il saluto a schermo
      return;
    }
    safeSend(conn, makeMessage(MSG.ACK, { nonce: msg.nonce, ok: false, error: ERR.UNKNOWN_ACTION }));
  }

  // Battito: ping a tutti, e chi tace troppo diventa "disconnesso"
  _heartbeat() {
    this.beatN++;
    for (const conn of this.conns.values()) safeSend(conn, makeMessage(MSG.PING, { n: this.beatN }));
    const { roster, dropped } = R.sweep(this.roster, Date.now(), NET.heartbeatMs * NET.missedBeatsForDisconnect);
    if (dropped.length) {
      this.roster = roster;
      for (const pid of dropped) {
        const conn = this.conns.get(pid);
        if (conn) {
          this.conns.delete(pid);
          this.connToPlayer.delete(conn);
          try { conn.close(); } catch { /* già chiuso */ }
        }
      }
      this._changed();
    }
  }

  // Lo stato è cambiato: viste nuove a tutti, salvataggio, schermo del master
  _changed() {
    for (const [pid, conn] of this.conns) {
      safeSend(conn, makeMessage(MSG.VIEW, { view: R.viewForPlayer(this.roster, this.roomCode, pid) }));
    }
    this._save();
    this.onChange(this);
  }

  _save() {
    local.set(KEYS.room(this.roomCode), {
      roomCode: this.roomCode,
      peerServer: this.peerServer,
      roster: this.roster,
      savedAt: Date.now(),
    });
    local.set(KEYS.lastRoom, this.roomCode);
  }
}

export function loadSavedRoom() {
  const code = local.get(KEYS.lastRoom);
  if (!code) return null;
  const saved = local.get(KEYS.room(code));
  return saved && saved.roomCode === code ? saved : null;
}
