import { currentLang, onLangChange, setLang, t, translateDom } from './i18n.js';

function formatClock(dayTime) {
  const minutes = Math.round(dayTime * 24 * 60) % (24 * 60);
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function createControls(doc) {
  const el = (id) => {
    const node = doc.getElementById(id);
    if (!node) throw new Error(`Missing element #${id}`);
    return node;
  };
  const speed = el('speed');
  const speedOut = el('speed-out');
  const time = el('time');
  const timeOut = el('time-out');
  const autoDay = el('auto-day');
  const weather = el('weather');
  const weatherOut = el('weather-out');
  const season = el('season');
  const seasonOut = el('season-out');
  const stops = el('stops');
  const sound = el('sound');
  const panel = el('panel');
  const lang = el('lang');
  lang.value = currentLang();
  lang.addEventListener('change', () => setLang(lang.value, doc));
  translateDom(doc.body);
  const carBtn = el('car-btn');
  const carFade = el('car-fade');
  let car = 'passenger';
  let soundOn = false;
  const showCar = () => { carBtn.textContent = t(car === 'dining' ? 'Voltar ao vagão' : 'Ir ao vagão-restaurante'); };
  const showSoundLabel = () => { sound.textContent = t(soundOn ? 'Desligar som' : 'Ativar som'); };
  onLangChange(() => { showCar(); showSoundLabel(); });
  showCar();
  showSoundLabel();
  // Walking to the other car: fade to dark, switch, fade back in.
  carBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    carFade.classList.add('on');
    setTimeout(() => {
      car = car === 'dining' ? 'passenger' : 'dining';
      showCar();
      carBtn.setAttribute('aria-pressed', String(car === 'dining'));
      carFade.classList.remove('on');
    }, 500);
  });
  const hud = { km: el('hud-km'), biome: el('hud-biome'), speed: el('hud-speed'), station: el('hud-station') };
  const board = hud.km.parentElement;

  const menu = el('menu-btn');
  const showMenuState = () => menu.setAttribute('aria-expanded', String(!panel.classList.contains('hidden')));
  const togglePanel = () => { panel.classList.toggle('hidden'); showMenuState(); };
  menu.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(); });
  // On phones the view comes first: the panel starts folded away behind the menu button.
  if (window.matchMedia('(max-width: 560px)').matches) panel.classList.add('hidden');
  showMenuState();
  speed.addEventListener('input', () => { speedOut.textContent = `${speed.value} km/h`; });
  time.addEventListener('input', () => {
    autoDay.checked = false;
    timeOut.textContent = formatClock(Number(time.value));
  });
  doc.addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea, select')) return;
    if (e.key.toLowerCase() === 'h' && !e.repeat) togglePanel();
  });
  timeOut.textContent = formatClock(Number(time.value));

  return {
    read: () => ({
      targetKmh: Number(speed.value),
      dayTime: Number(time.value),
      autoDay: autoDay.checked,
      weather: weather.value,
      season: season.value,
      stops: stops.checked,
      car,
    }),
    showDayTime(dayTime) {
      time.value = String(dayTime);
      timeOut.textContent = formatClock(dayTime);
    },
    showHud({ km, biome, kmh, station }) {
      hud.km.textContent = `km ${km.toFixed(1)}`;
      hud.biome.textContent = t(biome);
      hud.speed.textContent = `${Math.round(kmh)} km/h`;
      hud.station.textContent = t(station);
      board.classList.toggle('no-station', !station);
    },
    /** Current weather and season names, shown next to the selectors (useful in automatic mode). */
    showConditions(weatherName, seasonName) {
      weatherOut.textContent = t(weatherName);
      seasonOut.textContent = t(seasonName);
    },
    togglePanel,
    onSoundClick: (handler) => sound.addEventListener('click', handler),
    showSound(on) {
      soundOn = on;
      showSoundLabel();
      sound.setAttribute('aria-pressed', String(on));
    },
  };
}
