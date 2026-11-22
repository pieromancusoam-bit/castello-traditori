// Pannello "Audio" del master: voce del narratore, musica, effetti.
// Le scelte restano nel browser del master, fuori dalla partita.

import { esc } from '../ui/dom.js';
import { italianVoices, currentVoiceName, hasNaturalMale } from '../platform/speech.js';
import { defaultAudioSettings } from './show.js';

const pct = (v) => Math.round(v * 100);

function panelHtml(s, show) {
  const voices = italianVoices();
  const auto = currentVoiceName();
  const voiceSelect = voices.length
    ? `<select name="voice">
        <option value="">Automatica${!s.voice && auto ? ` (${esc(auto)})` : ''}</option>
        ${voices.map((n) => `<option value="${esc(n)}" ${n === s.voice ? 'selected' : ''}>${esc(n)}</option>`).join('')}
      </select>`
    : '<span class="muted">Nessuna voce italiana in questo browser</span>';
  const slider = (name, value, on) => `<input type="range" name="${name}" min="0" max="100" value="${pct(value)}" ${on ? '' : 'disabled'}>`;
  return `<form class="settings-panel audio-panel" autocomplete="off">
    <h2>Audio</h2>
    ${show.speechSupported() ? '' : '<p class="muted">Questo browser non ha la sintesi vocale: il narratore resterà muto.</p>'}
    <fieldset><legend>Narratore</legend>
      <div class="set-row"><label class="set-check"><input type="checkbox" name="voiceOn" ${s.voiceOn ? 'checked' : ''}> Voce del narratore</label></div>
      <div class="set-row"><span class="set-label">Voce</span><span class="set-control">${voiceSelect}</span></div>
      <div class="set-row"><span class="set-label">Volume</span><span class="set-control">${slider('voiceVolume', s.voiceVolume, s.voiceOn)}</span></div>
      <div class="set-row"><button type="button" class="btn btn-small btn-secondary" data-audio="test">Prova voce</button></div>
      ${hasNaturalMale() ? '' : '<p class="muted small">Per una voce più realistica aprite il master con <strong>Microsoft Edge</strong>: ha le voci italiane "naturali" (Diego, Giuseppe), gratuite.</p>'}
    </fieldset>
    <fieldset><legend>Musica ed effetti</legend>
      <div class="set-row"><label class="set-check"><input type="checkbox" name="musicOn" ${s.musicOn ? 'checked' : ''}> Musica</label><span class="set-control">${slider('music', s.music, s.musicOn)}</span></div>
      <div class="set-row"><label class="set-check"><input type="checkbox" name="effectsOn" ${s.effectsOn ? 'checked' : ''}> Effetti</label><span class="set-control">${slider('effects', s.effects, s.effectsOn)}</span></div>
      <div class="set-row"><button type="button" class="btn btn-small btn-secondary" data-audio="bell">Prova effetto</button></div>
    </fieldset>
    <div class="settings-actions">
      <button type="button" class="btn btn-small btn-ghost" data-audio="reset">Valori di partenza</button>
      <button type="button" class="btn btn-primary" data-audio="close">Fatto</button>
    </div>
  </form>`;
}

// Apre il pannello sopra lo schermo; si chiude con "Fatto"
export function openAudioPanel(show) {
  show.unlock();
  const overlay = document.createElement('div');
  overlay.className = 'settings-overlay audio-overlay';
  document.body.appendChild(overlay);
  const render = () => { overlay.innerHTML = panelHtml(show.settings(), show); };
  render();
  // Le voci arrivano dopo qualche istante in alcuni browser
  setTimeout(render, 600);

  const read = () => {
    const f = overlay.querySelector('form');
    return {
      voiceOn: f.voiceOn.checked,
      voice: f.voice ? f.voice.value : '',
      voiceVolume: f.voiceVolume.value / 100,
      musicOn: f.musicOn.checked,
      music: f.music.value / 100,
      effectsOn: f.effectsOn.checked,
      effects: f.effects.value / 100,
    };
  };
  overlay.addEventListener('input', () => show.setSettings(read()));
  overlay.addEventListener('change', () => { show.setSettings(read()); render(); });
  overlay.addEventListener('click', (e) => {
    const b = e.target.closest('[data-audio]');
    if (!b) return;
    const act = b.dataset.audio;
    if (act === 'test') show.testVoice();
    if (act === 'bell') show.sound('bell');
    if (act === 'reset') { show.setSettings(defaultAudioSettings()); render(); }
    if (act === 'close') overlay.remove();
  });
}
