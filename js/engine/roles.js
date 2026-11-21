// Ruoli, fazioni e condizioni di vittoria.

import { GAME } from '../config/game-config.js';

export const ROLE = Object.freeze({ FAITHFUL: 'faithful', TRAITOR: 'traitor' });
export const FACTION = Object.freeze({ FAITHFULS: 'faithfuls', TRAITORS: 'traitors' });

export const factionOf = (role) => (role === ROLE.TRAITOR ? FACTION.TRAITORS : FACTION.FAITHFULS);

export function traitorCountFor(playerCount, table = GAME.traitorTable) {
  const row = table.find((r) => playerCount <= r.upTo) || table[table.length - 1];
  return row.traitors;
}

// Assegna i ruoli a caso: { [playerId]: role }
export function assignRoles(playerIds, traitorCount, rng) {
  const traitors = new Set(rng.shuffle(playerIds).slice(0, traitorCount));
  const roles = {};
  for (const id of playerIds) roles[id] = traitors.has(id) ? ROLE.TRAITOR : ROLE.FAITHFUL;
  return roles;
}

export const alivePlayers = (state) => state.order.map((id) => state.players[id]).filter((p) => p.status === 'alive');
export const aliveTraitors = (state) => alivePlayers(state).filter((p) => p.role === ROLE.TRAITOR);
export const aliveFaithfuls = (state) => alivePlayers(state).filter((p) => p.role !== ROLE.TRAITOR);

// Vincono i Traditori se almeno uno di loro è tra i sopravvissuti
export const winnerOf = (state) => (aliveTraitors(state).length > 0 ? FACTION.TRAITORS : FACTION.FAITHFULS);
