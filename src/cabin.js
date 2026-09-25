import { DAY_SECONDS } from './clock.js';
import { approach, hash, mod } from './utils.js';

const AISLE_PERIOD = 140; // seconds between aisle visits (conductor or snack cart)
const WALK_IN = 5;
export const STOP = 14;
const WALK_OUT = 5;
const ACTIVITY_SLOT = 45; // seconds per passenger activity
const POSE_RATE = 1.4; // pose easing speed (1/s)
const SIP_RATE = 0.035; // coffee drunk per second while sipping
const HOT_SECONDS = 180; // coffee steams this long after a refill
const HANDOFF_AT = 7.4; // seconds into the cart stop when the cup changes hands

/**
 * The little scene played while someone stands next to her (seconds into the stop).
 * `line` is literal text, or a key the view fills in (greeting, next station...).
 */
export const SCRIPTS = {
  cart: [
    { from: 0, to: 3, who: 'staff', line: 'offer' },
    { from: 3.2, to: 5.6, who: 'passenger', line: 'Um café, por favor!' },
    { from: 5.8, to: 9, who: 'staff', line: 'Aqui está, quentinho!', action: 'serve' },
    { from: 9.2, to: 11.2, who: 'passenger', line: 'Obrigada!' },
    { from: 11.4, to: 14, who: 'staff', line: 'Boa viagem!', action: 'wave' },
  ],
  conductor: [
    { from: 0, to: 3, who: 'staff', line: 'ticket' },
    { from: 3.2, to: 5.6, who: 'passenger', line: 'Aqui está.' },
    { from: 5.8, to: 8.4, who: 'staff', line: 'Obrigado!', action: 'punch' },
    { from: 8.6, to: 11.4, who: 'staff', line: 'nextStop' },
    { from: 11.6, to: 14, who: 'passenger', line: 'Obrigada!', action: 'wave' },
  ],
};

export const isNight = (dayTime) => dayTime > 0.9 || dayTime < 0.2;

/**
 * Who walks down the aisle right now, as a pure function of time:
 * { kind: 'conductor' | 'cart', phase: 'in' | 'stop' | 'out', p: 0..1, t: seconds into the phase }.
 * The snack cart skips visits that *start* at night, so a visit never vanishes halfway through.
 */
export function aisleEventAt(time, dayTime) {
  const k = Math.floor(time / AISLE_PERIOD);
  if (k < 1) return null;
  const local = time - k * AISLE_PERIOD - (20 + hash(k, 1801) * 60);
  if (local < 0 || local > WALK_IN + STOP + WALK_OUT) return null;
  const kind = hash(k, 1802) < 0.5 ? 'conductor' : 'cart';
  const dayAtStart = mod(dayTime - local / DAY_SECONDS, 1);
  if (kind === 'cart' && isNight(dayAtStart)) return null;
  if (local < WALK_IN) return { kind, phase: 'in', p: local / WALK_IN, t: local };
  if (local < WALK_IN + STOP) return { kind, phase: 'stop', p: (local - WALK_IN) / STOP, t: local - WALK_IN };
  const t = local - WALK_IN - STOP;
  return { kind, phase: 'out', p: t / WALK_OUT, t };
}

/** The script beat playing now (who speaks, what, and any action), or null. */
export function beatAt(ev) {
  if (ev?.phase !== 'stop') return null;
  return SCRIPTS[ev.kind].find((b) => ev.t >= b.from && ev.t < b.to) ?? null;
}

/** During a visit she turns to the visitor; hands over the ticket or takes the cup when asked. */
function visitActivity(ev) {
  if (ev.phase === 'in') return ev.p > 0.55 ? 'talk' : null;
  if (ev.phase === 'out') return ev.p < 0.35 ? 'talk' : null;
  if (ev.kind === 'conductor' && ev.t >= 3.2 && ev.t < 8.4) return 'ticket';
  if (ev.kind === 'cart' && ev.t >= 5.8 && ev.t < 9.2) return 'receive';
  return 'talk';
}

/** What the passenger wants to be doing: a visit first, then sleep, read, sip coffee or just watch. */
function targetActivity(state) {
  const ev = aisleEventAt(state.time, state.dayTime);
  const visit = ev ? visitActivity(ev) : null;
  if (visit) return visit;
  if (isNight(state.dayTime) && state.dwell <= 0) return 'sleep';
  const slot = Math.floor(state.time / ACTIVITY_SLOT);
  const r = hash(slot, 1811);
  const local = state.time - slot * ACTIVITY_SLOT;
  if (r < 0.35) return 'read';
  if (r > 0.6 && state.coffee > 0.05 && local > 12 && local < 17) return 'sip';
  return 'look';
}

export const initialCabin = () => ({
  pose: { read: 0, sleep: 0, sip: 0, ticket: 0, talk: 0, receive: 0 },
  coffee: 1,
  coffeeHotUntil: HOT_SECONDS,
});

/** Pure cabin step: eases the passenger's pose toward the current activity and tracks the coffee. */
export function updateCabin(state, dt) {
  const activity = targetActivity(state);
  const pose = Object.fromEntries(Object.entries(state.pose)
    .map(([k, v]) => [k, approach(v, k === activity ? 1 : 0, dt * POSE_RATE)]));
  const ev = aisleEventAt(state.time, state.dayTime);
  const refill = ev?.kind === 'cart' && ev.phase === 'stop' && ev.t >= HANDOFF_AT;
  const coffee = refill ? 1 : Math.max(0, state.coffee - (pose.sip > 0.9 ? SIP_RATE * dt : 0));
  return {
    pose,
    coffee,
    coffeeHotUntil: refill ? state.time + HOT_SECONDS : state.coffeeHotUntil,
  };
}

export const coffeeHot = (state) => state.coffee > 0.05 && state.time < state.coffeeHotUntil;

/** Whether the cup is currently in the attendant's hand (before the hand-off) during a cart stop. */
export const cupWithStaff = (ev) => ev?.kind === 'cart' && ev.phase === 'stop' && ev.t >= 5.8 && ev.t < HANDOFF_AT;

/** Whether the passenger holds the new cup (just after the hand-off, before setting it down). */
export const cupWithPassenger = (ev) => ev?.kind === 'cart' && ev.phase === 'stop' && ev.t >= HANDOFF_AT && ev.t < 9.2;
