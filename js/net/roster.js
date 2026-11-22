// Elenco dei giocatori collegati al master. Funzioni pure: ricevono e restituiscono
// oggetti nuovi, senza rete né timer. Il tempo (`now`) e gli ID entrano da fuori.

import { NET } from '../config/net-config.js';
import { ERR, cleanName } from './protocol.js';
import { AVATAR_IDS } from '../config/avatars.js';

export function createRoster() {
  return { players: {}, order: [], locked: false };
}

const findByToken = (roster, token) =>
  token ? Object.values(roster.players).find((p) => p.token === token) : undefined;

const nameTaken = (roster, name) =>
  Object.values(roster.players).some((p) => p.name.toLowerCase() === name.toLowerCase());

// Ingresso o rientro di un telefono.
// hello: { token?, name? }; ids: { newId, newToken, now, rand? } (rand in [0,1) sceglie lo stemma)
// Restituisce { roster, playerId, token, rejoined } oppure { roster, error }
export function join(roster, hello, ids) {
  const known = findByToken(roster, hello.token);
  if (known) {
    const p = { ...known, connected: true, lastSeen: ids.now };
    return {
      roster: { ...roster, players: { ...roster.players, [p.id]: p } },
      playerId: p.id,
      token: p.token,
      rejoined: true,
    };
  }

  if (roster.locked) return { roster, error: ERR.GAME_STARTED };
  const name = cleanName(hello.name);
  if (!name) return { roster, error: ERR.NAME_REQUIRED };
  if (roster.order.length >= NET.maxPlayers) return { roster, error: ERR.ROOM_FULL };
  if (nameTaken(roster, name)) return { roster, error: ERR.NAME_TAKEN };

  const free = freeAvatars(roster);
  const avatar = free.length ? free[Math.floor((ids.rand || 0) * free.length)] : null;
  const p = { id: ids.newId, name, token: ids.newToken, avatar, connected: true, lastSeen: ids.now, joinedAt: ids.now };
  return {
    roster: { ...roster, players: { ...roster.players, [p.id]: p }, order: [...roster.order, p.id] },
    playerId: p.id,
    token: p.token,
    rejoined: false,
  };
}

// Stemmi non ancora presi
export function freeAvatars(roster) {
  const taken = new Set(Object.values(roster.players).map((p) => p.avatar));
  return AVATAR_IDS.filter((a) => !taken.has(a));
}

// Cambio di stemma dal telefono: solo in sala d'attesa, solo uno libero
export function setAvatar(roster, id, avatar) {
  const p = roster.players[id];
  if (!p) return { roster, error: ERR.NOT_JOINED };
  if (roster.locked) return { roster, error: ERR.GAME_STARTED };
  if (!AVATAR_IDS.includes(avatar)) return { roster, error: ERR.INVALID_AVATAR };
  if (p.avatar !== avatar && !freeAvatars(roster).includes(avatar)) return { roster, error: ERR.AVATAR_TAKEN };
  return { roster: patch(roster, id, { avatar }) };
}

function patch(roster, id, fields) {
  const p = roster.players[id];
  if (!p) return roster;
  return { ...roster, players: { ...roster.players, [id]: { ...p, ...fields } } };
}

export const markSeen = (roster, id, now) => patch(roster, id, { lastSeen: now, connected: true });
export const markDisconnected = (roster, id) => patch(roster, id, { connected: false });

export function markAllDisconnected(roster) {
  let r = roster;
  for (const id of roster.order) r = markDisconnected(r, id);
  return r;
}

// Segna come disconnessi i giocatori silenziosi da più di timeoutMs
export function sweep(roster, now, timeoutMs) {
  let r = roster;
  const dropped = [];
  for (const id of roster.order) {
    const p = roster.players[id];
    if (p.connected && now - p.lastSeen > timeoutMs) {
      r = markDisconnected(r, id);
      dropped.push(id);
    }
  }
  return { roster: r, dropped };
}

export function remove(roster, id) {
  if (!roster.players[id]) return roster;
  const players = { ...roster.players };
  delete players[id];
  return { ...roster, players, order: roster.order.filter((x) => x !== id) };
}

// Elenco pubblico per lo schermo del master: costruito in positivo, senza token
export function publicList(roster) {
  return roster.order.map((id) => {
    const p = roster.players[id];
    return { id: p.id, name: p.name, avatar: p.avatar || null, connected: p.connected };
  });
}

// Vista per un telefono (Fase 0): costruita in positivo (allow-list)
export function viewForPlayer(roster, roomCode, playerId) {
  const me = roster.players[playerId];
  if (!me) return null;
  const list = Object.values(roster.players);
  return {
    roomCode,
    me: { id: me.id, name: me.name, avatar: me.avatar || null },
    // Stemmi di tutti (pubblici): per i nomi nelle griglie e per vedere quali sono liberi
    avatars: Object.fromEntries(roster.order.map((id) => [id, roster.players[id].avatar || null])),
    playersCount: list.length,
    connectedCount: list.filter((p) => p.connected).length,
  };
}
