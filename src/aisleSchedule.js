import { DAY_SECONDS, isNight } from './clock.js';
import { hash, mod } from './utils.js';

const AISLE_PERIOD = 140; // seconds between aisle visits (conductor or snack cart)
const WALK_IN = 5;
export const STOP = 14;
const WALK_OUT = 5;

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
