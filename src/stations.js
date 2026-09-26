import { BIOMES, SEGMENT } from './biomes.js';
import { mod } from './utils.js';

export const PLATFORM_LENGTH = 170; // meters
export const DWELL = 14; // seconds stopped at a station
const STATION_POSITION = 0.4; // fraction into the biome segment (well before the blend zone)
const STOP_OFFSET = 50; // meters from platform start where the window stops

/** One station per biome segment whose biome has a station name. */
function stationIn(k) {
  const biome = BIOMES[mod(k, BIOMES.length)];
  if (!biome.station) return null;
  const start = k * SEGMENT + SEGMENT * STATION_POSITION;
  return {
    id: k,
    name: biome.station,
    start,
    end: start + PLATFORM_LENGTH,
    stopAt: start + STOP_OFFSET,
    grand: biome.city > 0.5,
  };
}

export function stationsBetween(m0, m1) {
  const first = Math.floor(m0 / SEGMENT);
  const count = Math.floor(m1 / SEGMENT) - first + 1;
  return Array.from({ length: count }, (_, i) => stationIn(first + i))
    .filter((s) => s && s.end > m0 && s.start < m1);
}

/** Next station whose stop point is still ahead, skipping the one just served. */
export function nextStation(distance, servedId) {
  const first = Math.floor(distance / SEGMENT);
  for (let k = first; k <= first + BIOMES.length; k++) {
    const s = stationIn(k);
    if (s && s.id !== servedId && s.stopAt >= distance - 1) return s;
  }
  return null;
}
