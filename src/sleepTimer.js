import { onLangChange, t } from './i18n.js';
import { clamp, smoothstep } from './utils.js';

export const SLEEP_CHOICES = [15, 30, 45, 60]; // minutes
const VEIL_MAX = 0.9;

function element(doc, id) {
  const node = doc.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node;
}

/**
 * How far into the timer (p 0..1) maps to the scene: the passenger dozes off right away,
 * the sound fades over the second half and the screen darkens slowly towards the end.
 */
export function sleepLevels(p) {
  const k = clamp(p);
  return {
    volume: 1 - smoothstep(0.35, 1, k),
    veil: VEIL_MAX * smoothstep(0.15, 1, k),
    drowsy: k > 0,
  };
}

const minutesLeft = (ms) => Math.max(1, Math.ceil(ms / 60000));

/**
 * Sleep timer: pick 15–60 minutes and the trip winds down — she falls asleep, the sounds and
 * the radio fade out, the screen darkens to a quiet "good night". A tap wakes everything up.
 */
export function createSleepTimer(doc, { audio, radio, onAsleep }) {
  const ui = {
    button: element(doc, 'sleep-btn'),
    dialog: element(doc, 'sleep-dialog'),
    choices: element(doc, 'sleep-choices'),
    cancel: element(doc, 'sleep-cancel'),
    veil: element(doc, 'sleep-veil'),
  };
  let run = null; // { start, ms, station } while counting down
  let asleep = null; // { station } once the timer ran out, until woken
  const stop = (e) => e.stopPropagation();

  function setVeil(opacity) {
    ui.veil.style.opacity = String(opacity);
    ui.veil.classList.toggle('hidden', opacity <= 0);
  }
  function label() {
    const left = run ? ` · ${minutesLeft(run.start + run.ms - performance.now())} min` : '';
    const text = `${t('Dormir')}${left}`;
    if (ui.button.textContent !== text) ui.button.textContent = text;
    ui.button.setAttribute('aria-pressed', String(Boolean(run)));
  }
  function restoreSound(station) {
    audio.setVolume(1);
    radio.fade(1);
    if (station && station !== 'off') radio.tune(station).catch((err) => console.error('Radio unavailable:', err));
  }

  function start(minutes) {
    ui.dialog.classList.add('hidden');
    run = { start: performance.now(), ms: minutes * 60000 };
    doc.getElementById('panel')?.classList.add('hidden');
    label();
  }
  function cancel() {
    run = null;
    restoreSound(null);
    setVeil(0);
    label();
  }
  function fallAsleep() {
    asleep = { station: radio.station };
    run = null;
    audio.setVolume(0);
    radio.tune('off');
    radio.fade(1);
    setVeil(VEIL_MAX);
    ui.veil.classList.add('asleep');
    label();
    onAsleep();
  }
  function wake() {
    if (!asleep) return;
    restoreSound(asleep.station);
    asleep = null;
    ui.veil.classList.remove('asleep');
    setVeil(0);
  }

  const renderChoices = () => ui.choices.replaceChildren(...SLEEP_CHOICES.map((m) => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.textContent = t(`${m} min`);
    b.addEventListener('click', (e) => { stop(e); start(m); });
    return b;
  }));
  renderChoices();
  onLangChange(() => { renderChoices(); label(); });
  ui.button.addEventListener('click', (e) => {
    stop(e);
    if (run) cancel();
    else ui.dialog.classList.toggle('hidden');
  });
  ui.cancel.addEventListener('click', (e) => { stop(e); ui.dialog.classList.add('hidden'); });
  ui.veil.addEventListener('click', (e) => { stop(e); wake(); });
  doc.addEventListener('keydown', () => wake());
  label();

  return {
    /** True while counting down or asleep (the announcer stays quiet). */
    active: () => Boolean(run || asleep),
    /** Called every frame: returns { drowsy } for the simulation and drives sound and veil. */
    tick(now) {
      if (asleep) return { drowsy: true };
      if (!run) return { drowsy: false };
      const p = (now - run.start) / run.ms;
      if (p >= 1) {
        fallAsleep();
        return { drowsy: true };
      }
      const levels = sleepLevels(p);
      audio.setVolume(levels.volume);
      radio.fade(levels.volume);
      setVeil(levels.veil);
      label();
      return { drowsy: levels.drowsy };
    },
  };
}
