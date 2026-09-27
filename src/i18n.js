import { EN, EN_PATTERNS } from './lang/en.js';

const STORAGE_KEY = 'train-journey:lang';
const LANGS = ['pt', 'en'];
const ATTRS = ['title', 'aria-label'];

function initialLang() {
  const param = new URLSearchParams(window.location.search).get('lang');
  if (LANGS.includes(param)) return param;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (LANGS.includes(saved)) return saved;
  } catch (err) {
    console.warn('Language preference unavailable:', err);
  }
  return navigator.language?.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

let lang = initialLang();
let listeners = [];
const original = new WeakMap(); // DOM text node / element → its Portuguese text(s)

const lowerKeys = new Map(Object.entries(EN).map(([pt, en]) => [pt.toLowerCase(), en.toLowerCase()]));

function toEnglish(text) {
  if (EN[text] !== undefined) return EN[text];
  const lower = lowerKeys.get(text);
  if (lower !== undefined) return lower;
  for (const [re, fn] of EN_PATTERNS) {
    const m = text.match(re);
    if (m) return fn(toEnglish, ...m.slice(1));
  }
  return text;
}

export const currentLang = () => lang;

/** Runs `fn` after every language switch (for text that scripts set once). */
export function onLangChange(fn) {
  listeners = [...listeners, fn];
}

/** Translates a Portuguese UI/dialogue string into the current language. */
export function t(text) {
  if (lang === 'pt' || typeof text !== 'string' || text === '') return text;
  return toEnglish(text);
}

function translateTextNode(node) {
  if (!original.has(node)) original.set(node, node.nodeValue);
  const pt = original.get(node);
  const trimmed = pt.trim();
  if (!trimmed) return;
  const done = t(trimmed);
  node.nodeValue = pt.replace(trimmed, done);
}

function translateAttributes(el) {
  const saved = original.get(el) ?? Object.fromEntries(ATTRS.filter((a) => el.hasAttribute(a)).map((a) => [a, el.getAttribute(a)]));
  original.set(el, saved);
  Object.entries(saved).forEach(([a, pt]) => el.setAttribute(a, t(pt)));
}

/**
 * Translates the static page text (labels, options, hints, tooltips). Nodes that scripts
 * rewrite later are skipped via `data-i18n-skip`; scripts translate those themselves.
 */
export function translateDom(root) {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest('[data-i18n-skip], script, style') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);
  nodes.forEach(translateTextNode);
  root.querySelectorAll(ATTRS.map((a) => `[${a}]`).join(',')).forEach(translateAttributes);
  root.ownerDocument.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
}

/** Switches language, remembers it and re-translates the page. */
export function setLang(next, doc) {
  if (!LANGS.includes(next)) throw new Error(`Unknown language: ${next}`);
  lang = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch (err) {
    console.warn('Language preference not saved:', err);
  }
  translateDom(doc.body);
  listeners.forEach((fn) => fn(next));
}
