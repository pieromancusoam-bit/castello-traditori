// Registro delle missioni e montepremi.

import { GAME } from '../../config/game-config.js';
import chest from './chest.js';
import riddle from './riddle.js';
import torches from './torches.js';
import trial from './trial.js';
import estimate from './estimate.js';
import memory from './memory.js';
import chronology from './chronology.js';
import messenger from './messenger.js';

export const MISSION_MODULES = Object.freeze({ chest, riddle, torches, trial, estimate, memory, chronology, messenger });
export const MISSION_IDS = Object.freeze(Object.keys(MISSION_MODULES));

// Valore massimo della missione del giorno: cresce con i giorni
export const missionValue = (day) => GAME.missionBaseValue + GAME.missionValuePerDay * Math.max(0, day - 1);

// Estrazione senza ripetizioni; finito il sacchetto si rimescola,
// evitando di ripetere subito l'ultima missione giocata
export function drawMission(s, rng) {
  // Prove (?debug=1): il master ha scelto il prossimo gioco
  const forced = s.debugNext && s.debugNext.mission;
  if (forced && MISSION_MODULES[forced]) {
    delete s.debugNext.mission;
    s.missionBag = s.missionBag.filter((id) => id !== forced);
    s.lastMission = forced;
    return forced;
  }
  if (!s.missionBag.length) {
    const bag = rng.shuffle(MISSION_IDS);
    if (bag.length > 1 && bag[0] === s.lastMission) [bag[0], bag[1]] = [bag[1], bag[0]];
    s.missionBag = bag;
  }
  s.lastMission = s.missionBag.shift();
  return s.lastMission;
}
