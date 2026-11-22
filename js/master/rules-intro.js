// Spiegazione delle regole a inizio partita: diapositive a tutto schermo lette dal custode.
// Parte da "Inizia la partita"; si può saltare. Alla fine la partita comincia.

import { esc } from '../ui/dom.js';
import { rulesSlides } from '../config/rules-intro.js';
import { SHOW } from '../config/show-config.js';

export function openRulesIntro(show, settings, onStart) {
  const slides = rulesSlides(settings);
  let index = 0;
  let holdTimer = null;
  const overlay = document.createElement('div');
  overlay.className = 'rules-intro';
  document.body.appendChild(overlay);

  function render() {
    const sl = slides[index];
    const last = index === slides.length - 1;
    const waiting = show.busy();
    const items = sl.items
      ? `<div class="rules-items">${sl.items.map((it) => `<div class="rules-item"><strong>${esc(it.name)}</strong><span>${esc(it.text)}</span></div>`).join('')}</div>`
      : '';
    overlay.innerHTML = `
      <div class="rules-slide">
        <p class="kicker">Le regole del castello · ${index + 1} di ${slides.length}</p>
        <h1>${esc(sl.title)}</h1>
        <ul class="rules-lines">${sl.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
        ${items}
      </div>
      <footer class="rules-footer">
        <button class="btn btn-ghost btn-small" data-rules="skip">Salta le regole e inizia</button>
        ${index > 0 ? '<button class="btn btn-secondary btn-small" data-rules="back">Indietro</button>' : ''}
        <button class="btn btn-primary btn-advance ${waiting ? 'is-waiting' : ''}" data-rules="next">${waiting ? 'Il custode parla… (tieni premuto per saltare)' : last ? 'Inizia la partita' : 'Avanti'}</button>
      </footer>`;
  }

  function go(i) {
    index = i;
    show.speak(slides[index].say);
    render();
  }

  function close(start) {
    clearTimeout(holdTimer);
    show.watch(null);
    show.skip();
    overlay.remove();
    if (start) onStart();
  }

  overlay.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rules]');
    if (!b) return;
    const act = b.dataset.rules;
    if (act === 'skip') return close(true);
    if (act === 'back') return go(index - 1);
    if (act === 'next' && !b.classList.contains('is-waiting')) {
      if (index === slides.length - 1) return close(true);
      go(index + 1);
    }
  });
  // Tenendo premuto "Avanti" mentre il custode parla si salta la frase
  overlay.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-rules="next"].is-waiting');
    if (!b) return;
    b.classList.add('is-holding');
    holdTimer = setTimeout(() => show.skip(), SHOW.skipHoldMs);
  });
  const cancel = () => clearTimeout(holdTimer);
  overlay.addEventListener('pointerup', cancel);
  overlay.addEventListener('pointerleave', cancel);

  show.watch(render);
  go(0);
  return () => close(false);
}
