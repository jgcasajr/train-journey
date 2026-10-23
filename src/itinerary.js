import { t, onLangChange } from './i18n.js';

const KEY = 'train-journey:itinerary:v1';
export const validStops = (stops, names) => Array.isArray(stops) && stops.length <= 12
  && stops.every((name) => typeof name === 'string' && names.includes(name));

export function createItinerary(doc) {
  const destination = doc.getElementById('destination');
  const picker = doc.getElementById('route-stop');
  const list = doc.getElementById('route-list');
  const names = [...destination.querySelectorAll('option')].map((o) => o.value).filter(Boolean);
  picker.append(...[...destination.querySelectorAll('optgroup')].map((group) => group.cloneNode(true)));
  let stops = [];
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (validStops(saved, names)) stops = saved;
  } catch { /* A broken route must not block the app. */ }
  let internal = false;
  const setDestination = (name) => {
    internal = true;
    destination.value = name;
    destination.dispatchEvent(new Event('change', { bubbles: true }));
    internal = false;
  };
  const render = () => {
    list.replaceChildren(...stops.map((name, i) => {
      const item = doc.createElement('li');
      item.textContent = `${i + 1}. ${t(name)}`;
      return item;
    }));
    list.hidden = !stops.length;
    doc.getElementById('route-clear').disabled = !stops.length;
  };
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(stops)); } catch { /* Travel remains usable. */ }
    render();
  };
  destination.addEventListener('change', () => {
    if (!internal && stops.length && destination.value !== stops[0]) { stops = []; save(); }
  });
  doc.getElementById('route-add').addEventListener('click', () => {
    if (!picker.value || stops.length >= 12) return;
    stops.push(picker.value);
    if (stops.length === 1) setDestination(stops[0]);
    save();
  });
  doc.getElementById('route-clear').addEventListener('click', () => {
    stops = [];
    setDestination('');
    save();
  });
  onLangChange(render);
  if (stops.length) setDestination(stops[0]);
  render();
  return {
    advance() {
      if (!stops.length) return;
      stops.shift();
      setDestination(stops[0] ?? '');
      save();
    },
  };
}
