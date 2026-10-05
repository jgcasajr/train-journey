import { biomeName, lineAt, LINES } from './biomes.js';
import { bellaAt } from './bella.js';
import { t } from './i18n.js';
import { nextStation } from './stations.js';

const DESCRIBE_EVERY = 8000; // ms: the scene description is refreshed at most this often
const LARGE_SCALE = 1.3;

let textScale = 1;
/** Size factor for text drawn on the canvas (speech and thought bubbles). */
export const canvasTextScale = () => textScale;

function element(doc, id) {
  const node = doc.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node;
}

const ACTIVITIES = [
  ['sleep', 'Ela está dormindo.'], ['rest', 'Ela cochila encostada no vidro.'], ['read', 'Ela está lendo.'],
  ['knit', 'Ela está tricotando.'], ['sketch', 'Ela está desenhando a paisagem.'], ['sip', 'Ela toma um café.'],
  ['snack', 'Ela come um sanduíche.'], ['eat', 'Ela está almoçando.'], ['talk', 'Ela está conversando.'],
];

function partOfDay(dayTime) {
  const h = dayTime * 24;
  if (h < 5 || h >= 20) return 'Noite';
  if (h < 12) return 'Manhã';
  if (h < 17.5) return 'Tarde';
  return 'Entardecer';
}

function weatherText(env) {
  if (env.rain > 0.5 && env.storm > 0.4) return 'tempestade lá fora';
  if (env.rain > 0.3) return 'chovendo lá fora';
  if (env.sunElev < -0.1) return 'céu noturno';
  return 'céu aberto';
}

/** A short spoken description of the view: where, when, weather, the next stop and what she does. */
export function describeScene(state, env) {
  const where = `${t(LINES[lineAt(state.distance)].name)}, ${t(biomeName(state.distance))}`;
  const when = `${t(partOfDay(env.dayTime))}, ${t(weatherText(env))}`;
  const next = nextStation(state.distance, state.served?.id);
  const stop = state.dwell > 0 && state.served
    ? t(`Parado na estação ${state.served.name}.`)
    : next ? t(`Próxima estação: ${next.name}.`) : ''; // no distance: it would change every few seconds
  const top = Object.entries(state.pose ?? {}).sort((a, b) => b[1] - a[1])[0];
  const doing = ACTIVITIES.find(([k]) => k === top?.[0] && top[1] > 0.5)?.[1] ?? 'Ela olha a paisagem pela janela.';
  const bella = bellaAt(state) ? t('A Bella corre ao lado do trem.') : '';
  return `${where}. ${when}. ${stop} ${t(doing)} ${bella}`.replace(/\s+/g, ' ').trim();
}

/**
 * Accessibility settings (reduced motion, larger text) and a live, screen-reader-only
 * description of the scene plus what people say in it.
 */
export function createA11y(doc, { savedSettings }) {
  const ui = { motion: element(doc, 'reduce-motion'), large: element(doc, 'large-text'), live: element(doc, 'scene-desc') };
  if (savedSettings['reduce-motion'] === undefined) {
    ui.motion.checked = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
  const apply = () => {
    doc.body.classList.toggle('reduce-motion', ui.motion.checked);
    doc.body.classList.toggle('large-text', ui.large.checked);
    textScale = ui.large.checked ? LARGE_SCALE : 1;
  };
  ui.motion.addEventListener('change', apply);
  ui.large.addEventListener('change', apply);
  apply();

  let lastText = '';
  let lastAt = 0;
  let lastSpeech = null;
  return {
    /** True when motion should be kept to a minimum (no sway, jolts, flashes or head-look). */
    calm: () => ui.motion.checked,
    /** Called every frame: refreshes the live description and announces new lines spoken. */
    observe(state, env) {
      const said = state.speech?.text ?? state.passerbySpeech?.text ?? null;
      if (said && said !== lastSpeech) {
        lastSpeech = said;
        ui.live.textContent = t(`Fala: “${said}”`);
        lastAt = Date.now();
        return;
      }
      lastSpeech = said;
      const now = Date.now();
      if (now - lastAt < DESCRIBE_EVERY) return;
      const text = describeScene(state, env);
      if (text === lastText) return;
      lastText = text;
      lastAt = now;
      ui.live.textContent = text;
    },
  };
}
