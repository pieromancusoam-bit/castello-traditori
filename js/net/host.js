// Lato master: apre la stanza su PeerJS, accetta i telefoni, tiene il battito,
// tiene la partita (unica fonte di verità), salva tutto e lo riapre con "Riprendi".

import { NET } from '../config/net-config.js';
import { GAME } from '../config/game-config.js';
import { MSG, ERR, ACTIONS, isGameAction, isValidPhoto, validateMessage, makeMessage } from './protocol.js';
import { createGame, upgradeGame } from '../engine/state.js';
import { A } from '../engine/actions.js';
import { applyAction } from '../engine/reducer.js';
import { viewFor, viewForMaster } from '../engine/view.js';
import * as R from './roster.js';
import { generateRoomCode, peerIdFor } from './room-code.js';
import { createPeer, safeSend } from './peer-common.js';
import { local, KEYS } from '../platform/storage.js';
import { randomHex, cryptoRandom } from '../ui/dom.js';

// status: 'opening' | 'open' | 'reopening' | 'signal-lost' | 'error'
export class Host {
  constructor({ roomCode = null, peerServer = null, roster = null, game = null, photos = null, timer = null, resuming = false, onChange = () => {} }) {
    this.roomCode = roomCode || generateRoomCode(cryptoRandom);
    this.peerServer = peerServer;
    this.roster = roster ? R.markAllDisconnected(roster) : R.createRoster();
    this.resuming = resuming;
    this.onChange = onChange;
    this.game = upgradeGame(game); // stato completo della partita: non esce mai da qui
    this.timer = null; // { key, endsAt, handle }: orologio del timer della partita
    this.savedTimer = timer; // { key, endsAt } dal salvataggio: dopo "Riprendi" si riparte dal tempo rimasto
    this.photos = new Map(Object.entries(photos || {})); // playerId -> ritratto (data URL)

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
    this._syncTimer(); // dopo "Riprendi" a metà missione il timer riparte
    this._save();
  }

  // Chiude la stanza e dimentica il salvataggio
  close({ forget = true } = {}) {
    this.closed = true;
    clearInterval(this.beatTimer);
    clearTimeout(this.retryTimer);
    this._clearTimer();
    window.removeEventListener('pagehide', this._onUnload);
    if (this.peer) this.peer.destroy();
    if (forget) {
      local.remove(KEYS.room(this.roomCode));
      local.remove(KEYS.photos(this.roomCode));
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
    return R.publicList(this.roster).map((p) => ({
      ...p,
      hasPhoto: this.photos.has(p.id),
      wavedRecently: now - (this.waves.get(p.id) || 0) < 4000,
    }));
  }

  avatarOf(playerId) {
    const p = this.roster.players[playerId];
    return (p && p.avatar) || null;
  }

  photoOf(playerId) {
    return this.photos.get(playerId) || null;
  }

  // Sala d'attesa: toglie un giocatore disconnesso (es. chi se n'è andato prima dell'inizio).
  // Se poi rientra, ricompare come giocatore nuovo.
  removePlayer(playerId) {
    const p = this.roster.players[playerId];
    if (this.game || !p || p.connected) return false;
    const conn = this.conns.get(playerId);
    if (conn) {
      this.conns.delete(playerId);
      this.connToPlayer.delete(conn);
      try { conn.close(); } catch { /* già chiuso */ }
    }
    this.roster = R.remove(this.roster, playerId);
    this.waves.delete(playerId);
    if (this.photos.delete(playerId)) this._savePhotos();
    this._changed();
    return true;
  }

  // ---- Partita ----

  get canStart() {
    return !this.game && this.roster.order.length >= GAME.minPlayers;
  }

  // settings: impostazioni partita scelte nella sala d'attesa (mancanti = js/config/)
  startGame(settings = {}) {
    if (!this.canStart) return false;
    this.roster = { ...this.roster, locked: true };
    const players = this.roster.order.map((id) => ({ id, name: this.roster.players[id].name }));
    this.game = createGame({ players, seed: Math.floor(cryptoRandom() * 2 ** 32), settings });
    this._changed();
    return true;
  }

  // Azione del master (es. "Avanti"): { ok, error? }
  dispatch(action) {
    if (!this.game) return { ok: false, error: ERR.NO_GAME };
    return this._apply(action);
  }

  // Fine partita: si torna alla sala d'attesa con gli stessi giocatori
  backToLobby() {
    this.game = null;
    this._clearTimer();
    this.roster = { ...this.roster, locked: false };
    this._changed();
  }

  // Ciò che va sullo schermo condiviso (niente ruoli nascosti)
  masterView() {
    return this.game ? viewForMaster(this.game) : null;
  }

  _apply(action) {
    const res = applyAction(this.game, action);
    const rej = res.effects.find((e) => e.type === 'rejected');
    if (rej) return { ok: false, error: rej.reason };
    this.game = res.state;
    this._changed(); // effetto 'save' compreso: _changed salva sempre
    return { ok: true };
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

    const res = R.join(this.roster, msg, { newId: `p_${randomHex(4)}`, newToken: randomHex(16), now: Date.now(), rand: cryptoRandom() });
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
    const ack = (res) => safeSend(conn, makeMessage(MSG.ACK, { nonce: msg.nonce, ok: res.ok, ...(res.error ? { error: res.error } : {}) }));

    if (isGameAction(msg.type)) {
      if (!this.game) return ack({ ok: false, error: ERR.NO_GAME });
      // playerId viene dal canale, mai dal messaggio
      return ack(this._apply({ type: msg.type, playerId: pid, payload: msg.payload || {} }));
    }
    if (msg.type === ACTIONS.SET_PHOTO) {
      const data = msg.payload && msg.payload.data;
      if (!isValidPhoto(data)) return ack({ ok: false, error: ERR.INVALID_PHOTO });
      this.photos.set(pid, data);
      this._savePhotos();
      ack({ ok: true });
      return this._changed();
    }
    if (msg.type === ACTIONS.SET_AVATAR) {
      const res = R.setAvatar(this.roster, pid, msg.payload && msg.payload.avatar);
      if (res.error) return ack({ ok: false, error: res.error });
      this.roster = res.roster;
      ack({ ok: true });
      return this._changed();
    }
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
    this._syncTimer();
    for (const [pid, conn] of this.conns) safeSend(conn, makeMessage(MSG.VIEW, { view: this._viewFor(pid) }));
    this._save();
    this.onChange(this);
  }

  // ---- Timer ----
  // Il motore dice solo durata e chiave; qui gira l'orologio vero. Allo scadere si manda
  // TIMER_EXPIRED con la stessa chiave (una chiave vecchia viene ignorata dal motore).
  // Dopo "Riprendi" il timer in corso riparte dal tempo che restava (salvato con la partita).
  _syncTimer() {
    const t = this.game && this.game.phaseData && this.game.phaseData.timer;
    if (!t) return this._clearTimer();
    if (this.timer && this.timer.key === t.key) return;
    this._clearTimer();
    let ms = t.ms;
    const saved = this.savedTimer;
    if (saved && saved.key === t.key) ms = Math.min(t.ms, Math.max(NET.resumeTimerMinMs, saved.endsAt - Date.now()));
    this.savedTimer = null;
    const handle = setTimeout(() => {
      if (!this.closed) this.dispatch({ type: A.TIMER_EXPIRED, payload: { key: t.key } });
    }, ms);
    this.timer = { key: t.key, endsAt: Date.now() + ms, handle };
  }

  _clearTimer() {
    if (this.timer) clearTimeout(this.timer.handle);
    this.timer = null;
  }

  // Millisecondi rimasti al timer in corso (per il conto alla rovescia sullo schermo)
  timerLeft(key) {
    if (!this.timer || this.timer.key !== key) return null;
    return Math.max(0, this.timer.endsAt - Date.now());
  }

  // Vista per un telefono: stanza (Fase 0) + partita filtrata dal motore
  _viewFor(pid) {
    return {
      ...R.viewForPlayer(this.roster, this.roomCode, pid),
      hasPhoto: this.photos.has(pid),
      game: this.game ? viewFor(this.game, pid) : null,
      // Tempo rimasto al timer in corso: il telefono che rientra non riparte da capo
      timerLeft: this._timerLeftNow(),
    };
  }

  _timerLeftNow() {
    const t = this.game && this.game.phaseData && this.game.phaseData.timer;
    return t ? this.timerLeft(t.key) : null;
  }

  // Salvataggio automatico: stanza e partita a ogni cambiamento (lo stato è piccolo)
  _save() {
    local.set(KEYS.room(this.roomCode), {
      roomCode: this.roomCode,
      peerServer: this.peerServer,
      roster: this.roster,
      game: this.game,
      timer: this.timer ? { key: this.timer.key, endsAt: this.timer.endsAt } : null,
      savedAt: Date.now(),
    });
    local.set(KEYS.lastRoom, this.roomCode);
  }

  // I ritratti a parte: pesano di più e cambiano di rado
  _savePhotos() {
    local.set(KEYS.photos(this.roomCode), Object.fromEntries(this.photos));
  }
}

export function loadSavedRoom() {
  const code = local.get(KEYS.lastRoom);
  if (!code) return null;
  const saved = local.get(KEYS.room(code));
  if (!saved || saved.roomCode !== code) return null;
  return { ...saved, game: saved.game || null, photos: local.get(KEYS.photos(code), {}) };
}
