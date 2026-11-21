// Codice stanza e parametri del server di aggancio. Funzioni pure.

import { NET } from '../config/net-config.js';

// rng: funzione che restituisce un numero in [0, 1)
export function generateRoomCode(rng) {
  let code = '';
  for (let i = 0; i < NET.roomCodeLength; i++) {
    code += NET.roomCodeAlphabet[Math.floor(rng() * NET.roomCodeAlphabet.length)];
  }
  return code;
}

// Normalizza un codice letto dall'URL; restituisce null se non valido
export function normalizeRoomCode(raw) {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  if (code.length !== NET.roomCodeLength) return null;
  for (const ch of code) if (!NET.roomCodeAlphabet.includes(ch)) return null;
  return code;
}

export const peerIdFor = (roomCode) => NET.peerPrefix + roomCode;

// Server di aggancio personale (piano B) nel formato "host:porta/percorso"
export function parsePeerServer(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const m = raw.trim().match(/^([a-zA-Z0-9.-]+)(?::(\d{1,5}))?(\/[^\s?#]*)?$/);
  if (!m) return null;
  const port = m[2] ? Number(m[2]) : 443;
  if (port < 1 || port > 65535) return null;
  return { host: m[1], port, path: m[3] || '/' };
}

export function formatPeerServer(ps) {
  if (!ps) return '';
  return `${ps.host}:${ps.port}${ps.path || '/'}`;
}
