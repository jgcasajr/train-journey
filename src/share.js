import { LINES, biomeName, lineAt, lineKm } from './biomes.js';
import { CARS } from './cars.js';
import { t } from './i18n.js';

const WEATHERS = ['auto', 'clear', 'rain', 'storm'];
const SEASONS = ['auto', 'spring', 'summer', 'autumn', 'winter'];
const TOAST_MS = 2600;

const clockOf = (dayTime) => {
  const minutes = Math.round(dayTime * 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};

/** "HH:MM" → fraction of the day, or null. */
function dayTimeOf(text) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text ?? '');
  if (!m) return null;
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  return minutes < 1440 && Number(m[2]) < 60 ? minutes / 1440 : null;
}

const setValue = (doc, id, value) => {
  const node = doc.getElementById(id);
  if (node && value !== null && value !== undefined) node.value = String(value);
};

/**
 * Applies a shared view's settings to the panel before the trip starts (hora, clima,
 * estacao, vagao); `km` and `dia` are read by the journey itself. Unknown values are ignored.
 */
export function applySharedView(doc, params) {
  const time = dayTimeOf(params.get('hora'));
  if (time !== null) setValue(doc, 'time', time.toFixed(3));
  if (WEATHERS.includes(params.get('clima'))) setValue(doc, 'weather', params.get('clima'));
  if (SEASONS.includes(params.get('estacao'))) setValue(doc, 'season', params.get('estacao'));
  if (CARS.includes(params.get('vagao'))) setValue(doc, 'car', params.get('vagao'));
}

/** The link to this exact view (same place, time, weather, season and car). */
export function sharedViewUrl(location, state, input) {
  const url = new URL(location.pathname, location.origin);
  url.search = new URLSearchParams({
    km: (state.distance / 1000).toFixed(2),
    dia: String(state.dayCount ?? 0),
    hora: clockOf(state.dayTime),
    clima: input.weather,
    estacao: input.season,
    vagao: state.car ?? 'passenger',
    nosplash: '',
  }).toString();
  return url.toString();
}

function toast(doc, text) {
  const node = doc.getElementById('toast');
  if (!node) return;
  node.textContent = text;
  node.classList.add('visible');
  setTimeout(() => node.classList.remove('visible'), TOAST_MS);
}

/** The "Share view" button: native share sheet on phones, clipboard elsewhere. */
export function createShare(doc, { getView, onShared }) {
  const button = doc.getElementById('share-btn');
  if (!button) throw new Error('Missing element #share-btn');
  button.addEventListener('click', async (e) => {
    e.stopPropagation();
    const { state, input } = getView();
    if (!state) return;
    const url = sharedViewUrl(window.location, state, input);
    const where = `${t(LINES[lineAt(state.distance)].name)}, km ${lineKm(state.distance).toFixed(1)}, ${t(biomeName(state.distance))}`;
    const text = t(`Estou viajando de trem (${where}). Vem ver a mesma vista:`);
    try {
      if (navigator.share) await navigator.share({ title: 'Train Journey', text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast(doc, t('Link copiado! Cole onde quiser.'));
      }
      onShared();
    } catch (err) {
      if (err?.name === 'AbortError') return; // closed the share sheet
      console.warn('Share failed:', err);
      toast(doc, t('Não deu para copiar. O link está no endereço da página.'));
      window.history.replaceState(null, '', url);
    }
  });
}
