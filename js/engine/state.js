// Creazione di una partita e forma dello stato (vive solo sul master).

import { GAME, EVENT_IDS } from '../config/game-config.js';
import { createRng } from './rng.js';
import { assignRoles, traitorCountFor, ROLE } from './roles.js';

export const PHASE = Object.freeze({
  ROLES: 'roles',
  BREAKFAST: 'breakfast',
  PRESENTATIONS: 'presentations',
  MISSION: 'mission',
  SCENE: 'scene', // Omicidio a vista: la scena in cui un Traditore tocca la vittima
  ROUNDTABLE: 'roundtable',
  REVEAL: 'reveal',
  DUSK: 'dusk', // Omicidio a vista: al tramonto si scopre la vittima
  NIGHT: 'night',
  FINAL: 'final',
  ENDED: 'ended',
});

export const STATUS = Object.freeze({ ALIVE: 'alive', BANISHED: 'banished', MURDERED: 'murdered' });

export function finalThresholdFor(playerCount, table = GAME.finalThresholdTable) {
  const row = table.find((r) => playerCount <= r.upTo) || table[table.length - 1];
  return row.threshold;
}

// Valore di un'impostazione "sì / no / automatico": undefined, null o 'auto' = automatico
const pick = (v, auto) => (v === true || v === false ? v : auto);

// Impostazioni complete della partita: i valori mancanti vengono da js/config/
export function resolveSettings(playerCount, settings = {}) {
  const R = GAME.specialRoles;
  const traitorCount = Number.isInteger(settings.traitorCount) ? settings.traitorCount : traitorCountFor(playerCount);
  const full = {
    traitorCount,
    finalThreshold: Number.isInteger(settings.finalThreshold) ? settings.finalThreshold : finalThresholdFor(playerCount),
    finalMinPlayers: settings.finalMinPlayers ?? GAME.finalMinPlayers,
    missions: settings.missions ?? true, // giochi del giorno tra Colazione e Tavola Rotonda
    missionsPerDay: settings.missionsPerDay ?? GAME.missionsPerDay,
    missionTimeScale: settings.missionTimeScale ?? GAME.missionTimeScale,
    presentations: settings.presentations ?? true, // giorno 1: ognuno si presenta con un tema
    presentationMs: settings.presentationMs ?? GAME.presentationMs,
    discussion: settings.discussion ?? true, // Tavola Rotonda: discussione minima prima del voto
    discussionMs: settings.discussionMs ?? null, // null = secondo i giocatori in gioco (GAME.discussionTable)
    // Seduzione possibile la prima notte solo nelle partite con pochi Traditori
    seduction: pick(settings.seduction, traitorCount <= GAME.seductionMaxTraitors),
    ultimatum: settings.ultimatum ?? true,
    roles: {
      seer: pick(settings.roles?.seer, playerCount >= R.seerAutoFrom),
      knight: pick(settings.roles?.knight, playerCount >= R.knightAutoFrom),
      secretTraitor: pick(settings.roles?.secretTraitor, playerCount >= R.secretTraitorAutoFrom)
        && traitorCount >= R.secretTraitorMinTraitors,
    },
    events: Object.fromEntries(EVENT_IDS.map((id) => [id, settings.events?.[id] ?? true])),
    eventChance: settings.eventChance ?? GAME.eventChance,
  };
  return full;
}

// players: [{ id, name }] nell'ordine d'ingresso; seed: intero; settings: opzionali
export function createGame({ players, seed, settings = {} }) {
  if (players.length < GAME.minPlayers) throw new Error(`Servono almeno ${GAME.minPlayers} giocatori`);
  const ids = players.map((p) => p.id);
  const fullSettings = resolveSettings(ids.length, settings);
  const rng = createRng(seed);
  const roles = assignRoles(ids, fullSettings.traitorCount, rng, fullSettings.roles);

  const byId = {};
  for (const p of players) {
    byId[p.id] = newPlayer(p, roles[p.id]);
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
    history: [], // eventi pubblici: { day, type: 'banished'|'murdered'|'no-banish'|'no-murder'|'murder-failed', playerId?, faction? }
    winner: null,
    ...missionFields(),
    ...phase3Fields(),
  };
}

function newPlayer(p, role) {
  return {
    id: p.id,
    name: p.name,
    role,
    status: STATUS.ALIVE,
    turnedOnDay: null,
    items: role === ROLE.KNIGHT ? ['shield'] : [], // inventario segreto
    vision: null, // Veggente: { day, targetId, faction }
    swapUsed: false, // Traditore Segreto: cambio della vittima già usato
    mirror: null, // Specchio: { day, voters }
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

// Oggetti, eventi e reclutamento (Fase 3)
const phase3Fields = () => ({
  curses: [], // maledetti per la prossima Tavola Rotonda (pubblico; mai chi ha lanciato)
  lastBallot: null, // ultimo turno della Tavola Rotonda più recente, per lo Specchio: { day, votes }
  ultimatum: { done: false, next: false }, // Ultimatum di reclutamento: una sola volta per partita
  dayEvent: null, // evento del giorno: { day, id, slot?, killerId?, victimId?, touched? }
  lastEventDay: null,
  banquetDay: null, // giorno con due votazioni (dopo il Banchetto)
  debugNext: {}, // solo prove (?debug=1): { mission, event }
});

// Partita salvata da una versione precedente: aggiunge i campi mancanti
export function upgradeGame(game) {
  if (!game) return game;
  const g = { ...missionFields(), ...phase3Fields(), ...game };
  g.settings = {
    missions: true, missionsPerDay: 1, presentations: false, discussion: false, seduction: false,
    missionTimeScale: 1, presentationMs: GAME.presentationMs, discussionMs: null, ultimatum: false,
    roles: { seer: false, knight: false, secretTraitor: false },
    events: Object.fromEntries(EVENT_IDS.map((id) => [id, false])),
    eventChance: 0,
    ...g.settings,
  };
  g.players = Object.fromEntries(Object.entries(g.players).map(([id, p]) => [id, { items: [], vision: null, swapUsed: false, mirror: null, ...p }]));
  return g;
}
