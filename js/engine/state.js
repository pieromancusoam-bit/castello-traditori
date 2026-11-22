// Creazione di una partita e forma dello stato (vive solo sul master).

import { GAME } from '../config/game-config.js';
import { createRng } from './rng.js';
import { assignRoles, traitorCountFor } from './roles.js';

export const PHASE = Object.freeze({
  ROLES: 'roles',
  BREAKFAST: 'breakfast',
  PRESENTATIONS: 'presentations',
  MISSION: 'mission',
  ROUNDTABLE: 'roundtable',
  REVEAL: 'reveal',
  NIGHT: 'night',
  FINAL: 'final',
  ENDED: 'ended',
});

export const STATUS = Object.freeze({ ALIVE: 'alive', BANISHED: 'banished', MURDERED: 'murdered' });

export function finalThresholdFor(playerCount, table = GAME.finalThresholdTable) {
  const row = table.find((r) => playerCount <= r.upTo) || table[table.length - 1];
  return row.threshold;
}

// players: [{ id, name }] nell'ordine d'ingresso; seed: intero; settings: opzionali
export function createGame({ players, seed, settings = {} }) {
  if (players.length < GAME.minPlayers) throw new Error(`Servono almeno ${GAME.minPlayers} giocatori`);
  const ids = players.map((p) => p.id);
  const fullSettings = {
    traitorCount: settings.traitorCount ?? traitorCountFor(ids.length),
    finalThreshold: settings.finalThreshold ?? finalThresholdFor(ids.length),
    finalMinPlayers: settings.finalMinPlayers ?? GAME.finalMinPlayers,
    missions: settings.missions ?? true, // giochi del giorno tra Colazione e Tavola Rotonda
    missionsPerDay: settings.missionsPerDay ?? GAME.missionsPerDay,
    presentations: settings.presentations ?? true, // giorno 1: ognuno si presenta con un tema
    discussion: settings.discussion ?? true, // Tavola Rotonda: discussione minima prima del voto
  };
  // Seduzione possibile la prima notte solo nelle partite con pochi Traditori
  fullSettings.seduction = settings.seduction ?? fullSettings.traitorCount <= GAME.seductionMaxTraitors;
  const rng = createRng(seed);
  const roles = assignRoles(ids, fullSettings.traitorCount, rng);

  const byId = {};
  for (const p of players) {
    byId[p.id] = { id: p.id, name: p.name, role: roles[p.id], status: STATUS.ALIVE, turnedOnDay: null };
  }

  return {
    version: 1,
    rngState: rng.state,
    settings: fullSettings,
    phase: PHASE.ROLES,
    day: 0,
    players: byId,
    order: ids,
    phaseData: { seen: {} },
    history: [], // eventi pubblici: { day, type: 'banished'|'murdered'|'no-banish'|'no-murder', playerId?, faction? }
    winner: null,
    ...missionFields(),
  };
}

// Montepremi e missioni (aggiunti in Fase 2)
const missionFields = () => ({
  pot: 0,
  missionBag: [], // missioni ancora da estrarre
  lastMission: null, // ultima estratta: non si ripete subito dopo il rimescolamento
  missionLog: [], // missioni giocate: { day, id, coins } (pubblico)
  used: {}, // domande e prove già uscite, per non ripeterle
  timerSeq: 0,
});

// Partita salvata da una versione precedente: aggiunge i campi mancanti
export function upgradeGame(game) {
  if (!game) return game;
  const g = { ...missionFields(), ...game };
  g.settings = { missions: true, missionsPerDay: 1, presentations: false, discussion: false, seduction: false, ...g.settings };
  return g;
}
