import { t } from './i18n.js';

const STORAGE_KEY = 'train-journey:letters:v1';
const MAX_TEXT = 280;
const MAX_NAME = 40;
const MAX_KEPT = 30;
const SHOW_AFTER_MS = 3500; // after the opening card, once the trip is under way

// eslint-disable-next-line no-control-regex
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

/** Letter → URL-safe text (base64url of UTF-8 JSON). */
export function encodeLetter({ text, name, date }) {
  const bytes = new TextEncoder().encode(JSON.stringify({ m: clean(text, MAX_TEXT), n: clean(name, MAX_NAME), d: date }));
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** URL text → { text, name, date }, or null if it isn't a valid letter. */
export function decodeLetter(encoded) {
  if (!encoded || encoded.length > 2000) return null;
  try {
    const bin = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
    const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    const text = clean(data?.m, MAX_TEXT);
    if (!text) return null;
    return { text, name: clean(data.n, MAX_NAME), date: clean(data.d, 20) };
  } catch (err) {
    console.warn('Ignoring an unreadable letter:', err);
    return null;
  }
}

function element(doc, id) {
  const node = doc.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node;
}

function keep(letter) {
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    const next = [...(Array.isArray(list) ? list : []), letter].slice(-MAX_KEPT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (err) {
    console.warn('Letter not kept:', err);
  }
}

/**
 * Letters between travelers, carried inside shared links: write one when sharing the view,
 * receive one when opening a link (as an envelope during the trip), reply with another link.
 */
export function createLetters(doc, { onReceived, onSaveToNotebook }) {
  const ui = {
    compose: element(doc, 'letter-compose'),
    title: element(doc, 'letter-compose-title'),
    text: element(doc, 'letter-text'),
    name: element(doc, 'letter-name'),
    send: element(doc, 'letter-send'),
    plain: element(doc, 'letter-plain'),
    cancel: element(doc, 'letter-cancel'),
    card: element(doc, 'letter-card'),
    body: element(doc, 'letter-body'),
    from: element(doc, 'letter-from'),
    reply: element(doc, 'letter-reply'),
    save: element(doc, 'letter-save'),
    close: element(doc, 'letter-close'),
  };
  let pending = null; // resolve function of the open compose dialog
  let received = null;
  const stop = (e) => e.stopPropagation();
  [ui.text, ui.name].forEach((n) => n.addEventListener('keydown', stop)); // typing must not trigger shortcuts

  function finish(result) {
    ui.compose.classList.add('hidden');
    const resolve = pending;
    pending = null;
    resolve?.(result);
  }
  ui.send.addEventListener('click', (e) => {
    stop(e);
    const text = clean(ui.text.value, MAX_TEXT);
    finish(text ? { text, name: clean(ui.name.value, MAX_NAME), date: new Date().toLocaleDateString('pt-BR') } : null);
  });
  ui.plain.addEventListener('click', (e) => { stop(e); finish(null); });
  ui.cancel.addEventListener('click', (e) => { stop(e); finish(undefined); });

  /** Opens the "write a letter" card; resolves to a letter, null (share without one) or undefined (cancel). */
  function compose(replyTo = null) {
    ui.title.textContent = replyTo?.name ? t(`Responder a ${replyTo.name}`) : t('Uma carta junto com a vista?');
    ui.text.value = '';
    ui.compose.classList.remove('hidden');
    ui.text.focus();
    return new Promise((resolve) => { pending = resolve; });
  }

  ui.close.addEventListener('click', (e) => { stop(e); ui.card.classList.add('hidden'); });
  ui.save.addEventListener('click', (e) => {
    stop(e);
    if (received) onSaveToNotebook(received);
    ui.save.disabled = true;
  });

  /** Shows a letter that came in the page address (once), then removes it from the address. */
  function receive(params, where) {
    const letter = decodeLetter(params.get('carta'));
    if (!letter) return;
    received = letter;
    keep(letter);
    const url = new URL(window.location.href);
    url.searchParams.delete('carta');
    window.history.replaceState(null, '', url);
    ui.body.textContent = `“${letter.text}”`;
    const signature = letter.name || t('um viajante');
    ui.from.textContent = t(`— ${signature}, ${letter.date}${where ? ` · enviada de ${where}` : ''}`);
    setTimeout(() => {
      ui.card.classList.remove('hidden');
      onReceived(letter);
    }, SHOW_AFTER_MS);
  }

  return { compose, receive, replyTarget: () => received };
}
