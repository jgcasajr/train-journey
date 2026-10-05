import { biomeName, lineKm } from './biomes.js';
import { onLangChange, t } from './i18n.js';
import { thoughtAt } from './thoughts.js';
import { hash } from './utils.js';

const STORAGE_KEY = 'train-journey:notebook:v1';
const MAX_ENTRIES = 120;

/** What she writes for a discovery of each journal category ({x} = its title). */
const TEMPLATES = {
  'Estações': 'Parei em {x}. Gente chegando, gente partindo.',
  'Paisagens': 'Paisagem de hoje: {x}. Fiquei um tempo só olhando.',
  'Estações do ano': 'Lá fora é {x}. Aqui dentro também.',
  'Céu e clima': 'O céu me deu {x} hoje. Guardei na memória.',
  'Pelo caminho': '{x}: mais uma coisa bonita no caminho.',
  'Momentos': 'Um momento pra lembrar: {x}.',
  'Personagens': 'Conheci alguém no trem: {x}.',
  'Raridades': 'Vi algo raro: {x}! Nem acredito.',
  'Marcos': 'Marco da viagem: {x}.',
  'Conquistas': 'Conquista: {x}. Um passo de cada vez.',
};
/** Discoveries with a line of their own. */
const BY_ID = {
  bella: 'A Bella apareceu e correu ao lado do trem. Corre, Bella!',
  bellaPet: 'Fiz carinho na Bella. Saudade boa.',
  sleepTimer: 'Dormi embalada pelo barulho dos trilhos. Boa noite.',
};
const THOUGHT = 'Pensei: “{x}”';
const SKETCH = 'Desenhei a paisagem no bloquinho: {x}.';
const FIRST_PAGE = 'Comecei este caderno hoje. Nova fase, página em branco.';

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Notebook storage unavailable:', err);
    return [];
  }
}

function save(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.warn('Notebook not saved:', err);
  }
}

function element(doc, id) {
  const node = doc.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node;
}

const clockOf = (dayTime) => {
  const minutes = Math.round(dayTime * 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};

/** One entry as text in the current language. */
export function entryText(entry) {
  // `raw`: someone's own words (a letter), never translated.
  const body = t(entry.tpl).replace('{x}', entry.x ? t(entry.x) : '') + (entry.raw ? ` “${entry.raw}”` : '');
  return `${entry.date} ${entry.clock} · km ${entry.km.toFixed(1)} — ${body}`;
}

function download(doc, entries) {
  const text = [t('Caderno da passageira'), '', ...entries.map(entryText)].join('\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = doc.createElement('a');
  link.href = url;
  link.download = 'caderno-da-passageira.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Her notebook: for every new discovery she writes a line (with the time and the km),
 * kept in the browser; it opens as a lined page and can be saved as a .txt file.
 */
export function createNotebook(doc) {
  const ui = {
    button: element(doc, 'notebook-btn'),
    book: element(doc, 'notebook'),
    list: element(doc, 'notebook-list'),
    save: element(doc, 'notebook-save'),
    close: element(doc, 'notebook-close'),
  };
  let entries = load();

  function render() {
    ui.list.replaceChildren(...[...entries].reverse().map((e) => {
      const li = doc.createElement('li');
      li.textContent = entryText(e);
      return li;
    }));
  }
  const write = (items) => {
    entries = [...entries, ...items].slice(-MAX_ENTRIES);
    save(entries);
    if (!ui.book.classList.contains('hidden')) render();
  };
  const stop = (e) => e.stopPropagation();
  ui.button.addEventListener('click', (e) => { stop(e); render(); ui.book.classList.toggle('hidden'); });
  ui.close.addEventListener('click', (e) => { stop(e); ui.book.classList.add('hidden'); });
  ui.save.addEventListener('click', (e) => { stop(e); download(doc, entries); });
  onLangChange(() => { if (!ui.book.classList.contains('hidden')) render(); });

  let lastThought = null;
  let sketching = false;
  const stampOf = (state) => ({ clock: clockOf(state.dayTime), km: lineKm(state.distance), date: new Date().toLocaleDateString('pt-BR') });

  return {
    /** Called with the journal's new discoveries: one line each. */
    note(discoveries, state) {
      const stamp = stampOf(state);
      const lines = discoveries.filter((d) => BY_ID[d.id] || TEMPLATES[d.category])
        .map((d) => (BY_ID[d.id] ? { ...stamp, tpl: BY_ID[d.id], x: '' } : { ...stamp, tpl: TEMPLATES[d.category], x: d.title }));
      if (lines.length > 0) write(lines);
    },
    /** A letter she received, copied into the notebook. */
    letter(letter, state) {
      write([{ ...stampOf(state), tpl: 'Recebi uma carta de {x}:', x: letter.name || 'um viajante', raw: letter.text }]);
    },
    /** Called every frame: the first page (once), and about half of her thoughts get written down. */
    observe(state, env) {
      if (entries.length === 0) write([{ ...stampOf(state), tpl: FIRST_PAGE, x: '' }]);
      const sketchingNow = (state.pose?.sketch ?? 0) > 0.8;
      if (sketchingNow && !sketching) write([{ ...stampOf(state), tpl: SKETCH, x: biomeName(state.distance) }]);
      sketching = sketchingNow;
      const thought = thoughtAt(state, env, false);
      if (!thought || thought === lastThought) return;
      lastThought = thought;
      if (hash(Math.floor(state.time), 2521) < 0.5) write([{ ...stampOf(state), tpl: THOUGHT, x: thought }]);
    },
  };
}
