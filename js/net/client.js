// Lato telefono: si collega al master, si presenta con nome o token,
// risponde al battito e si ricollega da solo se il canale cade.

import { NET } from '../config/net-config.js';
import { MSG, ERR, validateMessage, makeMessage } from './protocol.js';
import { peerIdFor } from './room-code.js';
import { createPeer, safeSend, CONN_OPTIONS } from './peer-common.js';
import { randomHex } from '../ui/dom.js';

// Errori del master dopo i quali non ha senso riprovare da soli
const STOP_ERRORS = new Set([ERR.NAME_REQUIRED, ERR.NAME_TAKEN, ERR.ROOM_FULL, ERR.GAME_STARTED]);

// phase: 'idle' | 'connecting' | 'joined' | 'retrying' | 'stopped'
export class Client {
  // identity: { token?, name } — store: oggetto storage per salvare l'identità
  constructor({ roomCode, peerServer, identity, saveIdentity, onChange = () => {} }) {
    this.roomCode = roomCode;
    this.peerServer = peerServer;
    this.identity = { ...identity };
    this.saveIdentity = saveIdentity;
    this.onChange = onChange;

    this.phase = 'idle';
    this.errorCode = null;
    this.view = null;
    this.playerId = null;
    this.attempt = 0;
    this.lastHeardAt = 0;
    this.everJoined = false;

    this.gen = 0; // generazione del tentativo: gli eventi dei tentativi vecchi si ignorano
    this.peer = null;
    this.conn = null;
    this.timers = {};
    this.pendingAcks = new Map();
  }

  start() {
    this._connect();
    this.timers.watch = setInterval(() => this._watchdog(), 1000);
    this._onVisible = () => {
      if (document.visibilityState === 'visible' && this.phase === 'retrying') this.retryNow();
    };
    document.addEventListener('visibilitychange', this._onVisible);
    this._onUnload = () => this.peer && this.peer.destroy();
    window.addEventListener('pagehide', this._onUnload);
  }

  stop() {
    this.gen++;
    Object.values(this.timers).forEach((t) => { clearTimeout(t); clearInterval(t); });
    document.removeEventListener('visibilitychange', this._onVisible);
    window.removeEventListener('pagehide', this._onUnload);
    this._teardown();
  }

  retryNow() {
    clearTimeout(this.timers.retry);
    this.attempt = 0;
    this._connect();
  }

  // Ripresenta il giocatore con un nome nuovo (es. dopo "Nome già preso")
  rejoinWithName(name) {
    this.identity = { ...this.identity, name };
    this.retryNow();
  }

  // Invia un'azione; la promessa si risolve con l'ack del master
  sendAction(type, payload) {
    const nonce = randomHex(6);
    const sent = safeSend(this.conn, makeMessage(MSG.ACTION, { type, payload, nonce }));
    if (!sent) return Promise.resolve({ ok: false, error: 'not-connected' });
    return new Promise((resolve) => {
      this.pendingAcks.set(nonce, resolve);
      setTimeout(() => {
        if (this.pendingAcks.delete(nonce)) resolve({ ok: false, error: 'timeout' });
      }, 5000);
    });
  }

  // ---- interno ----

  _set(fields) {
    Object.assign(this, fields);
    this.onChange(this);
  }

  _teardown() {
    clearTimeout(this.timers.connect);
    const { peer } = this;
    this.peer = null;
    this.conn = null;
    if (peer && !peer.destroyed) {
      try { peer.destroy(); } catch { /* niente */ }
    }
  }

  _connect() {
    this._teardown();
    const gen = ++this.gen;
    const alive = () => gen === this.gen;
    this._set({ phase: this.everJoined ? 'retrying' : 'connecting' });

    let peer;
    try {
      peer = createPeer(null, this.peerServer);
    } catch {
      return this._lost('browser-incompatible', gen);
    }
    this.peer = peer;

    // Se entro il tempo il canale non è aperto, probabile rete che isola i dispositivi
    this.timers.connect = setTimeout(() => {
      if (alive()) this._lost(peer.open ? 'timeout' : 'network', gen);
    }, NET.connectTimeoutMs);

    peer.on('open', () => {
      if (!alive()) return;
      const conn = peer.connect(peerIdFor(this.roomCode), CONN_OPTIONS);
      this.conn = conn;
      conn.on('open', () => {
        if (!alive()) return;
        this.lastHeardAt = Date.now();
        safeSend(conn, makeMessage(MSG.HELLO, { token: this.identity.token, name: this.identity.name }));
      });
      conn.on('data', (raw) => alive() && this._onData(raw, gen));
      conn.on('close', () => alive() && this._lost('closed', gen));
      conn.on('error', () => alive() && this._lost('closed', gen));
    });
    peer.on('error', (err) => alive() && this._lost((err && err.type) || 'network', gen));
    peer.on('disconnected', () => {
      // Perso solo il server di aggancio: se siamo già dentro, il canale col master resta
      if (alive() && this.phase !== 'joined') this._lost('network', gen);
    });
  }

  _onData(raw, gen) {
    if (!validateMessage(raw, 'master').ok) return;
    this.lastHeardAt = Date.now();

    switch (raw.t) {
      case MSG.WELCOME:
        clearTimeout(this.timers.connect);
        this.identity = { ...this.identity, token: raw.token };
        this.saveIdentity(this.identity);
        this.attempt = 0;
        this.everJoined = true;
        this._set({ phase: 'joined', errorCode: null, playerId: raw.playerId });
        break;
      case MSG.VIEW:
        this._set({ view: raw.view });
        break;
      case MSG.PING:
        safeSend(this.conn, makeMessage(MSG.PONG, { n: raw.n }));
        break;
      case MSG.ACK: {
        const resolve = this.pendingAcks.get(raw.nonce);
        if (resolve) {
          this.pendingAcks.delete(raw.nonce);
          resolve({ ok: raw.ok, error: raw.error });
        }
        break;
      }
      case MSG.ERROR:
        if (STOP_ERRORS.has(raw.code)) {
          this.gen++;
          this._teardown();
          this._set({ phase: 'stopped', errorCode: raw.code });
        } else {
          this._lost(raw.code, gen);
        }
        break;
      default:
        break;
    }
  }

  // Battito: se il master tace per 3 battiti, il canale è morto anche se non lo dice
  _watchdog() {
    if (this.phase !== 'joined') return;
    if (Date.now() - this.lastHeardAt > NET.heartbeatMs * NET.missedBeatsForDisconnect) {
      this._lost('heartbeat-lost', this.gen);
    }
  }

  _lost(reason, gen) {
    if (gen !== this.gen) return;
    this.gen++; // ignora gli altri eventi di questo tentativo
    this._teardown();
    if (reason === 'browser-incompatible') {
      return this._set({ phase: 'stopped', errorCode: reason });
    }
    const delays = NET.reconnectDelaysMs;
    const delay = delays[Math.min(this.attempt, delays.length - 1)];
    this.attempt++;
    this._set({ phase: 'retrying', errorCode: reason, nextRetryAt: Date.now() + delay });
    clearTimeout(this.timers.retry);
    this.timers.retry = setTimeout(() => this._connect(), delay);
  }
}
