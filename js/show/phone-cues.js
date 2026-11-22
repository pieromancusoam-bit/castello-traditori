// Vibrazioni dei telefoni: decise SOLO da ciò che è uguale per tutti (fase, giorno, momento
// della fase). Mai per chat, oggetti, offerte o poteri: chi è vicino se ne accorgerebbe.
// Funzione pura, testata: per ogni stato della partita dà lo stesso risultato su ogni telefono.

const STAGED = new Set(['mission', 'roundtable', 'final']);

export function phoneMoment(v) {
  if (!v) return '';
  const st = v.step || {};
  const k = [v.phase, v.day];
  if (STAGED.has(v.phase)) k.push(st.stage || '', st.round ?? '');
  return k.join('|');
}

// Momenti in cui tutti devono agire: vibrazione più insistente
function isCall(v) {
  const stage = v.step && v.step.stage;
  if (v.phase === 'night' || v.phase === 'scene') return true;
  if (v.phase === 'roundtable') return stage === 'voting';
  if (v.phase === 'final') return stage === 'choice' || stage === 'voting';
  if (v.phase === 'mission') return stage === 'play';
  return false;
}

// 'phase' | 'vote' | null
export function phoneBuzz(prev, next) {
  if (!prev || !next) return null;
  if (phoneMoment(prev) === phoneMoment(next)) return null;
  return isCall(next) ? 'vote' : 'phase';
}
