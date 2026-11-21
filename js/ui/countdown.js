// Clessidra: anello che si svuota e secondi rimasti. Si aggiorna da sola ogni 250 ms
// chiedendo i millisecondi rimasti a `leftFn` (null = nessun timer: si nasconde).

import { clock } from './format.js';

const R = 44;
const LEN = 2 * Math.PI * R;

export function countdownHtml(cls = '') {
  return `<div class="countdown ${cls}" hidden aria-live="off">
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle class="cd-track" cx="50" cy="50" r="${R}"></circle>
      <circle class="cd-fill" cx="50" cy="50" r="${R}" stroke-dasharray="${LEN.toFixed(1)}" stroke-dashoffset="0"></circle>
    </svg>
    <span class="cd-text"></span>
  </div>`;
}

// leftFn() -> { left, total } oppure null. Restituisce la funzione per fermarla.
export function runCountdown(root, leftFn) {
  const tick = () => {
    const el = root.querySelector('.countdown');
    if (!el) return;
    const t = leftFn();
    el.hidden = !t;
    if (!t) return;
    const frac = t.total > 0 ? t.left / t.total : 0;
    el.querySelector('.cd-fill').setAttribute('stroke-dashoffset', (LEN * (1 - frac)).toFixed(1));
    el.querySelector('.cd-text').textContent = clock(t.left);
    el.classList.toggle('is-low', t.left <= 5000);
  };
  tick();
  const handle = setInterval(tick, 250);
  return () => clearInterval(handle);
}
