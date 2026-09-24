import { biomeAt, num } from './biomes.js';
import { stationsBetween } from './stations.js';
import { tunnelsBetween } from './tunnel.js';
import { hash } from './utils.js';

const CELL = 1700;
const CLEARANCE = 120; // meters kept free of tunnels/stations around a bridge
export const ABUTMENT = 15; // meters of stone abutment on each side of the river

// Memo of river-per-cell: pure function of k, looked up hundreds of times per frame.
const memo = new Map();

function computeRiver(k) {
  if (k < 1 || hash(k, 701) > 0.45) return null;
  const width = 40 + hash(k, 702) * 70;
  const start = k * CELL + 200 + hash(k, 703) * (CELL - width - 400);
  const end = start + width;
  if (num(biomeAt((start + end) / 2), 'city') > 0.5) return null;
  const blocked = tunnelsBetween(start - CLEARANCE, end + CLEARANCE).length > 0
    || stationsBetween(start - CLEARANCE, end + CLEARANCE).length > 0;
  return blocked ? null : { id: k, start, end };
}

function riverIn(k) {
  if (!memo.has(k)) {
    if (memo.size > 400) memo.clear();
    memo.set(k, computeRiver(k));
  }
  return memo.get(k);
}

export function riversBetween(m0, m1) {
  const first = Math.floor(m0 / CELL);
  const count = Math.floor(m1 / CELL) - first + 1;
  return Array.from({ length: count }, (_, i) => riverIn(first + i))
    .filter((r) => r && r.end > m0 && r.start < m1);
}

/** True where scenery objects must not stand (river plus a small bank margin). */
export function riverAt(meters, margin = 5) {
  const r = riverIn(Math.floor(meters / CELL));
  return r !== null && meters > r.start - margin && meters < r.end + margin;
}

/** True where the track runs on a bridge (river plus abutments). */
export const bridgeAt = (meters) => riverAt(meters, ABUTMENT);
