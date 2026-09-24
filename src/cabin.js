import { approach, hash } from './utils.js';

const AISLE_PERIOD = 140; // seconds between aisle visits (conductor or snack cart)
const WALK_IN = 4;
const STOP = 6;
const WALK_OUT = 4;
const ACTIVITY_SLOT = 45; // seconds per passenger activity
const POSE_RATE = 1.2; // pose easing speed (1/s)
const SIP_RATE = 0.035; // coffee drunk per second while sipping
const HOT_SECONDS = 180; // coffee steams this long after a refill

export const isNight = (dayTime) => dayTime > 0.9 || dayTime < 0.2;

/**
 * Who walks down the aisle right now, as a pure function of time:
 * { kind: 'conductor' | 'cart', phase: 'in' | 'stop' | 'out', p: 0..1 } or null.
 * The snack cart does not run at night.
 */
export function aisleEventAt(time, dayTime) {
  const k = Math.floor(time / AISLE_PERIOD);
  if (k < 1) return null;
  const local = time - k * AISLE_PERIOD - (20 + hash(k, 1801) * 60);
  const kind = hash(k, 1802) < 0.5 ? 'conductor' : 'cart';
  if (local < 0 || local > WALK_IN + STOP + WALK_OUT || (kind === 'cart' && isNight(dayTime))) return null;
  if (local < WALK_IN) return { kind, phase: 'in', p: local / WALK_IN };
  if (local < WALK_IN + STOP) return { kind, phase: 'stop', p: (local - WALK_IN) / STOP };
  return { kind, phase: 'out', p: (local - WALK_IN - STOP) / WALK_OUT };
}

/** What the passenger wants to be doing: show the ticket, sleep, read, sip coffee or just watch. */
function targetActivity(state) {
  const ev = aisleEventAt(state.time, state.dayTime);
  if (ev?.kind === 'conductor' && ev.phase === 'stop') return 'ticket';
  if (ev?.kind === 'cart' && ev.phase === 'stop') return 'look';
  if (isNight(state.dayTime) && state.dwell <= 0) return 'sleep';
  const slot = Math.floor(state.time / ACTIVITY_SLOT);
  const r = hash(slot, 1811);
  const local = state.time - slot * ACTIVITY_SLOT;
  if (r < 0.35) return 'read';
  if (r > 0.6 && state.coffee > 0.05 && local > 12 && local < 17) return 'sip';
  return 'look';
}

export const initialCabin = () => ({
  pose: { read: 0, sleep: 0, sip: 0, ticket: 0 },
  coffee: 1,
  coffeeHotUntil: HOT_SECONDS,
});

/** Pure cabin step: eases the passenger's pose toward the current activity and tracks the coffee. */
export function updateCabin(state, dt) {
  const activity = targetActivity(state);
  const pose = Object.fromEntries(Object.entries(state.pose)
    .map(([k, v]) => [k, approach(v, k === activity ? 1 : 0, dt * POSE_RATE)]));
  const ev = aisleEventAt(state.time, state.dayTime);
  const refill = ev?.kind === 'cart' && ev.phase === 'stop' && ev.p > 0.5;
  const coffee = refill ? 1 : Math.max(0, state.coffee - (pose.sip > 0.9 ? SIP_RATE * dt : 0));
  return {
    pose,
    coffee,
    coffeeHotUntil: refill ? state.time + HOT_SECONDS : state.coffeeHotUntil,
  };
}

export const coffeeHot = (state) => state.coffee > 0.05 && state.time < state.coffeeHotUntil;
