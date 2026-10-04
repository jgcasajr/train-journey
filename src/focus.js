import { lineAt } from './biomes.js';
import { t } from './i18n.js';
import { durationsFromParams } from './pomodoro.js';
import { planSchedule } from './schedule.js';
import { LINE_STATIONS } from './stations.js';

const COMFORT_KMH = 80;
const PILL_MS = 250;

function element(doc, id) {
  const node = doc.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node;
}

const mmss = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/** The station of the current line that makes the best focus block of `seconds` (speed near 80 km/h). */
export function chooseStop(state, seconds, stops) {
  const names = LINE_STATIONS[lineAt(state.distance)].filter((n) => n !== state.served?.name);
  const candidates = names
    .map((name) => ({ name, plan: planSchedule(state, name, seconds, stops) }))
    .filter((c) => c.plan);
  const onTime = candidates
    .filter((c) => !c.plan.late)
    .sort((a, b) => Math.abs(a.plan.kmh - COMFORT_KMH) - Math.abs(b.plan.kmh - COMFORT_KMH));
  if (onTime.length > 0) return onTime[0].name;
  // A block too short to reach anywhere on time: head for the nearest station, at full speed.
  return candidates.sort((a, b) => a.plan.stopAt - b.plan.stopAt)[0]?.name ?? null;
}

/**
 * Focus mode: each focus block is a ride to a station picked to arrive right when the block
 * ends; the break is the stop at that platform; then on to the next one. Ends with a report.
 */
export function createFocus(doc, { params, onChime, onBlock, onRelease }) {
  const ui = {
    button: element(doc, 'pomodoro'),
    pill: element(doc, 'pomo-pill'),
    report: element(doc, 'focus-report'),
    stats: element(doc, 'focus-stats'),
    close: element(doc, 'focus-close'),
  };
  const durations = durationsFromParams(params);
  let session = null; // { phase, endsAt, dest, blocks, focusMs, km, stations, lastDistance, blockStart }
  let lastPill = 0;
  let pendingStart = false;

  const pulse = () => {
    ui.pill.classList.remove('pulse');
    void ui.pill.offsetWidth;
    ui.pill.classList.add('pulse');
  };
  function finish() {
    if (session) {
      const minutes = Math.round((session.focusMs + (session.phase === 'focus' ? Date.now() - session.blockStart : 0)) / 60000);
      const blocks = `${session.blocks} ${session.blocks === 1 ? 'bloco' : 'blocos'}`;
      const stations = `${session.stations.length} ${session.stations.length === 1 ? 'estação' : 'estações'}`;
      ui.stats.textContent = t(`${blocks} · ${minutes} min de foco · ${stations} · ${session.km.toFixed(1)} km`);
      ui.report.classList.remove('hidden');
    }
    session = null;
    ui.button.setAttribute('aria-pressed', 'false');
    ui.pill.classList.add('hidden');
  }
  ui.button.addEventListener('click', (e) => {
    e.stopPropagation();
    if (session) finish();
    else pendingStart = true;
  });
  ui.close.addEventListener('click', (e) => { e.stopPropagation(); ui.report.classList.add('hidden'); });

  function startBlock(state, stops, now, base) {
    const dest = chooseStop(state, durations.focus * 60, stops);
    if (!dest) return null;
    return { ...base, phase: 'focus', endsAt: now + durations.focus * 60000, dest, blockStart: now };
  }

  /** Focus phase: count km; arriving at the block's station starts the break. */
  function duringFocus(state, now) {
    const arrived = state.holding && state.arrivedAt?.name === session.dest;
    if (!arrived) return session;
    onChime();
    onBlock(session.blocks + 1);
    pulse();
    return {
      ...session,
      phase: 'break',
      endsAt: now + durations.rest * 60000,
      blocks: session.blocks + 1,
      focusMs: session.focusMs + (now - session.blockStart),
      stations: [...session.stations, session.dest],
    };
  }

  /** Break phase: when it ends, pick the next station and pull out of the platform. */
  function duringBreak(state, stops, now) {
    if (now < session.endsAt) return session;
    const next = startBlock(state, stops, now, session);
    if (!next) return session;
    onChime();
    onRelease();
    pulse();
    return next;
  }

  return {
    active: () => session !== null,
    /** Called every frame: returns { destination, target } to drive the schedule, or null. */
    update(state, stops) {
      const now = Date.now();
      if (pendingStart) {
        pendingStart = false;
        session = startBlock(state, stops, now, { blocks: 0, focusMs: 0, km: 0, stations: [], lastDistance: state.distance });
        ui.button.setAttribute('aria-pressed', String(session !== null));
        ui.pill.classList.toggle('hidden', session === null);
        ui.report.classList.add('hidden');
      }
      if (!session) return null;
      const step = state.distance - session.lastDistance;
      session = { ...session, km: session.km + (step > 0 && step < 200 ? step / 1000 : 0), lastDistance: state.distance };
      session = session.phase === 'focus' ? duringFocus(state, now) : duringBreak(state, stops, now);
      if (now - lastPill > PILL_MS) {
        lastPill = now;
        ui.pill.dataset.phase = session.phase === 'focus' ? 'focus' : 'rest';
        ui.pill.textContent = session.phase === 'focus'
          ? t(`Foco · rumo a ${session.dest} · ${mmss(session.endsAt - now)} · #${session.blocks + 1}`)
          : t(`Pausa em ${session.dest} · ${mmss(session.endsAt - now)}`);
      }
      return { destination: session.dest, target: session.phase === 'focus' ? session.endsAt : null };
    },
  };
}
