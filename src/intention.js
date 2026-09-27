import { BRAND } from './brand.js';
import { currentLang, t } from './i18n.js';

const STORAGE_KEY = 'train-journey:intention:v1';
const MAX_LENGTH = 160;
const MIN_TRIP = 1000; // meters traveled before the intention can come back
const ASK_DELAY = 6000; // ms after load before the first-ever invitation

/** Stored: { text, writtenAt (ISO), returned, asked }. Storage may be unavailable. */
function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    return data && typeof data === 'object' ? data : {};
  } catch (err) {
    console.warn('Intention storage unavailable:', err);
    return {};
  }
}

function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Intention not saved:', err);
  }
}

function element(doc, id) {
  const node = doc.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node;
}

const clean = (text) => text.replace(/\s+/g, ' ').trim().slice(0, MAX_LENGTH);
const dateOf = (iso) => new Date(iso).toLocaleDateString(currentLang() === 'pt' ? 'pt-BR' : 'en-GB');

/** Where the intention comes back: the Nexus station, or the chosen destination. */
function returnPlace(state) {
  if (state.dwell > 0 && state.served?.name === BRAND.station) return BRAND.station;
  if (state.holding && state.arrivedAt) return state.arrivedAt.name;
  return null;
}

/**
 * Intention journal: the traveler writes an intention, it rides along sealed (she remembers
 * it now and then) and comes back at the Nexus station or at the destination.
 */
export function createIntention(doc, { panel, onWrite, onReturn, makePostcard }) {
  const ui = {
    button: element(doc, 'intention-btn'),
    ask: element(doc, 'intention'),
    text: element(doc, 'intention-text'),
    save: element(doc, 'intention-save'),
    cancel: element(doc, 'intention-cancel'),
    back: element(doc, 'intention-back'),
    quote: element(doc, 'intention-quote'),
    meta: element(doc, 'intention-meta'),
    postcard: element(doc, 'intention-postcard'),
    again: element(doc, 'intention-new'),
    close: element(doc, 'intention-close'),
  };
  let data = load();
  let distance = 0;
  let baseline = null; // distance when the intention was written, or when this session started
  let returned = null; // the intention shown on the "it came back" card

  const store = (next) => { data = next; save(next); };
  const stop = (e) => e.stopPropagation();

  function openAsk() {
    ui.back.classList.add('hidden');
    ui.text.value = data.text && !data.returned ? data.text : '';
    ui.ask.classList.remove('hidden');
    panel.classList.add('hidden');
    ui.text.focus();
  }

  ui.button.addEventListener('click', (e) => { stop(e); openAsk(); });
  ui.cancel.addEventListener('click', (e) => { stop(e); ui.ask.classList.add('hidden'); });
  ui.save.addEventListener('click', (e) => {
    stop(e);
    const text = clean(ui.text.value);
    if (!text) { ui.text.focus(); return; }
    store({ ...data, text, writtenAt: new Date().toISOString(), returned: false, asked: true });
    baseline = distance;
    ui.ask.classList.add('hidden');
    onWrite();
  });
  ui.text.addEventListener('keydown', (e) => e.stopPropagation()); // typing must not trigger shortcuts
  ui.close.addEventListener('click', (e) => { stop(e); ui.back.classList.add('hidden'); });
  ui.again.addEventListener('click', (e) => { stop(e); openAsk(); });
  ui.postcard.addEventListener('click', (e) => {
    stop(e);
    if (!returned) return;
    makePostcard({ title: `${t('Minha intenção')} · ${dateOf(returned.writtenAt)}`, message: `“${returned.text}”` });
  });

  if (!data.asked) {
    store({ ...data, asked: true });
    setTimeout(() => { if (!data.text) openAsk(); }, ASK_DELAY);
  }

  return {
    /** The sealed intention riding along, or null. */
    current: () => (data.text && !data.returned ? data.text : null),
    /** Called every frame: brings the intention back at the Nexus station or the destination. */
    update(state) {
      distance = state.distance;
      baseline = baseline ?? distance;
      if (!data.text || data.returned) return;
      const place = returnPlace(state);
      if (!place || state.distance - baseline < MIN_TRIP) return;
      returned = data;
      store({ ...data, returned: true });
      ui.quote.textContent = `“${data.text}”`;
      ui.meta.textContent = t(`Escrita em ${dateOf(data.writtenAt)} · voltou em ${place}`);
      ui.back.classList.remove('hidden');
      onReturn();
    },
  };
}
