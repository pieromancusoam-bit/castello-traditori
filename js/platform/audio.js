// Musica ed effetti del master (Web Audio API).
// Ogni suono può venire da un file (js/config/sounds.js) oppure essere sintetizzato qui:
// campane, rintocchi, gong, cuore, porta, vetro, monete… e quattro sottofondi generati dal vivo.
// Il contesto audio nasce solo dentro un tocco dell'utente (unlockAudio), come vuole Safari.

import { SHOW } from '../config/show-config.js';
import { SOUND_FILES } from '../config/sounds.js';

let ctx = null;
let musicBus = null; // volume della musica (impostazioni)
let duckBus = null;  // abbassamento mentre parla il narratore
let fxBus = null;
let vols = { music: SHOW.volumes.music, effects: SHOW.volumes.effects };
let musicOn = true;
let effectsOn = true;
let wantedTrack = null;
let current = null;  // { name, stop(ms) }
const buffers = new Map();

export const audioSupported = () => typeof window !== 'undefined' && Boolean(window.AudioContext || window.webkitAudioContext);

// Da chiamare dentro un tocco: crea (o risveglia) il contesto audio
export function unlockAudio() {
  if (!audioSupported()) return;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    musicBus = ctx.createGain();
    duckBus = ctx.createGain();
    fxBus = ctx.createGain();
    musicBus.connect(duckBus).connect(ctx.destination);
    fxBus.connect(ctx.destination);
    applyVolumes();
    if (wantedTrack) startTrack(wantedTrack);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function configureAudio({ music, effects, musicEnabled, effectsEnabled }) {
  if (music !== undefined) vols.music = music;
  if (effects !== undefined) vols.effects = effects;
  if (musicEnabled !== undefined) musicOn = musicEnabled;
  if (effectsEnabled !== undefined) effectsOn = effectsEnabled;
  applyVolumes();
}

function applyVolumes() {
  if (!ctx) return;
  musicBus.gain.setTargetAtTime(musicOn ? vols.music : 0, ctx.currentTime, 0.1);
  fxBus.gain.setTargetAtTime(effectsOn ? vols.effects : 0, ctx.currentTime, 0.05);
}

// Musica più bassa mentre parla il narratore
export function duck(on) {
  if (!ctx) return;
  duckBus.gain.setTargetAtTime(on ? SHOW.duck : 1, ctx.currentTime, SHOW.duckRampMs / 3000);
}

// ---------------- Musica ----------------

export function setMusic(track) {
  wantedTrack = track;
  if (!ctx) return;
  if (current && current.name === track) return;
  if (current) current.stop(SHOW.musicFadeMs);
  current = null;
  if (track) startTrack(track);
}

function startTrack(name) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(1, ctx.currentTime + SHOW.musicFadeMs / 1000);
  gain.connect(musicBus);
  const file = SOUND_FILES.music[name];
  let stopInner;
  if (file) stopInner = playLoopFile(file, gain);
  else stopInner = (MUSIC[name] || MUSIC.day)(gain);
  current = {
    name,
    stop(ms) {
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + ms / 1000);
      setTimeout(() => { stopInner(); gain.disconnect(); }, ms + 100);
    },
  };
}

function playLoopFile(url, dest) {
  let src = null;
  let stopped = false;
  loadBuffer(url).then((buf) => {
    if (stopped || !buf) return;
    src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(dest);
    src.start();
  });
  return () => { stopped = true; if (src) src.stop(); };
}

async function loadBuffer(url) {
  if (buffers.has(url)) return buffers.get(url);
  try {
    const res = await fetch(url);
    const buf = await ctx.decodeAudioData(await res.arrayBuffer());
    buffers.set(url, buf);
    return buf;
  } catch {
    buffers.set(url, null);
    return null;
  }
}

// ---------------- Effetti ----------------

export function playSound(id) {
  if (!ctx || !effectsOn) return;
  const file = SOUND_FILES.effects[id];
  if (file) {
    loadBuffer(file).then((buf) => {
      if (!buf) return SFX[id] && SFX[id]();
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(fxBus);
      src.start();
    });
    return;
  }
  if (SFX[id]) SFX[id]();
}

// ---------------- Mattoni della sintesi ----------------

const now = () => ctx.currentTime;
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

function makeReverb(seconds) {
  const conv = ctx.createConvolver();
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6;
  }
  conv.buffer = buf;
  const out = ctx.createGain();
  out.gain.value = 0.55;
  conv.connect(out);
  return { input: conv, connect: (d) => out.connect(d) };
}

// Mandata al riverbero da un nodo, verso il bus indicato (riverbero dedicato al bus)
function wet(node, amount, bus) {
  const g = ctx.createGain();
  g.gain.value = amount;
  node.connect(g).connect(reverbFor(bus));
}
const reverbs = new Map();
function reverbFor(bus) {
  if (!reverbs.has(bus)) {
    const r = makeReverb(3.2);
    r.connect(bus);
    reverbs.set(bus, r.input);
  }
  return reverbs.get(bus);
}

let noiseBuf = null;
function noise(seconds) {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = seconds > 2;
  return src;
}

// Campana: parziali inarmoniche che si spengono
function bellAt(t, freq, { decay = 3, level = 0.25, partials = [1, 2, 2.76, 5.4, 8.93], dest = fxBus, wetAmount = 0.4 } = {}) {
  const out = ctx.createGain();
  out.gain.value = level;
  out.connect(dest);
  wet(out, wetAmount, dest);
  partials.forEach((p, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq * p;
    const a = 1 / (i + 1.2);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(a, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay / (1 + i * 0.35));
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + decay + 0.1);
  });
}

// Colpo grave (cuore, tonfo): seno che scende di tono
function thumpAt(t, { freq = 60, level = 0.9, len = 0.18, dest = fxBus } = {}) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(freq * 1.6, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.7, t + len);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + len + 0.05);
}

// Rumore filtrato con inviluppo
function noiseAt(t, { len = 0.3, type = 'lowpass', freq = 800, freqEnd = null, q = 1, level = 0.5, attack = 0.005, dest = fxBus, wetAmount = 0 } = {}) {
  const src = noise(len);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + len);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(f).connect(g).connect(dest);
  if (wetAmount) wet(g, wetAmount, dest);
  src.start(t);
  src.stop(t + len + 0.05);
}

// Nota "sostenuta" (archi, ottoni, coro): oscillatori leggermente stonati + filtro
function padAt(t, freqs, { len = 4, attack = 1.2, release = 1.5, type = 'sawtooth', cutoff = 900, level = 0.08, dest, wetAmount = 0.5, vibrato = 0 } = {}) {
  const out = ctx.createGain();
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = cutoff;
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(level, t + attack);
  out.gain.setValueAtTime(level, t + len - release);
  out.gain.linearRampToValueAtTime(0, t + len);
  f.connect(out).connect(dest);
  wet(out, wetAmount, dest);
  for (const fr of freqs) {
    for (const det of [-6, 6]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = fr;
      o.detune.value = det;
      if (vibrato) {
        const lfo = ctx.createOscillator();
        const lg = ctx.createGain();
        lfo.frequency.value = 4.5 + Math.random();
        lg.gain.value = vibrato;
        lfo.connect(lg).connect(o.detune);
        lfo.start(t);
        lfo.stop(t + len + 0.1);
      }
      o.connect(f);
      o.start(t);
      o.stop(t + len + 0.1);
    }
  }
}

// Corda pizzicata (arpa)
function pluckAt(t, freq, { level = 0.12, decay = 1.8, dest, wetAmount = 0.6 } = {}) {
  const o = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  o.type = 'triangle';
  o2.type = 'sine';
  o.frequency.value = freq;
  o2.frequency.value = freq * 2;
  f.type = 'lowpass';
  f.frequency.setValueAtTime(freq * 8, t);
  f.frequency.exponentialRampToValueAtTime(freq * 1.5, t + decay);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(f);
  o2.connect(f);
  f.connect(g).connect(dest);
  wet(g, wetAmount, dest);
  for (const x of [o, o2]) { x.start(t); x.stop(t + decay + 0.05); }
}

// ---------------- Effetti sintetizzati ----------------

const SFX = {
  // Campana della colazione: due rintocchi chiari
  bell: () => { bellAt(now(), 660, { decay: 3.5 }); bellAt(now() + 0.7, 660, { decay: 4, level: 0.2 }); },
  // Rintocco grave (inizio votazione, tramonto)
  toll: () => bellAt(now(), 98, { decay: 6, level: 0.4, partials: [0.5, 1, 1.19, 1.5, 2, 2.5, 3, 4.2] }),
  // Un voto che compare: rintocco breve
  vote: () => bellAt(now(), 196, { decay: 1.6, level: 0.22, partials: [1, 2.4, 3.9, 5.2], wetAmount: 0.25 }),
  // Gong: annuncio importante
  gong: () => {
    bellAt(now(), 72, { decay: 7, level: 0.45, partials: [1, 1.48, 1.97, 2.47, 2.94, 3.6, 4.9, 6.1] });
    noiseAt(now(), { len: 1.2, freq: 300, level: 0.12 });
  },
  // Vetro che si incrina (il ritratto della vittima)
  crack: () => {
    noiseAt(now(), { len: 0.25, type: 'highpass', freq: 2500, level: 0.5 });
    for (let i = 0; i < 7; i++) bellAt(now() + 0.02 + Math.random() * 0.35, 2500 + Math.random() * 3500, { decay: 0.4, level: 0.06, partials: [1, 1.7], wetAmount: 0.2 });
  },
  // Porta del castello che si chiude: cigolio e tonfo
  door: () => {
    const t = now();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(95, t);
    o.frequency.linearRampToValueAtTime(140, t + 0.5);
    o.frequency.linearRampToValueAtTime(80, t + 0.7);
    f.type = 'bandpass';
    f.frequency.value = 700;
    f.Q.value = 4;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.08, t + 0.1);
    g.gain.linearRampToValueAtTime(0, t + 0.75);
    o.connect(f).connect(g).connect(fxBus);
    o.start(t);
    o.stop(t + 0.8);
    thumpAt(t + 0.8, { freq: 45, level: 1, len: 0.5 });
    noiseAt(t + 0.8, { len: 0.6, freq: 250, level: 0.5, wetAmount: 0.8 });
  },
  // Cuore che batte durante il silenzio della rivelazione
  heart: () => {
    for (let i = 0; i < 4; i++) {
      const t = now() + i * 0.95;
      const lv = 0.9 - i * 0.12;
      thumpAt(t, { freq: 55, level: lv });
      thumpAt(t + 0.27, { freq: 50, level: lv * 0.7 });
    }
  },
  // Monete nel forziere
  coins: () => {
    for (let i = 0; i < 9; i++) bellAt(now() + i * 0.07 + Math.random() * 0.05, 2200 + Math.random() * 1800, { decay: 0.5, level: 0.09, partials: [1, 2.7, 4.1], wetAmount: 0.2 });
  },
  // Fallimento: ottoni che scendono
  fail: () => {
    const t = now();
    [220, 207.65].forEach((fr, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(fr, t + i * 0.5);
      o.frequency.linearRampToValueAtTime(fr * 0.75, t + i * 0.5 + 0.9);
      f.type = 'lowpass';
      f.frequency.value = 800;
      g.gain.setValueAtTime(0, t + i * 0.5);
      g.gain.linearRampToValueAtTime(0.12, t + i * 0.5 + 0.08);
      g.gain.linearRampToValueAtTime(0, t + i * 0.5 + 1);
      o.connect(f).connect(g).connect(fxBus);
      wet(g, 0.4, fxBus);
      o.start(t + i * 0.5);
      o.stop(t + i * 0.5 + 1.1);
    });
  },
  // Maledizione: grappolo dissonante che sale
  curse: () => padAt(now(), [hz(46), hz(52), hz(53)], { len: 2.6, attack: 1.2, release: 1, level: 0.14, cutoff: 700, dest: fxBus, vibrato: 25 }),
  // Sigillo: tre note chiare che salgono
  seal: () => [76, 79, 84].forEach((m, i) => bellAt(now() + i * 0.18, hz(m), { decay: 1.6, level: 0.14, partials: [1, 2, 3] })),
  // Cala la notte: campana lontana e vento
  nightfall: () => {
    bellAt(now(), 147, { decay: 6, level: 0.25, wetAmount: 0.9 });
    noiseAt(now(), { len: 4, type: 'bandpass', freq: 400, freqEnd: 900, q: 2, level: 0.12, attack: 1.5, wetAmount: 0.5 });
  },
  // Fine partita: accordo di ottoni e gong
  fanfare: () => {
    SFX.gong();
    padAt(now() + 0.1, [hz(50), hz(57), hz(62), hz(66)], { len: 4, attack: 0.15, release: 2, level: 0.12, cutoff: 1800, dest: fxBus, wetAmount: 0.6 });
  },
  // Fiamma della Cerimonia
  flame: () => noiseAt(now(), { len: 0.9, type: 'bandpass', freq: 300, freqEnd: 2400, q: 1.5, level: 0.35, attack: 0.15, wetAmount: 0.3 }),
};

// ---------------- Sottofondi generati ----------------
// Ogni traccia programma le note poco prima di suonarle; restituisce la funzione di arresto.

function sequencer(dest, stepSec, onStep) {
  let next = now() + 0.1;
  let step = 0;
  const id = setInterval(() => {
    while (next < now() + 0.6) {
      onStep(next, step++, dest);
      next += stepSec;
    }
  }, 200);
  return () => clearInterval(id);
}

// Drone grave continuo con filtro che respira
function drone(dest, freqs, { cutoff = 260, level = 0.07, lfoHz = 0.05 } = {}) {
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  f.type = 'lowpass';
  f.frequency.value = cutoff;
  g.gain.value = level;
  const lfo = ctx.createOscillator();
  const lg = ctx.createGain();
  lfo.frequency.value = lfoHz;
  lg.gain.value = cutoff * 0.5;
  lfo.connect(lg).connect(f.frequency);
  const oscs = [];
  for (const fr of freqs) for (const det of [-8, 0, 7]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = fr;
    o.detune.value = det;
    o.connect(f);
    oscs.push(o);
  }
  f.connect(g).connect(dest);
  wet(g, 0.5, dest);
  lfo.start();
  oscs.forEach((o) => o.start());
  return () => { lfo.stop(); oscs.forEach((o) => o.stop()); };
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chord = (root, ints) => ints.map((i) => hz(root + i));

const MUSIC = {
  // Giorno: re dorico, accordi caldi e arpa
  day(dest) {
    const stopDrone = drone(dest, [hz(38)], { cutoff: 220, level: 0.05 });
    const prog = [[50, [0, 7, 12, 15]], [48, [0, 7, 12, 16]], [53, [0, 4, 7, 12]], [45, [0, 7, 12, 15]]];
    const scale = [62, 64, 65, 67, 69, 71, 72, 74, 76];
    const stopSeq = sequencer(dest, 0.5, (t, step, d) => {
      const bar = Math.floor(step / 16) % prog.length;
      if (step % 16 === 0) padAt(t, chord(...prog[bar]), { len: 8.4, attack: 2, release: 2.5, level: 0.035, cutoff: 1100, dest: d, type: 'triangle' });
      if (step % 2 === 0 && Math.random() < 0.55) pluckAt(t, hz(pick(scale)), { dest: d, level: 0.07 });
    });
    return () => { stopDrone(); stopSeq(); };
  },
  // Notte: re minore grave, vento e campane lontane
  night(dest) {
    const stopDrone = drone(dest, [hz(26), hz(33)], { cutoff: 180, level: 0.06, lfoHz: 0.03 });
    const stopSeq = sequencer(dest, 1, (t, step, d) => {
      if (step % 12 === 0) noiseAt(t, { len: 10, type: 'bandpass', freq: 300, freqEnd: 700, q: 3, level: 0.05, attack: 4, dest: d, wetAmount: 0.5 });
      if (Math.random() < 0.18) bellAt(t, hz(pick([62, 65, 69, 72, 74])), { decay: 5, level: 0.05, dest: d, wetAmount: 0.9 });
      if (step % 16 === 8) padAt(t, chord(38, [0, 7, 15]), { len: 12, attack: 4, release: 4, level: 0.03, cutoff: 500, dest: d });
    });
    return () => { stopDrone(); stopSeq(); };
  },
  // Tavola Rotonda: tensione, pulsazione grave e tritono
  roundtable(dest) {
    const stopDrone = drone(dest, [hz(33), hz(39)], { cutoff: 240, level: 0.05, lfoHz: 0.08 });
    const stopSeq = sequencer(dest, 0.6, (t, step, d) => {
      if (step % 2 === 0) thumpAt(t, { freq: 55, level: 0.25, len: 0.3, dest: d });
      if (step % 16 === 0) padAt(t, chord(pick([45, 46]), [0, 3, 6, 10]), { len: 9.4, attack: 3, release: 3, level: 0.03, cutoff: 700, dest: d, vibrato: 8 });
      if (step % 8 === 4 && Math.random() < 0.5) pluckAt(t, hz(pick([69, 70, 75, 76])), { dest: d, level: 0.05 });
    });
    return () => { stopDrone(); stopSeq(); };
  },
  // Finale: accordi solenni come un coro
  final(dest) {
    const stopDrone = drone(dest, [hz(38)], { cutoff: 200, level: 0.05 });
    const prog = [[50, [0, 3, 7, 12]], [46, [0, 4, 7, 12]], [48, [0, 4, 7, 12]], [45, [0, 4, 7, 11]]];
    const stopSeq = sequencer(dest, 0.75, (t, step, d) => {
      const bar = Math.floor(step / 8) % prog.length;
      if (step % 8 === 0) padAt(t, chord(...prog[bar]), { len: 6.4, attack: 1.8, release: 2, level: 0.045, cutoff: 1400, dest: d, vibrato: 12 });
      if (step % 8 === 0) bellAt(t, hz(prog[bar][0] - 12), { decay: 4, level: 0.12, partials: [1, 2, 3, 4.2], dest: d });
    });
    return () => { stopDrone(); stopSeq(); };
  },
};
