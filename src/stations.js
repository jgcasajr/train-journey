import { BIOMES, LINES, LOOP, SEGMENT, lineBiomes, lineStart, segmentBiome } from './biomes.js';

export const PLATFORM_LENGTH = 170; // meters
export const DWELL = 14; // seconds stopped at a station
const STATION_POSITION = 0.4; // fraction into the biome segment (well before the blend zone)
const STOP_OFFSET = 50; // meters from platform start where the window stops

/** One station per biome segment whose biome has a station name. */
function stationIn(k) {
  const biome = segmentBiome(k);
  if (!biome.station) return null;
  const start = k * SEGMENT + SEGMENT * STATION_POSITION;
  return {
    id: k,
    name: biome.station,
    start,
    end: start + PLATFORM_LENGTH,
    stopAt: start + STOP_OFFSET,
    grand: biome.city > 0.5,
    nexus: biome.station === 'Nexus', // the station of the new phase (Fractal Nexus)
  };
}

export function stationsBetween(m0, m1) {
  const first = Math.floor(m0 / SEGMENT);
  const count = Math.floor(m1 / SEGMENT) - first + 1;
  return Array.from({ length: count }, (_, i) => stationIn(first + i))
    .filter((s) => s && s.end > m0 && s.start < m1);
}

/** Next station with this name still ahead (stations repeat every lap). */
export function nextStationNamed(distance, name, servedId) {
  const first = Math.floor(distance / SEGMENT);
  for (let k = first; k <= first + BIOMES.length * 2; k++) {
    const s = stationIn(k);
    if (s && s.name === name && s.id !== servedId && s.stopAt >= distance - 1) return s;
  }
  return null;
}

/** Station names of each line, in line order. */
export const LINE_STATIONS = LINES.map((_, i) => lineBiomes(i).filter((b) => b.station).map((b) => b.station));
/** Every station name once (for the destination picker and the journal). */
export const STATION_NAMES = [...new Set(LINE_STATIONS.flat())];

/** Lines a station belongs to (Nexus is on both). */
export const linesOf = (name) => LINE_STATIONS.flatMap((names, i) => (names.includes(name) ? [i] : []));

/** A station on the first lap of a line, or null. */
export function stationOnLine(line, name) {
  const first = Math.floor(lineStart(line) / SEGMENT);
  for (let k = first; k < first + LOOP / SEGMENT; k++) {
    const s = stationIn(k);
    if (s && s.name === name) return s;
  }
  return null;
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
