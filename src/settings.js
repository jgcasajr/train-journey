const STORAGE_KEY = 'train-journey:settings:v1';
const SECTIONS_KEY = 'train-journey:sections:v1';

/** Panel controls remembered between visits: element id → which property holds the value. */
const FIELDS = {
  speed: 'value',
  time: 'value',
  'auto-day': 'checked',
  'real-world': 'checked',
  weather: 'value',
  season: 'value',
  stops: 'checked',
  car: 'value',
  'radio-volume': 'value',
  'radio-station': 'value',
  headphones: 'checked',
  'reduce-motion': 'checked',
  'large-text': 'checked',
};

function read(key, fallback) {
  try {
    const data = JSON.parse(localStorage.getItem(key) ?? 'null');
    return data && typeof data === 'object' ? data : fallback;
  } catch (err) {
    console.warn('Settings unavailable:', err);
    return fallback;
  }
}

function write(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn('Settings not saved:', err);
  }
}

/**
 * Puts the saved settings back into the panel (before the controls are created), keeps them
 * saved as they change, and remembers which panel sections are open.
 */
export function restoreSettings(doc) {
  const saved = read(STORAGE_KEY, {});
  Object.entries(FIELDS).forEach(([id, prop]) => {
    const node = doc.getElementById(id);
    if (node && saved[id] !== undefined) node[prop] = saved[id];
  });
  const save = () => write(STORAGE_KEY, Object.fromEntries(Object.entries(FIELDS)
    .map(([id, prop]) => [id, doc.getElementById(id)?.[prop]])
    .filter(([, v]) => v !== undefined)));
  Object.keys(FIELDS).forEach((id) => {
    const node = doc.getElementById(id);
    node?.addEventListener('change', save);
    node?.addEventListener('input', save);
  });

  const sections = read(SECTIONS_KEY, {});
  doc.querySelectorAll('details[data-section]').forEach((d) => {
    if (sections[d.dataset.section] !== undefined) d.open = sections[d.dataset.section];
    d.addEventListener('toggle', () => write(SECTIONS_KEY, { ...read(SECTIONS_KEY, {}), [d.dataset.section]: d.open }));
  });

  const reset = doc.getElementById('reset-settings');
  reset?.addEventListener('click', (e) => {
    e.stopPropagation();
    write(STORAGE_KEY, {});
    write(SECTIONS_KEY, {});
    window.location.reload();
  });
  return saved;
}
