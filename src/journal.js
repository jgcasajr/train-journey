import { lineKm } from './biomes.js';
import { CATEGORIES, DISCOVERIES, factsFrom } from './journalData.js';
import { onLangChange, t } from './i18n.js';

const STORAGE_KEY = 'train-journey:journal:v1';
const TOAST_MS = 3800;
const MAX_TICK = 1; // seconds; longer gaps (tab in background) don't count as time on board
const EMPTY = { found: {}, traveled: 0, seconds: 0, days: 0 };
const MAX_STEP = 200; // meters; bigger jumps (?km=, loops) don't count as traveled distance

/** Stored progress: { found: { [id]: { km, clock } }, traveled, seconds, days }. Storage may be unavailable. */
function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!data || typeof data.found !== 'object') return null;
    return { found: data.found, traveled: Number(data.traveled) || 0, seconds: Number(data.seconds) || 0, days: Number(data.days) || 0 };
  } catch (err) {
    console.warn('Journal storage unavailable:', err);
    return null;
  }
}

function save(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    console.warn('Journal not saved:', err);
  }
}

const clockOf = (dayTime) => {
  const minutes = Math.round(dayTime * 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};

/** "1 h 05 min", "12 min" */
const onBoard = (seconds) => {
  const min = Math.floor(seconds / 60);
  return min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min` : `${min} min`;
};

function element(doc, id) {
  const node = doc.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node;
}

function card(doc, discovery, record) {
  const node = doc.createElement('li');
  node.className = record ? 'sticker found' : 'sticker';
  const icon = doc.createElement('span');
  icon.className = 'sticker-icon';
  icon.textContent = record ? discovery.icon : '?';
  const title = doc.createElement('strong');
  title.textContent = record ? t(discovery.title) : '???';
  const meta = doc.createElement('small');
  meta.textContent = record ? `km ${record.km.toFixed(1)} · ${record.clock}` : t(discovery.hint);
  node.append(icon, title, meta);
  return node;
}

/**
 * Travel journal: watches every frame for discoveries, remembers them (localStorage),
 * pops a toast for each new one and renders the sticker book.
 */
export function createJournal(doc, { onDiscover }) {
  const ui = {
    button: element(doc, 'journal-btn'),
    book: element(doc, 'journal'),
    grid: element(doc, 'journal-grid'),
    count: element(doc, 'journal-count'),
    reset: element(doc, 'journal-reset'),
    close: element(doc, 'journal-close'),
    toast: element(doc, 'toast'),
  };
  let progress = load() ?? EMPTY;
  let lastDistance = null;
  let lastTime = null;
  let lastDay = null;
  let awarded = new Set();
  let toasts = [];
  let toastTimer = null;

  function render() {
    const total = DISCOVERIES.length;
    const done = DISCOVERIES.filter((d) => progress.found[d.id]).length;
    ui.button.textContent = t(`Diário ${done}/${total}`);
    ui.count.textContent = t(`${done} de ${total} descobertas · ${(progress.traveled / 1000).toFixed(1)} km viajados · ${onBoard(progress.seconds)} a bordo`);
    const sections = CATEGORIES.map((cat) => {
      const section = doc.createElement('section');
      const heading = doc.createElement('h3');
      heading.textContent = t(cat);
      const list = doc.createElement('ul');
      list.append(...DISCOVERIES.filter((d) => d.category === cat).map((d) => card(doc, d, progress.found[d.id])));
      section.append(heading, list);
      return section;
    });
    ui.grid.replaceChildren(...sections);
  }

  function showNextToast() {
    if (toastTimer || toasts.length === 0) return;
    const [next, ...rest] = toasts;
    toasts = rest;
    ui.toast.textContent = t(`${next.icon}  Nova descoberta: ${next.title}!`);
    ui.toast.classList.add('visible');
    toastTimer = setTimeout(() => {
      ui.toast.classList.remove('visible');
      toastTimer = setTimeout(() => { toastTimer = null; showNextToast(); }, 400);
    }, TOAST_MS);
  }

  const stop = (e) => e.stopPropagation();
  ui.button.addEventListener('click', (e) => {
    stop(e);
    render();
    ui.book.classList.toggle('hidden');
  });
  ui.close.addEventListener('click', (e) => { stop(e); ui.book.classList.add('hidden'); });
  ui.reset.addEventListener('click', (e) => {
    stop(e);
    if (ui.reset.dataset.armed !== 'true') {
      ui.reset.dataset.armed = 'true';
      ui.reset.textContent = t('Clique de novo para apagar tudo');
      return;
    }
    ui.reset.dataset.armed = 'false';
    ui.reset.textContent = t('Recomeçar diário');
    progress = EMPTY;
    awarded = new Set();
    save(progress);
    render();
  });
  render();
  const showReset = () => { ui.reset.textContent = t(ui.reset.dataset.armed === 'true' ? 'Clique de novo para apagar tudo' : 'Recomeçar diário'); };
  showReset();
  onLangChange(() => { render(); showReset(); });

  return {
    foundCount: () => DISCOVERIES.filter((d) => progress.found[d.id]).length,
    /** Marks something that happened outside the scene (e.g. a postcard sent); checked next frame. */
    award(id) { awarded = new Set([...awarded, id]); },
    /** Called every frame; records whatever is newly discovered. */
    observe(state, env, view) {
      const step = lastDistance === null ? 0 : state.distance - lastDistance;
      const tick = lastTime === null ? 0 : state.time - lastTime;
      const newDay = lastDay !== null && state.dayCount === lastDay + 1;
      lastDistance = state.distance;
      lastTime = state.time;
      lastDay = state.dayCount;
      const traveled = progress.traveled + (step > 0 && step < MAX_STEP ? step : 0);
      const seconds = progress.seconds + (tick > 0 && tick < MAX_TICK ? tick : 0);
      const days = progress.days + (newDay ? 1 : 0);
      const facts = { ...factsFrom({ state, env, view, traveled }), minutes: seconds / 60, days, awarded };
      const fresh = DISCOVERIES.filter((d) => !progress.found[d.id] && d.test(facts));
      const record = { km: lineKm(state.distance), clock: clockOf(state.dayTime) };
      progress = {
        traveled,
        seconds,
        days,
        found: { ...progress.found, ...Object.fromEntries(fresh.map((d) => [d.id, record])) },
      };
      if (fresh.length === 0) {
        if (Math.floor(seconds / 30) !== Math.floor((seconds - tick) / 30) || newDay) save(progress);
        return;
      }
      save(progress);
      render();
      toasts = [...toasts, ...fresh];
      showNextToast();
      onDiscover(fresh, state);
    },
  };
}
