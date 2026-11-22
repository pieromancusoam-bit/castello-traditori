// Il narratore: da un segnale 'say' del regista alla frase da pronunciare.
// Funzione pura: il caso arriva da fuori (rand), la memoria è un oggetto semplice
// { told: [chiavi già raccontate], last: { momento: indice dell'ultima frase } }.

import { NARRATOR_LINES } from '../config/narrator-lines.js';

export const emptyMemory = () => ({ told: [], last: {} });

// Sostituisce {nome} con le variabili; una variabile mancante resta vuota
export const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));

// Restituisce { text, memory }; text = null se la frase non va detta
export function lineFor(cue, memory, rand) {
  const told = new Set(memory.told);
  if (cue.once && told.has(cue.once)) return { text: null, memory };
  const def = NARRATOR_LINES[cue.moment];
  if (!def) return { text: null, memory };
  // La prima volta, se c'è, la versione che spiega la regola
  const first = def.first && !told.has(`moment:${cue.moment}`);
  const list = first ? def.first : def.lines;
  // Mai la stessa frase due volte di fila
  const lastKey = first ? `${cue.moment}#first` : cue.moment;
  let i = Math.floor(rand() * list.length);
  if (list.length > 1 && i === memory.last[lastKey]) i = (i + 1) % list.length;
  if (cue.once) told.add(cue.once);
  told.add(`moment:${cue.moment}`);
  return {
    text: fill(list[i], cue.vars || {}),
    memory: { told: [...told], last: { ...memory.last, [lastKey]: i } },
  };
}
