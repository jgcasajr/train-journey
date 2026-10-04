import { LOOP } from './biomes.js';
import { t } from './i18n.js';
import { DWELL, nextStationNamed, stationsBetween } from './stations.js';

const ACCEL = 2.2; // m/s², as in journey.js
const BRAKE = 0.9;
const MAX_SPEED = 220 / 3.6;
const MIN_SPEED = 3;
const COMFORT = 80 / 3.6; // the cruising speed a schedule aims for
const MAX_LAPS = 40;
const PLAN_EVERY = 1000; // ms between re-plans
const PUNCTUAL_MS = 60 * 1000;

/** Seconds lost at each intermediate stop: braking, the dwell and speeding up again. */
const stopCost = (v) => DWELL + v / (2 * BRAKE) + v / (2 * ACCEL);

/** Travel time for `meters` at cruising speed `v`, with `stops` stations on the way. */
const travelTime = (meters, v, stops) => meters / v + stops * stopCost(v) + v / (2 * BRAKE); // + braking into the destination

/** The cruising speed that covers `meters` in `seconds` (null if even top speed is too slow). */
export function solveSpeed(meters, seconds, stops) {
  if (meters <= 0) return MIN_SPEED;
  const fastest = Math.min(MAX_SPEED, Math.sqrt(meters / ((stops + 1) / (2 * BRAKE) + stops / (2 * ACCEL))));
  if (travelTime(meters, fastest, stops) > seconds) return null;
  let lo = MIN_SPEED;
  let hi = fastest;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (travelTime(meters, mid, stops) > seconds) lo = mid;
    else hi = mid;
  }
  return hi;
}

/**
 * Plans an arrival at `destination` in `seconds`: picks which pass of the station (lap) keeps the
 * cruising speed closest to a comfortable 80 km/h. Returns { stopAt, kmh, late } or null.
 */
export function planSchedule(state, destination, seconds, stops) {
  const first = nextStationNamed(state.distance, destination, state.served?.id);
  if (!first) return null;
  const perLap = stationsBetween(first.stopAt + 1, first.stopAt + LOOP - 1).length;
  const before = stops ? stationsBetween(state.distance + 1, first.stopAt - 1).length : 0;
  let best = null;
  for (let n = 0; n <= MAX_LAPS; n++) {
    const stopAt = first.stopAt + n * LOOP;
    const v = solveSpeed(stopAt - state.distance, seconds, stops ? before + n * (perLap + 1) : 0);
    if (v === null) break; // later passes are even further away
    if (!best || Math.abs(v - COMFORT) < Math.abs(best.v - COMFORT)) best = { stopAt, v };
    if (v >= COMFORT) break; // each later pass needs more speed: past comfort, stop looking
  }
  // Out of time: full speed (only called late while there is still real distance to make up).
  if (!best) return { stopAt: first.stopAt, kmh: MAX_SPEED * 3.6, late: first.stopAt - state.distance > 500 };
  return { stopAt: best.stopAt, kmh: best.v * 3.6, late: false };
}

/** "18:00" today (or tomorrow, if that time has already passed) as epoch ms, or null. */
function targetTime(value, now) {
  const m = /^(\d{2}):(\d{2})$/.exec(value ?? '');
  if (!m) return null;
  const at = new Date(now);
  at.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return at.getTime() < now - 60 * 1000 ? at.getTime() + 24 * 3600 * 1000 : at.getTime();
}

const clock = (ms) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * "Arrive at" in the panel: with a destination and a time, the train sets its own cruising
 * speed to arrive on time (re-planned every second, so delays get made up).
 */
export function createSchedule(doc, { onPunctual }) {
  const input = doc.getElementById('arrive-at');
  if (!input) throw new Error('Missing element #arrive-at');
  let plan = null;
  let plannedAt = 0;
  let target = null;
  let noted = null;

  return {
    /** The current plan ({ stopAt, kmh, late, at }) for this frame, or null; `override` is a target time (ms) from focus mode. */
    update(state, destination, stops, override = null) {
      const now = Date.now();
      target = destination ? override ?? targetTime(input.value, now) : null;
      if (!target || state.holding) {
        plan = null;
        return null;
      }
      if (now - plannedAt > PLAN_EVERY || !plan) {
        plannedAt = now;
        const next = planSchedule(state, destination, (target - now) / 1000, stops);
        plan = next ? { ...next, at: target } : null;
      }
      return plan;
    },
    /** Board text while a schedule is active. */
    boardText(state, name) {
      if (!plan) return null;
      const km = Math.max(0, (plan.stopAt - state.distance) / 1000).toFixed(1);
      if (plan.late) return t(`Destino: ${name} às ${clock(plan.at)} · atrasado, a toda velocidade`);
      return t(`Destino: ${name} às ${clock(plan.at)} · ${km} km · ${Math.round(plan.kmh)} km/h`);
    },
    /** On arrival: how punctual it was (text for the summary card), once per arrival. */
    arrivalNote(arrivedTime) {
      if (!target || noted === arrivedTime) return '';
      noted = arrivedTime;
      const diff = Date.now() - target;
      if (Math.abs(diff) <= PUNCTUAL_MS) {
        onPunctual();
        return t('Chegou na hora marcada!');
      }
      const min = Math.round(Math.abs(diff) / 60000);
      return diff > 0 ? t(`${min} min de atraso`) : t(`${min} min adiantado`);
    },
  };
}
