// Ruoli, fazioni e condizioni di vittoria.
// Il ruolo dice cosa sa e cosa può fare un giocatore; la fazione dice per chi gioca.

import { GAME } from '../config/game-config.js';

export const ROLE = Object.freeze({
  FAITHFUL: 'faithful',
  TRAITOR: 'traitor',
  SECRET_TRAITOR: 'secret_traitor', // Traditore che gli altri Traditori non conoscono
  SEER: 'seer',                     // Leale: una volta per partita scopre la fazione di qualcuno
  KNIGHT: 'knight',                 // Leale: parte con uno Scudo
});
export const FACTION = Object.freeze({ FAITHFULS: 'faithfuls', TRAITORS: 'traitors' });

const TRAITOR_ROLES = new Set([ROLE.TRAITOR, ROLE.SECRET_TRAITOR]);
export const factionOf = (role) => (TRAITOR_ROLES.has(role) ? FACTION.TRAITORS : FACTION.FAITHFULS);
export const isTraitorRole = (role) => TRAITOR_ROLES.has(role);

export function traitorCountFor(playerCount, table = GAME.traitorTable) {
  const row = table.find((r) => playerCount <= r.upTo) || table[table.length - 1];
  return row.traitors;
}

// Assegna i ruoli a caso: { [playerId]: role }.
// special: { secretTraitor, seer, knight } già decisi (vedi createGame).
// Un solo rimescolamento: i primi sono i Traditori (il primo di loro è il Segreto),
// poi Veggente e Cavaliere. Senza ruoli speciali l'esito è quello della Fase 1.
export function assignRoles(playerIds, traitorCount, rng, special = {}) {
  const shuffled = rng.shuffle(playerIds);
  const roles = {};
  for (const id of playerIds) roles[id] = ROLE.FAITHFUL;
  shuffled.slice(0, traitorCount).forEach((id, i) => {
    roles[id] = special.secretTraitor && i === 0 ? ROLE.SECRET_TRAITOR : ROLE.TRAITOR;
  });
  let next = traitorCount;
  if (special.seer && next < shuffled.length) roles[shuffled[next++]] = ROLE.SEER;
  if (special.knight && next < shuffled.length) roles[shuffled[next++]] = ROLE.KNIGHT;
  return roles;
}

export const alivePlayers = (state) => state.order.map((id) => state.players[id]).filter((p) => p.status === 'alive');
export const aliveTraitors = (state) => alivePlayers(state).filter((p) => isTraitorRole(p.role));
export const aliveFaithfuls = (state) => alivePlayers(state).filter((p) => !isTraitorRole(p.role));

// Vincono i Traditori se almeno uno di loro è tra i sopravvissuti
export const winnerOf = (state) => (aliveTraitors(state).length > 0 ? FACTION.TRAITORS : FACTION.FAITHFULS);
