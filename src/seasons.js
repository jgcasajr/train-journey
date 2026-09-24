import { color } from './biomes.js';
import { hex, mix, mod, smoothstep } from './utils.js';

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
export const SEASON_NAMES = { spring: 'Primavera', summer: 'Verão', autumn: 'Outono', winter: 'Inverno' };
const SEASON_SECONDS = 600; // automatic mode: two in-game days per season
const BLEND_FROM = 0.7; // last 30% of a season cross-fades into the next

const SNOW = hex('#eef2f7');
const AUTUMN_LEAF = hex('#c8642d');
const GOLD = hex('#c9a24a');
const OCHRE = hex('#a8843f');
const SPRING_LEAF = hex('#6fbf4a');
const FRESH = hex('#8fcf5a');

// [target color, strength] per season and palette key; summer is the base palette.
const TINTS = {
  spring: { leaf: [SPRING_LEAF, 0.4], field: [FRESH, 0.3], hills: [FRESH, 0.3], near: [FRESH, 0.25] },
  autumn: { leaf: [AUTUMN_LEAF, 0.7], field: [GOLD, 0.4], hills: [OCHRE, 0.25], near: [OCHRE, 0.25] },
  winter: {
    far: [SNOW, 0.35], mid: [SNOW, 0.5], hills: [SNOW, 0.75], field: [SNOW, 0.8], near: [SNOW, 0.7], ground: [SNOW, 0.6],
  },
};

/** Weights of each season (summing to 1) for a continuous phase in [0, 4). */
export function seasonWeights(phase) {
  const i = mod(Math.floor(phase), 4);
  const blend = smoothstep(BLEND_FROM, 1, phase - Math.floor(phase));
  return Object.fromEntries(SEASONS.map((s, k) => [
    s, (k === i ? 1 - blend : 0) + (k === mod(i + 1, 4) ? blend : 0),
  ]));
}

export const seasonIndex = (name) => SEASONS.indexOf(name);

/** Phase after dt: auto advances through the year; a fixed choice eases toward that season. */
export function nextSeasonPhase(phase, dt, choice) {
  if (choice === 'auto') return mod(phase + dt / SEASON_SECONDS, 4);
  const target = seasonIndex(choice) + 0.2;
  const diff = mod(target - phase + 2, 4) - 2; // shortest way around the year
  return Math.abs(diff) < 0.01 ? target : mod(phase + Math.sign(diff) * Math.min(Math.abs(diff), dt * 0.5), 4);
}

export function dominantSeason(weights) {
  return SEASONS.reduce((best, s) => (weights[s] > weights[best] ? s : best), SEASONS[0]);
}

/** Biome palette color adjusted for the season (snow cover, autumn leaves, spring green). */
export function tint(bm, key, env) {
  return Object.entries(TINTS).reduce((c, [season, keys]) => {
    const w = env.season?.[season] ?? 0;
    return keys[key] && w > 0 ? mix(c, keys[key][0], keys[key][1] * w) : c;
  }, color(bm, key));
}

/** Snow cover for arbitrary scenery colors (crops, roofs...). */
export const snowCover = (c, env, strength = 0.75) => mix(c, SNOW, strength * (env.season?.winter ?? 0));
