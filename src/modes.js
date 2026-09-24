import { createLineMap } from './lineMap.js';
import { createMusic } from './music.js';
import { durationsFromParams, pomodoroLabel, startPomodoro, tickPomodoro } from './pomodoro.js';

const PILL_INTERVAL = 250; // ms between pomodoro label refreshes

function element(doc, id) {
  const node = doc.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node;
}

const setPressed = (button, on) => button.setAttribute('aria-pressed', String(on));

/** Saves the current frame as a PNG named after the track position. */
function savePhoto(canvas, km, flash) {
  canvas.toBlob((blob) => {
    if (!blob) {
      console.error('Photo failed: canvas produced no image');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `train-journey-km${km.toFixed(1)}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
  flash.classList.remove('flashing');
  void flash.offsetWidth; // restart the CSS animation
  flash.classList.add('flashing');
}

/**
 * Relax mode (fullscreen, hidden UI, ambient music), Pomodoro timer, line map and photo.
 * `chime` is played when a Pomodoro phase ends (in addition to the music bell).
 */
export function createModes(doc, { canvas, panel, params, chime }) {
  const ui = {
    relax: element(doc, 'relax'),
    pomodoro: element(doc, 'pomodoro'),
    map: element(doc, 'map-btn'),
    photo: element(doc, 'photo'),
    pill: element(doc, 'pomo-pill'),
    lineMap: element(doc, 'line-map'),
    flash: element(doc, 'photo-flash'),
  };
  const music = createMusic();
  const lineMap = createLineMap(element(doc, 'map-svg'), element(doc, 'map-lap'));
  const durations = durationsFromParams(params);
  let pomodoro = null;
  let lastPill = 0;
  let distanceKm = 0;

  async function setRelax(on) {
    doc.body.classList.toggle('relax', on);
    setPressed(ui.relax, on);
    if (on) {
      panel.classList.add('hidden');
      await doc.documentElement.requestFullscreen?.().catch((err) => console.warn('Fullscreen unavailable:', err));
      await music.start().catch((err) => console.error('Music unavailable:', err));
      return;
    }
    music.stop();
    if (doc.fullscreenElement) await doc.exitFullscreen().catch(() => {});
  }

  const stop = (e) => e.stopPropagation();
  ui.relax.addEventListener('click', (e) => { stop(e); setRelax(!doc.body.classList.contains('relax')); });
  doc.addEventListener('fullscreenchange', () => {
    if (!doc.fullscreenElement && doc.body.classList.contains('relax')) setRelax(false);
  });
  ui.pomodoro.addEventListener('click', (e) => {
    stop(e);
    pomodoro = pomodoro ? null : startPomodoro(Date.now(), durations);
    setPressed(ui.pomodoro, pomodoro !== null);
    ui.pill.classList.toggle('hidden', pomodoro === null);
  });
  ui.map.addEventListener('click', (e) => {
    stop(e);
    const visible = ui.lineMap.classList.toggle('hidden') === false;
    setPressed(ui.map, visible);
  });
  ui.photo.addEventListener('click', (e) => { stop(e); savePhoto(canvas, distanceKm, ui.flash); });

  return {
    /** Called every frame with the simulation distance (meters). */
    tick(distance) {
      distanceKm = distance / 1000;
      if (!ui.lineMap.classList.contains('hidden')) lineMap.update(distance);
      if (!pomodoro) return;
      const now = Date.now();
      const next = tickPomodoro(pomodoro, now);
      pomodoro = next.pomodoro;
      if (next.switched) {
        music.bell();
        chime();
        ui.pill.classList.remove('pulse');
        void ui.pill.offsetWidth;
        ui.pill.classList.add('pulse');
      }
      if (now - lastPill < PILL_INTERVAL) return;
      lastPill = now;
      ui.pill.textContent = pomodoroLabel(pomodoro, now);
      ui.pill.dataset.phase = pomodoro.phase;
    },
  };
}
