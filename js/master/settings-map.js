// Impostazioni partita: dalle scelte del pannello (sala d'attesa) alle impostazioni del motore.
// Funzioni pure, senza DOM: si provano con node --test.

import { GAME, EVENT_IDS } from '../config/game-config.js';

// Scelte di partenza: "auto" = valore di js/config/ secondo il numero di giocatori
export function defaultChoices() {
  return {
    traitorCount: 'auto',
    finalThreshold: 'auto',
    missionsPerDay: GAME.missionsPerDay,
    missionTimeScale: GAME.missionTimeScale,
    presentations: true,
    presentationSec: Math.round(GAME.presentationMs / 1000),
    discussion: 'auto', // 'auto' | 'off' | minuti
    seduction: 'auto', // 'auto' | 'on' | 'off'
    roles: { seer: 'auto', knight: 'auto', secretTraitor: 'auto' },
    ultimatum: true,
    events: Object.fromEntries(EVENT_IDS.map((id) => [id, true])),
  };
}

// Unisce scelte salvate (anche vecchie o incomplete) a quelle di partenza
export function normalizeChoices(raw) {
  const d = defaultChoices();
  if (!raw || typeof raw !== 'object') return d;
  return {
    ...d,
    ...raw,
    roles: { ...d.roles, ...(raw.roles || {}) },
    events: { ...d.events, ...(raw.events || {}) },
  };
}

const triState = (v) => (v === 'on' ? true : v === 'off' ? false : undefined);
const intOrAuto = (v) => (v === 'auto' || v === undefined || v === null || v === '' ? undefined : Number(v));

// Scelte -> settings per createGame (undefined = automatico)
export function choicesToSettings(raw) {
  const c = normalizeChoices(raw);
  return {
    traitorCount: intOrAuto(c.traitorCount),
    finalThreshold: intOrAuto(c.finalThreshold),
    missionsPerDay: Number(c.missionsPerDay),
    missionTimeScale: Number(c.missionTimeScale),
    presentations: Boolean(c.presentations),
    presentationMs: Number(c.presentationSec) * 1000,
    discussion: c.discussion !== 'off',
    discussionMs: c.discussion === 'auto' || c.discussion === 'off' ? null : Number(c.discussion) * 60000,
    seduction: triState(c.seduction),
    ultimatum: Boolean(c.ultimatum),
    roles: {
      seer: triState(c.roles.seer),
      knight: triState(c.roles.knight),
      secretTraitor: triState(c.roles.secretTraitor),
    },
    events: Object.fromEntries(EVENT_IDS.map((id) => [id, Boolean(c.events[id])])),
  };
}
