// Protocollo master <-> telefono: tipi di messaggio e validazione.
// Ogni messaggio è un oggetto JSON con il campo `t`.

import { NET } from '../config/net-config.js';
import { PLAYER_ACTIONS } from '../engine/actions.js';

export const MSG = Object.freeze({
  HELLO: 'hello',     // telefono -> master
  WELCOME: 'welcome', // master -> telefono
  VIEW: 'view',       // master -> telefono
  ACTION: 'action',   // telefono -> master
  ACK: 'ack',         // master -> telefono
  PING: 'ping',       // entrambi
  PONG: 'pong',       // entrambi
  ERROR: 'error',     // master -> telefono
});

// Codici d'errore che il master può mandare al telefono
export const ERR = Object.freeze({
  INVALID_MESSAGE: 'INVALID_MESSAGE',
  NOT_JOINED: 'NOT_JOINED',
  NAME_REQUIRED: 'NAME_REQUIRED',
  NAME_TAKEN: 'NAME_TAKEN',
  ROOM_FULL: 'ROOM_FULL',
  GAME_STARTED: 'GAME_STARTED',
  UNKNOWN_ACTION: 'UNKNOWN_ACTION',
  NO_GAME: 'NO_GAME',
  INVALID_PHOTO: 'INVALID_PHOTO',
  INVALID_AVATAR: 'INVALID_AVATAR',
  AVATAR_TAKEN: 'AVATAR_TAKEN',
});

// Azioni gestite dal master fuori dal motore di gioco
export const ACTIONS = Object.freeze({
  WAVE: 'WAVE',           // "Saluta il master": prova del canale telefono -> master
  SET_PHOTO: 'SET_PHOTO', // { data: 'data:image/jpeg;base64,...' } ritratto del giocatore
  SET_AVATAR: 'SET_AVATAR', // { avatar: 'torre' } stemma del giocatore (solo in sala d'attesa)
});

// Azioni di gioco: passano al motore, che le valida
export const isGameAction = (type) => PLAYER_ACTIONS.has(type);

// Ritratto: solo JPEG in base64, entro la dimensione massima
const PHOTO_RE = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;
export const isValidPhoto = (data) =>
  typeof data === 'string' && data.length <= NET.photoMaxChars && PHOTO_RE.test(data);

const FROM_PLAYER = new Set([MSG.HELLO, MSG.ACTION, MSG.PING, MSG.PONG]);
const FROM_MASTER = new Set([MSG.WELCOME, MSG.VIEW, MSG.ACK, MSG.PING, MSG.PONG, MSG.ERROR]);

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v, max = 200) => typeof v === 'string' && v.length > 0 && v.length <= max;
const isOptStr = (v, max) => v === undefined || isStr(v, max);

// Pulisce un nome: niente caratteri di controllo, spazi compattati, lunghezza massima
export function cleanName(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001f\u007f-\u009f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NET.nameMaxLength);
}

const CHECKS = {
  [MSG.HELLO]: (m) => isOptStr(m.token, 64) && isOptStr(m.name, 64),
  [MSG.WELCOME]: (m) => isStr(m.playerId, 32) && isStr(m.token, 64),
  [MSG.VIEW]: (m) => isObj(m.view),
  [MSG.ACTION]: (m) => isStr(m.type, 32) && isStr(m.nonce, 32) && (m.payload === undefined || isObj(m.payload)),
  [MSG.ACK]: (m) => isStr(m.nonce, 32) && typeof m.ok === 'boolean' && isOptStr(m.error, 64),
  [MSG.PING]: (m) => m.n === undefined || Number.isFinite(m.n),
  [MSG.PONG]: (m) => m.n === undefined || Number.isFinite(m.n),
  [MSG.ERROR]: (m) => isStr(m.code, 64) && isOptStr(m.message, 300),
};

// from: 'player' (il master valida ciò che arriva dai telefoni) o 'master'
export function validateMessage(msg, from) {
  if (!isObj(msg) || typeof msg.t !== 'string') return { ok: false, error: ERR.INVALID_MESSAGE };
  const allowed = from === 'player' ? FROM_PLAYER : FROM_MASTER;
  if (!allowed.has(msg.t)) return { ok: false, error: ERR.INVALID_MESSAGE };
  if (!CHECKS[msg.t](msg)) return { ok: false, error: ERR.INVALID_MESSAGE };
  return { ok: true };
}

export const makeMessage = (t, fields = {}) => ({ t, ...fields });
