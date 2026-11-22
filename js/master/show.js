// Lo spettacolo sul master: esegue i segnali del regista (voce, musica, effetti)
// e dice allo schermo quando il narratore ha finito ("Avanti" si sblocca).

import { cuesFor, sceneKey, LOBBY_VIEW } from '../show/director.js';
import { lineFor, emptyMemory } from '../show/narrator.js';
import { say, stopSpeech, isSpeaking, onSpeechChange, configureSpeech, unlockSpeech, speechSupported } from '../platform/speech.js';
import { unlockAudio, setMusic, playSound, duck, configureAudio } from '../platform/audio.js';
import { local } from '../platform/storage.js';
import { SHOW } from '../config/show-config.js';

const SETTINGS_KEY = 'castello:audio';
const memoryKey = (room) => `castello:narratore:${room}`;

export const defaultAudioSettings = () => ({
  voiceOn: true, voice: '', voiceVolume: SHOW.volumes.voice,
  musicOn: true, music: SHOW.volumes.music,
  effectsOn: true, effects: SHOW.volumes.effects,
});

export function createShow() {
  let prev = null;          // ultima schermata vista (null dopo un "Riprendi")
  let room = null;
  let memory = emptyMemory();
  let timers = [];
  let busyUntil = 0;        // fine della sequenza di suoni e frasi in corso
  let screen = null;        // la schermata montata, da ridisegnare quando cambia "occupato"
  let settings = { ...defaultAudioSettings(), ...(local.get(SETTINGS_KEY) || {}) };

  function apply() {
    configureSpeech({ enabled: settings.voiceOn, voice: settings.voice, volume: settings.voiceVolume });
    configureAudio({ musicEnabled: settings.musicOn, music: settings.music, effectsEnabled: settings.effectsOn, effects: settings.effects });
  }
  apply();

  const notify = () => screen && screen();
  onSpeechChange((speaking) => {
    duck(speaking);
    notify();
  });

  function clearTimeline() {
    timers.forEach(clearTimeout);
    timers = [];
    busyUntil = 0;
  }

  const later = (ms, fn) => timers.push(setTimeout(fn, ms));

  return {
    // Dentro un tocco: sblocca voce e audio (Safari)
    unlock() {
      unlockAudio();
      unlockSpeech();
    },
    setRoom(code) {
      room = code;
      memory = { ...emptyMemory(), ...(local.get(memoryKey(code)) || {}) };
    },
    // Sala d'attesa: la prossima partita parte "dall'inizio" (con le frasi del primo momento)
    toLobby() {
      clearTimeline();
      stopSpeech();
      prev = LOBBY_VIEW;
      screen = null;
      setMusic('day');
      notify();
    },
    stop() {
      screen = null;
      clearTimeline();
      stopSpeech();
      setMusic(null);
    },

    // Una schermata nuova del master
    update(view) {
      const newScene = sceneKey(prev) !== sceneKey(view);
      const cues = cuesFor(prev, view);
      prev = view;
      if (newScene) {
        clearTimeline();
        stopSpeech();
      }
      // Partita nuova: le regole si spiegano di nuovo
      if (newScene && view.phase === 'roles') memory = { ...memory, told: [] };
      const start = Date.now();
      for (const c of cues) {
        if (c.type === 'music') setMusic(c.track);
        else if (c.type === 'sound') later(c.at, () => playSound(c.id));
        else if (c.type === 'say') {
          const r = lineFor(c, memory, Math.random);
          memory = r.memory;
          if (r.text) later(c.at, () => say(r.text));
        }
        if (c.at) busyUntil = Math.max(busyUntil, start + c.at + 50);
      }
      if (busyUntil) later(busyUntil - start + 10, notify);
      if (room) local.set(memoryKey(room), memory);
      notify();
    },

    // Narratore (o sequenza di rivelazione) ancora in corso?
    busy: () => isSpeaking() || Date.now() < busyUntil,
    // Salta: zittisce il narratore e chiude la sequenza
    skip() {
      clearTimeline();
      stopSpeech();
      notify();
    },
    sound: (id) => playSound(id),
    // Una sola schermata alla volta: la nuova sostituisce la vecchia
    watch(fn) {
      screen = fn;
    },

    settings: () => ({ ...settings }),
    setSettings(next) {
      settings = { ...settings, ...next };
      local.set(SETTINGS_KEY, settings);
      apply();
    },
    testVoice() {
      stopSpeech();
      say('Benvenuti al castello. Tra voi si nascondono i Traditori.');
    },
    speechSupported,
  };
}
