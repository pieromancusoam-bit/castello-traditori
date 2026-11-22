// File audio facoltativi in /assets/audio/ (licenze in vendor/LICENSES.md).
// Se un suono o una traccia non ha un file, il master lo sintetizza da sé (Web Audio):
// nessun download, nessuna licenza.

export const SOUND_FILES = Object.freeze({
  // Tracce di sottofondo (in loop): day, night, roundtable, final
  music: Object.freeze({}),
  // Effetti: bell, toll, vote, gong, crack, door, heart, coins, fail, curse, seal, nightfall, fanfare, flame
  effects: Object.freeze({}),
});
