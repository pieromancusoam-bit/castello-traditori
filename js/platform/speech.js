// Voce del narratore: sintesi vocale italiana del browser (Web Speech API).
// Le frasi entrano in coda; quelle lunghe si spezzano (Chrome si blocca sopra i ~15 secondi).
// Su iPhone e Safari parla solo dopo un tocco: unlockSpeech() va chiamata dentro un tocco.

import { SHOW } from '../config/show-config.js';
import { spokenText } from '../show/spoken.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voices = [];
let voiceName = null; // scelta del master (null = automatica)
let volume = SHOW.volumes.voice;
let enabled = true;
const queue = [];
let speaking = false;
let listeners = new Set();

export const speechSupported = () => Boolean(synth && typeof SpeechSynthesisUtterance !== 'undefined');

function loadVoices() {
  if (!synth) return;
  voices = synth.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith(SHOW.voice.lang));
  notify();
}
if (synth) {
  loadVoices();
  synth.addEventListener?.('voiceschanged', loadVoices);
}

// Voci italiane disponibili, con quella scelta automaticamente
export const italianVoices = () => voices.map((v) => v.name);
export const isNatural = (v) => Boolean(v) && /natural|neural|online|premium|enhanced/i.test(v.name);
// Prima le voci naturali maschili, poi le classiche maschili, poi le altre, per ultime le femminili
export function voiceRank(v) {
  const male = SHOW.voice.preferred.findIndex((n) => v.name.includes(n));
  const female = SHOW.voice.female.some((n) => v.name.includes(n));
  const base = male !== -1 ? male : female ? 200 : 100;
  return base - (isNatural(v) ? 50 : 0);
}
export function autoVoice() {
  return [...voices].sort((a, b) => voiceRank(a) - voiceRank(b))[0] || null;
}
// C'è una voce naturale maschile? (altrimenti il pannello consiglia Edge)
export const hasNaturalMale = () => voices.some((v) => isNatural(v) && SHOW.voice.preferred.some((n) => v.name.includes(n)));
const currentVoice = () => voices.find((v) => v.name === voiceName) || autoVoice();
export const currentVoiceName = () => currentVoice()?.name || null;

export function configureSpeech({ voice, volume: vol, enabled: on }) {
  if (voice !== undefined) voiceName = voice || null;
  if (vol !== undefined) volume = vol;
  if (on !== undefined) {
    enabled = on;
    if (!on) stopSpeech();
  }
}

// Dentro un tocco dell'utente: sblocca la voce su iPhone/Safari
export function unlockSpeech() {
  if (!speechSupported()) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    synth.speak(u);
  } catch { /* niente */ }
}

// Spezza un testo in frasi brevi
export function chunks(text, max = SHOW.voice.chunkMaxChars) {
  const parts = text.match(/[^.!?…]+[.!?…]*\s*/g) || [text];
  const out = [];
  for (let p of parts) {
    p = p.trim();
    while (p.length > max) {
      const cut = p.lastIndexOf(',', max) > 20 ? p.lastIndexOf(',', max) + 1 : p.lastIndexOf(' ', max);
      out.push(p.slice(0, cut > 0 ? cut : max).trim());
      p = p.slice(cut > 0 ? cut : max).trim();
    }
    if (p) out.push(p);
  }
  return out;
}

// Mette in coda una frase; la promessa si risolve quando è stata detta (o saltata)
export function say(text) {
  if (!enabled || !speechSupported() || !text) return Promise.resolve();
  return new Promise((resolve) => {
    const parts = chunks(spokenText(text));
    parts.forEach((p, i) => queue.push({ text: p, done: i === parts.length - 1 ? resolve : null }));
    pump();
  });
}

function pump() {
  if (speaking) return;
  const item = queue.shift();
  if (!item) return notify();
  speaking = true;
  notify();
  const u = new SpeechSynthesisUtterance(item.text);
  const v = currentVoice();
  if (v) u.voice = v;
  u.lang = v ? v.lang : 'it-IT';
  const tune = isNatural(v) ? SHOW.voice.natural : SHOW.voice.classic;
  u.pitch = tune.pitch;
  u.rate = tune.rate;
  u.volume = volume;
  let finished = false;
  const end = () => {
    if (finished) return;
    finished = true;
    clearTimeout(guard);
    speaking = false;
    if (item.done) item.done();
    setTimeout(pump, SHOW.voice.gapMs);
  };
  u.onend = end;
  u.onerror = end;
  // Se il browser non avvisa la fine (succede), si va avanti lo stesso
  const guard = setTimeout(end, 2000 + item.text.length * 140);
  synth.speak(u);
}

// Zittisce il narratore e svuota la coda
export function stopSpeech() {
  while (queue.length) {
    const it = queue.shift();
    if (it.done) it.done();
  }
  if (synth) synth.cancel();
  speaking = false;
  notify();
}

export const isSpeaking = () => speaking || queue.length > 0;

// Avvisi: inizio/fine della voce (per abbassare la musica, mostrare "Avanti")
export function onSpeechChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  for (const fn of listeners) fn(isSpeaking());
}
