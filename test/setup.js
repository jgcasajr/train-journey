// Minimal browser globals so the app's modules can be imported in Node (no DOM is used).
const store = new Map();

globalThis.window ??= { location: { search: '?lang=pt', href: 'http://localhost/', origin: 'http://localhost', pathname: '/' } };
globalThis.localStorage ??= {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};
