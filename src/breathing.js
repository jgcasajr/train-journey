import { t } from './i18n.js';
import { RAIL_LENGTH } from './journey.js';

const COUNT = 4; // rail joints per phase: breathe in for 4, out for 4
const CYCLES = 6;
const MIN_RATE = 0.6; // joints per second (slowest breathing when the train is slow)
const MAX_RATE = 1.2;
const STOPPED_RATE = 1; // standing at a station: one count per second
const END_MS = 4000;

function element(doc, id) {
  const node = doc.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node;
}

/** Counts per second, following the rail joints (clack rhythm) at the current speed. */
export function breathRate(speed) {
  if (speed < 1) return STOPPED_RATE;
  return Math.min(MAX_RATE, Math.max(MIN_RATE, speed / RAIL_LENGTH));
}

/** Where in the exercise a number of counts falls: phase, count within it (1..4), fullness 0..1. */
export function breathAt(counts) {
  const cycle = Math.floor(counts / (COUNT * 2));
  const within = counts - cycle * COUNT * 2;
  const inhale = within < COUNT;
  const p = (inhale ? within : within - COUNT) / COUNT;
  const ease = (1 - Math.cos(p * Math.PI)) / 2;
  return { cycle, inhale, count: Math.floor(inhale ? within : within - COUNT) + 1, fullness: inhale ? ease : 1 - ease };
}

/**
 * Breathing mode: a circle that grows as she breathes in and shrinks as she breathes out,
 * paced by the rail joints. Ends after a few cycles (or when stopped) with a kind word.
 */
export function createBreathing(doc, { panel, onComplete }) {
  const ui = {
    button: element(doc, 'breathe'),
    overlay: element(doc, 'breath'),
    circle: element(doc, 'breath-circle'),
    label: element(doc, 'breath-label'),
    count: element(doc, 'breath-count'),
    stop: element(doc, 'breath-stop'),
  };
  let counts = null; // null = not breathing
  let shown = '';

  const show = (label, count) => {
    const text = `${label}|${count}`;
    if (text === shown) return;
    shown = text;
    ui.label.textContent = label;
    ui.count.textContent = count;
  };
  function finish(done) {
    counts = null;
    ui.button.setAttribute('aria-pressed', 'false');
    if (!done) { ui.overlay.classList.add('hidden'); return; }
    show(t('Que bom. Siga viagem com calma.'), '');
    ui.circle.style.transform = 'translate(-50%, -50%) scale(0.75)';
    onComplete();
    setTimeout(() => { if (counts === null) ui.overlay.classList.add('hidden'); }, END_MS);
  }
  function start() {
    counts = 0;
    shown = '';
    panel.classList.add('hidden');
    ui.overlay.classList.remove('hidden');
    ui.button.setAttribute('aria-pressed', 'true');
  }

  ui.button.addEventListener('click', (e) => { e.stopPropagation(); if (counts === null) start(); else finish(false); });
  ui.stop.addEventListener('click', (e) => { e.stopPropagation(); finish(false); });
  doc.addEventListener('keydown', (e) => { if (e.key === 'Escape' && counts !== null) finish(false); });

  return {
    active: () => counts !== null,
    /** Called every frame with the real frame time and the train speed (m/s). */
    update(dt, speed) {
      if (counts === null) return;
      counts += dt * breathRate(speed);
      const b = breathAt(counts);
      if (b.cycle >= CYCLES) { finish(true); return; }
      ui.circle.style.transform = `translate(-50%, -50%) scale(${(0.45 + b.fullness * 0.55).toFixed(3)})`;
      show(t(b.inhale ? 'Inspire...' : 'Solte...'), String(b.count));
    },
  };
}
