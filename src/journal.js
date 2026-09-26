import { CATEGORIES, DISCOVERIES, factsFrom } from './journalData.js';

const STORAGE_KEY = 'train-journey:journal:v1';
const TOAST_MS = 3800;
const MAX_STEP = 200; // meters; bigger jumps (?km=, loops) don't count as traveled distance

/** Stored progress: { found: { [id]: { km, clock } }, traveled }. Storage may be unavailable. */
function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    return data && typeof data.found === 'object' ? { found: data.found, traveled: Number(data.traveled) || 0 } : null;
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
  title.textContent = record ? discovery.title : '???';
  const meta = doc.createElement('small');
  meta.textContent = record ? `km ${record.km.toFixed(1)} · ${record.clock}` : discovery.hint;
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
  let progress = load() ?? { found: {}, traveled: 0 };
  let lastDistance = null;
  let toasts = [];
  let toastTimer = null;

  function render() {
    const total = DISCOVERIES.length;
    const done = DISCOVERIES.filter((d) => progress.found[d.id]).length;
    ui.button.textContent = `Diário ${done}/${total}`;
    ui.count.textContent = `${done} de ${total} descobertas · ${(progress.traveled / 1000).toFixed(1)} km viajados`;
    const sections = CATEGORIES.map((cat) => {
      const section = doc.createElement('section');
      const heading = doc.createElement('h3');
      heading.textContent = cat;
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
    ui.toast.textContent = `${next.icon}  Nova descoberta: ${next.title}!`;
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
      ui.reset.textContent = 'Clique de novo para apagar tudo';
      return;
    }
    ui.reset.dataset.armed = 'false';
    ui.reset.textContent = 'Recomeçar diário';
    progress = { found: {}, traveled: 0 };
    save(progress);
    render();
  });
  render();

  return {
    foundCount: () => DISCOVERIES.filter((d) => progress.found[d.id]).length,
    /** Called every frame; records whatever is newly discovered. */
    observe(state, env, view) {
      const step = lastDistance === null ? 0 : state.distance - lastDistance;
      lastDistance = state.distance;
      const traveled = progress.traveled + (step > 0 && step < MAX_STEP ? step : 0);
      const facts = factsFrom({ state, env, view, traveled });
      const fresh = DISCOVERIES.filter((d) => !progress.found[d.id] && d.test(facts));
      const record = { km: state.distance / 1000, clock: clockOf(state.dayTime) };
      progress = {
        traveled,
        found: { ...progress.found, ...Object.fromEntries(fresh.map((d) => [d.id, record])) },
      };
      if (fresh.length === 0) {
        if (Math.floor(traveled / 1000) !== Math.floor((traveled - step) / 1000)) save(progress);
        return;
      }
      save(progress);
      render();
      toasts = [...toasts, ...fresh];
      showNextToast();
      onDiscover(fresh);
    },
  };
}
