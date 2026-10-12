import { CATEGORIES, DISCOVERIES } from './journalData.js';
import { dateLocale, onLangChange, t } from './i18n.js';
import { entryText } from './notebook.js';
import { LINE_PAGES } from './passport.js';
import { SPREAD, drawPassport } from './passportDraw.js';

// The trip album: one booklet gathering what the browser kept of the journey (journal,
// passport, notebook, letters, the intention), to read on screen or print / save as PDF.

const KEYS = {
  journal: 'train-journey:journal:v1',
  notebook: 'train-journey:notebook:v1',
  passport: 'train-journey:passport:v1',
  letters: 'train-journey:letters:v1',
  intention: 'train-journey:intention:v1',
  missions: 'train-journey:missions:v1',
};
const NOTEBOOK_LINES = 40;

function readJSON(key, fallback) {
  try {
    const data = JSON.parse(localStorage.getItem(key) ?? 'null');
    return data ?? fallback;
  } catch (err) {
    console.warn(`Album: ${key} unavailable:`, err);
    return fallback;
  }
}

/** Everything the album shows, read from the browser storage (missing parts become empty). */
export function albumData() {
  const journal = readJSON(KEYS.journal, {});
  const found = journal.found && typeof journal.found === 'object' ? journal.found : {};
  const passport = readJSON(KEYS.passport, {});
  const notebook = readJSON(KEYS.notebook, []);
  const letters = readJSON(KEYS.letters, []);
  const missions = readJSON(KEYS.missions, {});
  const stamps = LINE_PAGES.reduce((n, p) => n + p.stations.filter((s) => passport[p.lineId]?.[s.name]).length, 0);
  return {
    km: (Number(journal.traveled) || 0) / 1000,
    minutes: (Number(journal.seconds) || 0) / 60,
    found,
    stickers: DISCOVERIES.filter((d) => found[d.id]),
    passport,
    stamps,
    notebook: Array.isArray(notebook) ? notebook.slice(-NOTEBOOK_LINES) : [],
    letters: Array.isArray(letters) ? letters : [],
    intention: readJSON(KEYS.intention, {}),
    missions: Number(missions.total) || 0,
  };
}

const onBoard = (minutes) => (minutes >= 60 ? `${Math.floor(minutes / 60)} h ${Math.round(minutes % 60)} min` : `${Math.round(minutes)} min`);

function el(doc, tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text; // user text (letters, intention) only ever goes in as text
  return node;
}

function page(doc, title) {
  const section = el(doc, 'section', 'album-page');
  section.append(el(doc, 'h3', '', t(title)));
  return section;
}

function cover(doc, data, photo) {
  const section = el(doc, 'section', 'album-page album-cover');
  section.append(el(doc, 'p', 'album-kicker', 'Train Journey · Fractal Nexus'), el(doc, 'h2', '', t('Álbum da viagem')));
  if (photo) {
    const img = el(doc, 'img', 'album-photo');
    img.src = photo;
    img.alt = t('A vista da janela agora');
    section.append(img);
  }
  const stats = el(doc, 'ul', 'album-stats');
  [
    [`${data.km.toFixed(1)} km`, 'viajados'],
    [onBoard(data.minutes), 'a bordo'],
    [`${data.stickers.length}/${DISCOVERIES.length}`, 'figurinhas'],
    [String(data.stamps), 'carimbos'],
    [String(data.missions), 'missões cumpridas'],
  ].forEach(([value, label]) => {
    const li = el(doc, 'li');
    li.append(el(doc, 'strong', '', value), el(doc, 'span', '', t(label)));
    stats.append(li);
  });
  section.append(stats, el(doc, 'p', 'album-date', new Date().toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long', year: 'numeric' })));
  return section;
}

function passportPage(doc, data) {
  const section = page(doc, 'Passaporte');
  LINE_PAGES.forEach((p) => {
    const canvas = el(doc, 'canvas', 'album-spread');
    canvas.width = SPREAD.w;
    canvas.height = SPREAD.h;
    drawPassport(canvas.getContext('2d'), { ...p, stamps: data.passport[p.lineId] ?? {} });
    const img = el(doc, 'img', 'album-spread'); // an image prints more reliably than a canvas
    img.src = canvas.toDataURL('image/png');
    img.alt = t(p.lineName);
    section.append(img);
  });
  return section;
}

function stickersPage(doc, data) {
  const section = page(doc, 'Figurinhas');
  if (data.stickers.length === 0) section.append(el(doc, 'p', 'album-empty', t('Nenhuma figurinha ainda. A viagem está só começando.')));
  CATEGORIES.forEach((cat) => {
    const items = data.stickers.filter((d) => d.category === cat);
    if (items.length === 0) return;
    section.append(el(doc, 'h4', '', t(cat)));
    const grid = el(doc, 'ul', 'album-stickers');
    items.forEach((d) => {
      const li = el(doc, 'li');
      const rec = data.found[d.id];
      li.append(el(doc, 'span', 'album-icon', d.icon), el(doc, 'span', '', t(d.title)), el(doc, 'small', '', rec ? `km ${Number(rec.km).toFixed(1)} · ${rec.clock}` : ''));
      grid.append(li);
    });
    section.append(grid);
  });
  return section;
}

function wordsPage(doc, data) {
  const section = page(doc, 'Caderno e cartas');
  if (data.intention?.text) {
    section.append(el(doc, 'h4', '', t('Intenção da viagem')), el(doc, 'blockquote', 'album-quote', `“${data.intention.text}”`));
  }
  if (data.letters.length > 0) {
    section.append(el(doc, 'h4', '', t('Cartas recebidas')));
    data.letters.forEach((letter) => {
      section.append(el(doc, 'blockquote', 'album-quote', `“${letter.text}”`), el(doc, 'p', 'album-sign', `— ${letter.name || t('um viajante')}, ${letter.date ?? ''}`));
    });
  }
  section.append(el(doc, 'h4', '', t('Do caderno')));
  const list = el(doc, 'ol', 'album-notebook');
  data.notebook.forEach((entry) => list.append(el(doc, 'li', '', entryText(entry))));
  if (data.notebook.length === 0) list.append(el(doc, 'li', '', t('O caderno ainda está em branco.')));
  section.append(list);
  return section;
}

/** The "Album" button: builds the booklet from storage when opened; print saves it as PDF. */
export function createAlbum(doc, { canvas, onOpen = () => {} }) {
  const ui = ['album-btn', 'album', 'album-pages', 'album-print', 'album-close'].map((id) => doc.getElementById(id));
  if (ui.some((n) => !n)) throw new Error('Missing album elements');
  const [button, book, pages, print, close] = ui;
  const stop = (e) => e.stopPropagation();

  function build() {
    let photo = null;
    try {
      photo = canvas.toDataURL('image/jpeg', 0.85);
    } catch (err) {
      console.warn('Album photo unavailable:', err);
    }
    const data = albumData();
    pages.replaceChildren(cover(doc, data, photo), passportPage(doc, data), stickersPage(doc, data), wordsPage(doc, data));
  }

  button.addEventListener('click', (e) => {
    stop(e);
    build();
    book.classList.remove('hidden');
    doc.body.classList.add('album-open');
    onOpen();
  });
  close.addEventListener('click', (e) => {
    stop(e);
    book.classList.add('hidden');
    doc.body.classList.remove('album-open');
  });
  print.addEventListener('click', (e) => {
    stop(e);
    window.print();
  });
  onLangChange(() => { if (!book.classList.contains('hidden')) build(); });
}
