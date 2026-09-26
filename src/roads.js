import { biomeAt, num } from './biomes.js';
import { riverAt } from './rivers.js';
import { stationsBetween } from './stations.js';
import { tunnelsBetween } from './tunnel.js';
import { hash } from './utils.js';

const CROSS_CELL = 1500;
const ROAD_CELL = 900;
export const CROSSING_WIDTH = 8; // meters

// Car streams on the road parallel to the track. Speeds in m/s along the track direction;
// positive = same direction as the train (slower ones fall behind, faster ones overtake).
const STREAMS = [
  { v: 21, spacing: 150, lane: 0, seed: 11 },
  { v: 33, spacing: 260, lane: 0, seed: 12 },
  { v: -26, spacing: 130, lane: 1, seed: 13 },
];

// Memo of crossing-per-cell (pure in k); looked up for every scenery slot.
const memo = new Map();

function computeCrossing(k) {
  if (!Number.isFinite(k) || k < 1 || hash(k, 1001) > 0.7) return null;
  const at = k * CROSS_CELL + 300 + hash(k, 1002) * (CROSS_CELL - 600);
  const bm = biomeAt(at);
  const blocked = riverAt(at, 80)
    || tunnelsBetween(at - 150, at + 150).length > 0
    || stationsBetween(at - 250, at + 250).length > 0
    || num(bm, 'snow') > 0.5;
  return blocked ? null : { id: k, at, end: at + CROSSING_WIDTH };
}

function crossingIn(k) {
  if (!memo.has(k)) {
    if (memo.size > 400) memo.clear();
    memo.set(k, computeCrossing(k));
  }
  return memo.get(k);
}

export function crossingsBetween(m0, m1) {
  const first = Math.floor(m0 / CROSS_CELL);
  const count = Math.floor(m1 / CROSS_CELL) - first + 1;
  return Array.from({ length: count }, (_, i) => crossingIn(first + i))
    .filter((c) => c && c.end > m0 && c.at < m1);
}

/** True where scenery objects must not stand (crossing road plus margin). */
export function crossingAt(meters, margin = 3) {
  const c = crossingIn(Math.floor(meters / CROSS_CELL));
  return c !== null && meters > c.at - margin && meters < c.end + margin;
}

/** A crossing the train is about to reach or is passing (for the warning bell). */
export const crossingNear = (distance, ahead) => crossingsBetween(distance - 20, distance + ahead).length > 0;

/** Parallel road presence: common in farmland and towns, rare in forest and mountains. */
export function roadAt(meters) {
  const bm = biomeAt(meters);
  if (num(bm, 'water') > 0.5 || riverAt(meters, 10)) return false;
  const density = 0.45 + num(bm, 'farm') * 0.35 + num(bm, 'city') * 0.5 - num(bm, 'trees') * 0.35 - num(bm, 'snow') * 0.3;
  return hash(Math.floor(meters / ROAD_CELL), 1003) < density;
}

/** Cars on the parallel road within [m0, m1] at `time` (fully deterministic). */
export function carsBetween(m0, m1, time) {
  return STREAMS.flatMap((s) => {
    const shift = s.v * time;
    const first = Math.floor((m0 - shift) / s.spacing) - 1;
    const count = Math.floor((m1 - shift) / s.spacing) - first + 2;
    return Array.from({ length: Math.max(0, count) }, (_, i) => {
      const j = first + i;
      const m = j * s.spacing + hash(j, s.seed) * s.spacing * 0.6 + shift;
      const present = hash(j, s.seed + 50) < 0.6 && m >= m0 && m <= m1 && roadAt(m);
      return present ? { m, lane: s.lane, dir: Math.sign(s.v), id: j * 7 + s.seed } : null;
    }).filter(Boolean);
  });
}
