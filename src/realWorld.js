import { onLangChange, t } from './i18n.js';

// "Real time and weather": the sky follows the viewer's clock, and (with permission) the
// weather and season where they are, from Open-Meteo (free, no key).

const API = 'https://api.open-meteo.com/v1/forecast';
const CACHE_KEY = 'train-journey:real-weather:v1';
const REFRESH_MS = 15 * 60 * 1000;
const NORTH = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];
const FLIP = { winter: 'summer', summer: 'winter', spring: 'autumn', autumn: 'spring' };

/** Fraction of the day of a local time (00:00 = 0, 12:00 = 0.5). */
export const realDayTime = (date) => (date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()) / 86400;

/** Meteorological season of a month, flipped south of the equator. */
export function seasonFor(date, lat) {
  const north = NORTH[date.getMonth()];
  return lat < 0 ? FLIP[north] : north;
}

/** WMO weather code → the app's weather; snow also forces winter (it falls as snow in the cold). */
export function weatherFromCode(code) {
  if (code >= 95) return { weather: 'storm', snow: false };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { weather: 'rain', snow: true };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { weather: 'rain', snow: false };
  return { weather: 'clear', snow: false };
}

/** Manual controls that the real clock and weather replace (disabled while on). */
const MANUAL = ['time', 'auto-day', 'weather', 'season'];

const WEATHER_NAMES = { clear: 'tempo bom', rain: 'chuva', storm: 'tempestade' };

/** Coordinates rounded to ~10 km: enough for the weather, without sending an exact location. */
const rounded = (v) => Math.round(v * 10) / 10;

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
  } catch (err) {
    console.warn('Real weather cache unavailable:', err);
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Real weather not cached:', err);
  }
}

function locate(geo) {
  return new Promise((resolve, reject) => {
    if (!geo) {
      reject(new Error('Geolocation unavailable'));
      return;
    }
    geo.getCurrentPosition((p) => resolve({ lat: rounded(p.coords.latitude), lon: rounded(p.coords.longitude) }), reject, { maximumAge: 3600000, timeout: 15000 });
  });
}

async function fetchWeather({ lat, lon }, fetcher) {
  const url = `${API}?latitude=${lat}&longitude=${lon}&current=weather_code`;
  const response = await fetcher(url);
  if (!response.ok) throw new Error(`Open-Meteo answered ${response.status}`);
  const data = await response.json();
  const code = Number(data?.current?.weather_code);
  if (!Number.isFinite(code)) throw new Error('Open-Meteo: no weather code');
  return { lat, lon, code, at: Date.now() };
}

/**
 * The "real time and weather" switch. While on, `apply(input)` replaces the panel's time,
 * weather and season with the real ones (time always; weather/season once located).
 */
export function createRealWorld(doc, { geo = navigator.geolocation, fetcher = (u) => fetch(u), now = () => new Date() } = {}) {
  const box = doc.getElementById('real-world');
  const status = doc.getElementById('real-world-status');
  if (!box || !status) throw new Error('Missing real-world controls');
  let real = readCache();
  let busy = false;
  let error = null;

  function show() {
    MANUAL.forEach((id) => { const el = doc.getElementById(id); if (el) el.disabled = box.checked; });
    if (!box.checked) {
      status.textContent = '';
      return;
    }
    if (busy && !real) {
      status.textContent = t('Buscando o clima onde você está...');
      return;
    }
    const clock = now().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (!real) {
      status.textContent = error ? t(`Só a hora real (${clock}): sem localização para o clima.`) : t(`Hora real: ${clock}.`);
      return;
    }
    const w = weatherFromCode(real.code);
    const updated = new Date(real.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    status.textContent = t(`Hora real: ${clock} · lá fora: ${WEATHER_NAMES[w.snow ? 'rain' : w.weather]}${w.snow ? ' (neve)' : ''} · atualizado às ${updated}`);
  }

  async function refresh() {
    if (busy || !box.checked) return;
    if (real && Date.now() - real.at < REFRESH_MS) return;
    busy = true;
    show();
    try {
      real = await fetchWeather(await locate(geo), fetcher);
      error = null;
      writeCache(real);
    } catch (err) {
      console.warn('Real weather unavailable:', err);
      error = err;
    } finally {
      busy = false;
      show();
    }
  }

  box.addEventListener('change', () => { show(); refresh(); });
  onLangChange(show);
  setInterval(() => { show(); refresh(); }, 60 * 1000);
  show();
  refresh();

  return {
    active: () => box.checked,
    /** True once the real weather is known (switch on and located). */
    located: () => box.checked && Boolean(real),
    /** The panel input with the real clock (and weather/season, when known) when switched on. */
    apply(input) {
      if (!box.checked) return input;
      const date = now();
      const timeOnly = { ...input, autoDay: false, dayTime: realDayTime(date) };
      if (!real) return timeOnly;
      const w = weatherFromCode(real.code);
      return { ...timeOnly, weather: w.weather, season: w.snow ? 'winter' : seasonFor(date, real.lat) };
    },
  };
}
