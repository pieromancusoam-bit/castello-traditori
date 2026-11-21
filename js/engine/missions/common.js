// Aiuti comuni alle missioni.
//
// Interfaccia di una missione (un modulo per file, stesso contratto per tutte):
//   id
//   setup(s, rng)            -> data          dati privati della missione (in s.phaseData.data)
//   start(s, rng)                             inizio del gioco (di solito avvia un timer)
//   input(s, player, payload, rng) -> bool    azione dal telefono; true = missione finita
//   advance(s, rng)          -> bool          "Avanti" o timer scaduto; true = missione finita
//   result(s)                -> { coins, success, detail }   detail: solo dati aggregati
//   masterView(s)            -> oggetto       allow-list per lo schermo condiviso
//   playerView(s, player)    -> oggetto       allow-list per un telefono
// Le funzioni ricevono la bozza dello stato e possono modificarla (mai lo stato originale).

import { STATUS } from '../state.js';

export const aliveIdList = (s) => s.order.filter((id) => s.players[id].status === STATUS.ALIVE);

// Timer: il motore non conosce il tempo. Salva solo durata e chiave; il master avvia il
// conto alla rovescia e, allo scadere, manda TIMER_EXPIRED con la stessa chiave.
export function setTimer(s, ms) {
  s.timerSeq = (s.timerSeq || 0) + 1;
  s.phaseData.timer = { key: s.timerSeq, ms };
}

export function clearTimer(s) {
  s.phaseData.timer = null;
}

export const mData = (s) => s.phaseData.data;
export const isObj = (v) => v !== null && typeof v === 'object';

// Pesca n elementi da 0..total-1 senza ripetere quelli già usati; finiti, si ricomincia
export function drawFresh(used, total, n, rng) {
  let fresh = Array.from({ length: total }, (_, i) => i).filter((i) => !used.includes(i));
  if (fresh.length < n) {
    used.length = 0;
    fresh = Array.from({ length: total }, (_, i) => i);
  }
  const picked = rng.shuffle(fresh).slice(0, n);
  used.push(...picked);
  return picked;
}
