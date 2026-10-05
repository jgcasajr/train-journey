import { onLangChange, t } from './i18n.js';

const STORAGE_KEY = 'train-journey:missions:v1';
const DAY_MS = 24 * 3600 * 1000;

/**
 * Daily missions. `test(facts, today)` gets the journal facts of the frame plus what was done
 * today (`km`, `minutes` on board). `hint` tells how to get there.
 */
export const MISSIONS = [
  { id: 'aurora', icon: '🌌', title: 'Veja uma aurora boreal', hint: 'Noites limpas nas montanhas nevadas.', test: (f) => f.aurora },
  { id: 'bella', icon: '🐕', title: 'Veja a Bella correr ao lado do trem', hint: 'Ela aparece em trechos abertos.', test: (f) => f.bella },
  { id: 'bellaPet', icon: '💕', title: 'Faça carinho na Bella', hint: 'Toque nela quando ela aparecer.', test: (f) => f.bellaPets > 0 },
  { id: 'dolphins', icon: '🐬', title: 'Veja golfinhos saltando', hint: 'No mar do litoral.', test: (f) => f.dolphins },
  { id: 'whale', icon: '🐋', title: 'Veja uma baleia', hint: 'No mar do litoral.', test: (f) => f.whale },
  { id: 'herd', icon: '🐎', title: 'Veja cavalos a galope', hint: 'Nos campos e fazendas.', test: (f) => f.herd },
  { id: 'rainbow', icon: '🌈', title: 'Veja um arco-íris', hint: 'Sol depois da chuva.', test: (f) => f.rainbow },
  { id: 'shootingStar', icon: '🌠', title: 'Veja uma estrela cadente', hint: 'Numa noite limpa.', test: (f) => f.shootingStar },
  { id: 'sunset', icon: '🌇', title: 'Veja o pôr do sol', hint: 'No fim da tarde, com céu aberto.', test: (f) => f.sunset },
  { id: 'nexus', icon: '💠', title: 'Pare na estação Nexus', hint: 'Ela fica em todas as linhas.', test: (f) => f.station === 'Nexus' },
  { id: 'arrival', icon: '🏁', title: 'Chegue a um destino', hint: 'Escolha um destino no painel.', test: (f) => f.arrival },
  { id: 'tunnel', icon: '🚇', title: 'Atravesse um túnel', hint: 'Eles cortam as montanhas.', test: (f) => f.tunnel },
  { id: 'viaduct', icon: '🌉', title: 'Passe por um viaduto', hint: 'Sobre os vales.', test: (f) => f.viaduct },
  { id: 'deer', icon: '🦌', title: 'Encontre um cervo', hint: 'Bem no meio da floresta.', test: (f) => f.deer },
  { id: 'coffee', icon: '☕', title: 'Tome um café com ela', hint: 'O carrinho passa pelo corredor.', test: (f) => f.coffee },
  { id: 'stamp', icon: '🛂', title: 'Ganhe um carimbo novo no passaporte', hint: 'Pare numa estação que ainda não visitou.', test: (f) => f.awarded?.has('stamp') },
  { id: 'km10', icon: '🛤️', title: 'Viaje 10 km hoje', hint: 'É só seguir viagem.', test: (f, today) => today.km >= 10 },
  { id: 'min20', icon: '⏱️', title: 'Fique 20 minutos a bordo hoje', hint: 'Um tempo na janela.', test: (f, today) => today.minutes >= 20 },
];

const pad = (n) => String(n).padStart(2, '0');
/** Local calendar day as "YYYY-MM-DD". */
export const dayKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** The mission of a calendar day: the same for everyone on that day, never the same two days in a row. */
export function missionFor(key) {
  const days = Math.round(Date.parse(`${key}T12:00:00Z`) / DAY_MS);
  const pick = (d) => Math.abs((d * 2654435761) >>> 0) % MISSIONS.length;
  const today = pick(days);
  return MISSIONS[today === pick(days - 1) ? (today + 1) % MISSIONS.length : today];
}

const yesterdayOf = (key) => dayKey(new Date(Date.parse(`${key}T12:00:00Z`) - DAY_MS));

/** Progress for `key`: kept if it is the same day, otherwise a fresh day (streak carried over). */
export function dayRecord(saved, key) {
  if (saved?.date === key) return saved;
  const streak = saved?.lastDone === yesterdayOf(key) || saved?.lastDone === key ? saved.streak ?? 0 : 0;
  return { date: key, done: false, km: 0, seconds: 0, streak, total: saved?.total ?? 0, lastDone: saved?.lastDone ?? null };
}

/** The record once today's mission is done: streak +1 and one more mission in total. */
export const completed = (rec) => ({ ...rec, done: true, streak: rec.streak + 1, total: rec.total + 1, lastDone: rec.date });

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
  } catch (err) {
    console.warn('Missions unavailable:', err);
    return null;
  }
}

function save(rec) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
  } catch (err) {
    console.warn('Mission not saved:', err);
  }
}

function element(doc, id) {
  const node = doc.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node;
}

/**
 * Mission of the day: one small goal per calendar day, shown in the panel; done when the
 * journal's facts say so. Keeps a streak of days in a row.
 */
export function createMissions(doc, { onDone, now = () => new Date() }) {
  const ui = { box: element(doc, 'mission'), title: element(doc, 'mission-title'), meta: element(doc, 'mission-meta') };
  let rec = dayRecord(load(), dayKey(now()));
  let lastDistance = null;
  let lastTime = null;

  function render() {
    const m = missionFor(rec.date);
    ui.box.classList.toggle('done', rec.done);
    ui.title.textContent = `${m.icon} ${t(m.title)}`;
    const streak = rec.streak > 1 ? ` · ${t(`${rec.streak} dias seguidos`)}` : '';
    ui.meta.textContent = rec.done ? `✓ ${t('Missão cumprida!')}${streak}` : `${t(m.hint)}${streak}`;
  }
  render();
  onLangChange(render);

  return {
    /** Called every frame with the journal's facts. */
    observe(facts, state) {
      const key = dayKey(now());
      if (key !== rec.date) {
        rec = dayRecord(rec, key);
        render();
      }
      const moved = lastDistance === null ? 0 : state.distance - lastDistance;
      const tick = lastTime === null ? 0 : state.time - lastTime;
      lastDistance = state.distance;
      lastTime = state.time;
      if (rec.done) return;
      rec = { ...rec, km: rec.km + (moved > 0 && moved < 200 ? moved / 1000 : 0), seconds: rec.seconds + (tick > 0 && tick < 1 ? tick : 0) };
      const mission = missionFor(rec.date);
      if (!mission.test(facts, { km: rec.km, minutes: rec.seconds / 60 })) {
        if (Math.floor(rec.seconds / 15) !== Math.floor((rec.seconds - tick) / 15)) save(rec);
        return;
      }
      rec = completed(rec);
      save(rec);
      render();
      onDone(mission, rec);
    },
  };
}
