import { eta } from './destination.js';
import { LINES } from './biomes.js';
import { LINE_STATIONS } from './stations.js';
import { t } from './i18n.js';

const CARD_DELAY = 2.5; // seconds after arriving (after her wave) before the summary card shows

function element(doc, id) {
  const node = doc.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node;
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/**
 * Destination picker, board text and the arrival card.
 * `onContinue` resumes the trip; `foundCount()` is the journal total (to count discoveries per trip).
 */
export function createArrival(doc, { panel, onContinue, foundCount }) {
  const ui = {
    select: element(doc, 'destination'),
    card: element(doc, 'arrival'),
    title: element(doc, 'arrival-title'),
    stats: element(doc, 'arrival-stats'),
    cont: element(doc, 'arrival-continue'),
    choose: element(doc, 'arrival-choose'),
  };
  const groups = LINES.map((line, i) => {
    const group = doc.createElement('optgroup');
    group.label = t(line.name);
    group.append(...LINE_STATIONS[i].filter((name) => i === 0 || !LINE_STATIONS[0].includes(name)).map((name) => new Option(name, name)));
    return group;
  });
  ui.select.append(...groups);
  let foundAtStart = foundCount();
  let shownFor = null; // arrival shown (by time), so the card is filled once

  const stop = (e) => e.stopPropagation();
  ui.select.addEventListener('change', () => { foundAtStart = foundCount(); });
  ui.cont.addEventListener('click', (e) => {
    stop(e);
    ui.select.value = '';
    onContinue();
  });
  ui.choose.addEventListener('click', (e) => {
    stop(e);
    panel.classList.remove('hidden');
    ui.select.focus();
  });

  return {
    destination: () => ui.select.value,

    /** Text for the board: remaining distance and time, or the arrival. */
    boardText(state, targetKmh) {
      if (state.holding && state.arrivedAt) return t(`Chegamos: ${state.arrivedAt.name}`);
      const e = eta(state, targetKmh);
      if (!e) return null;
      if (e.via) return t(`Destino: ${e.name} · baldeação em ${e.via} · ${e.km.toFixed(1)} km`);
      return t(`Destino: ${e.name} · ${e.km.toFixed(1)} km · ~${e.minutes} min`);
    },

    update(state) {
      const arrived = state.holding && state.arrivedAt;
      const show = arrived && state.time - state.arrivedAt.time > CARD_DELAY;
      ui.card.classList.toggle('hidden', !show);
      if (!show || shownFor === state.arrivedAt.time) return;
      shownFor = state.arrivedAt.time;
      const { name, km, minutes } = state.arrivedAt;
      const found = Math.max(0, foundCount() - foundAtStart);
      ui.title.textContent = t(`Você chegou a ${name}!`);
      ui.stats.textContent = t(`${km.toFixed(1)} km em ${Math.max(1, Math.round(minutes))} min · ${plural(found, 'descoberta nova', 'descobertas novas')} no diário`);
      foundAtStart = foundCount();
    },
  };
}
