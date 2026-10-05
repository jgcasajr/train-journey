import { LINES, lineAt, lineBiomes } from './biomes.js';
import { onLangChange, t } from './i18n.js';
import { BIOME_ICONS } from './journalData.js';
import { SPREAD, drawPassport } from './passportDraw.js';

const STORAGE_KEY = 'train-journey:passport:v1';

/** Stations of each line in order, with the icon of the landscape they stand in. */
export const LINE_PAGES = LINES.map((line, i) => ({
  lineId: line.id,
  lineName: line.name,
  stations: lineBiomes(i).filter((b) => b.station).map((b) => ({ name: b.station, icon: b.station === 'Nexus' ? '💠' : BIOME_ICONS[b.name] ?? '🚉' })),
}));

/** The book with one more stamp (the first visit's date is kept). Never mutates `book`. */
export function addStamp(book, lineId, name, now = Date.now()) {
  if (book[lineId]?.[name]) return book;
  const date = new Date(now).toLocaleDateString('pt-BR');
  return { ...book, [lineId]: { ...(book[lineId] ?? {}), [name]: { date, at: now } } };
}

/** True once every station of the line has its stamp. */
export const lineComplete = (book, lineId) =>
  LINE_PAGES.find((p) => p.lineId === lineId).stations.every((s) => book[lineId]?.[s.name]);

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return data && typeof data === 'object' ? data : {};
  } catch (err) {
    console.warn('Passport unavailable:', err);
    return {};
  }
}

function save(book) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(book));
  } catch (err) {
    console.warn('Passport not saved:', err);
  }
}

function element(doc, id) {
  const node = doc.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node;
}

/**
 * Travel passport: every station where the train stops gets a stamp on its line's page
 * (kept in the browser). Opens as a booklet, one spread per line, savable as a PNG.
 */
export function createPassport(doc, { onStamp }) {
  const ui = {
    button: element(doc, 'passport-btn'),
    book: element(doc, 'passport'),
    tabs: element(doc, 'passport-tabs'),
    canvas: element(doc, 'passport-canvas'),
    save: element(doc, 'passport-save'),
    close: element(doc, 'passport-close'),
  };
  let book = load();
  let shown = 0;
  ui.canvas.width = SPREAD.w;
  ui.canvas.height = SPREAD.h;

  function render() {
    const page = { ...LINE_PAGES[shown], stamps: book[LINE_PAGES[shown].lineId] ?? {} };
    drawPassport(ui.canvas.getContext('2d'), page);
    const count = page.stations.filter((s) => page.stamps[s.name]).length;
    ui.canvas.setAttribute('aria-label', `${t(page.lineName)}: ${t(`${count} de ${page.stations.length} carimbos`)}`);
    ui.tabs.replaceChildren(...LINE_PAGES.map((p, i) => {
      const b = doc.createElement('button');
      b.type = 'button';
      b.textContent = t(p.lineName);
      b.setAttribute('aria-pressed', String(i === shown));
      b.addEventListener('click', (e) => { e.stopPropagation(); shown = i; render(); });
      return b;
    }));
  }

  const stop = (e) => e.stopPropagation();
  ui.button.addEventListener('click', (e) => { stop(e); render(); ui.book.classList.toggle('hidden'); });
  ui.close.addEventListener('click', (e) => { stop(e); ui.book.classList.add('hidden'); });
  ui.save.addEventListener('click', (e) => {
    stop(e);
    ui.canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Passport image failed');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = doc.createElement('a');
      link.href = url;
      link.download = `passaporte-${LINE_PAGES[shown].lineId}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  });
  onLangChange(() => { if (!ui.book.classList.contains('hidden')) render(); });

  return {
    /** Called every frame: stamps the station the train is standing at (also after changing trains). */
    observe(state) {
      if (!(state.dwell > 0) || !state.served) return;
      const line = lineAt(state.distance);
      const { lineId } = LINE_PAGES[line];
      const next = addStamp(book, lineId, state.served.name);
      if (next === book) return;
      book = next;
      save(book);
      shown = line;
      if (!ui.book.classList.contains('hidden')) render();
      onStamp({ lineId, name: state.served.name, complete: lineComplete(book, lineId) });
    },
  };
}
