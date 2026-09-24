import { nextSeasonPhase, seasonIndex } from './seasons.js';
import { approach, hash } from './utils.js';

const AUTO_SLOT = 120; // seconds between automatic weather changes
const STRIKE_RATE = 0.15; // lightning strikes per second at full storm
const BOLT_LIFETIME = 1.2; // seconds a strike stays in state (flash + afterglow)

/** Automatic weather as a pure function of time: mostly clear, sometimes rain or storm. */
function autoWeather(time) {
  const r = hash(Math.floor(time / AUTO_SLOT), 1401);
  if (r < 0.55) return 'clear';
  return r < 0.85 ? 'rain' : 'storm';
}

export function weatherTargets(input, time) {
  const mode = input.weather === 'auto' ? autoWeather(time) : input.weather;
  return { rain: mode === 'clear' ? 0 : 1, storm: mode === 'storm' ? 1 : 0, mode };
}

export function initialWeather(input) {
  const { rain, storm } = weatherTargets(input, 0);
  const season = input.season === 'auto' ? 'summer' : input.season;
  return { rain, storm, wetness: rain, lightning: null, lightningStarted: false, seasonPhase: seasonIndex(season) + 0.2 };
}

function updateLightning(state, dt, storm) {
  const age = state.lightning ? state.lightning.age + dt : null;
  const alive = age !== null && age < BOLT_LIFETIME ? { ...state.lightning, age } : null;
  const strikes = !alive && storm > 0.5 && Math.random() < dt * STRIKE_RATE * storm;
  if (!strikes) return { lightning: alive, lightningStarted: false };
  return {
    lightning: { age: 0, x: 0.1 + Math.random() * 0.8, seed: Math.floor(Math.random() * 1e6), far: Math.random() },
    lightningStarted: true,
  };
}

/** Pure weather step. `wetness` lingers after rain so a rainbow can appear once it stops. */
export function updateWeather(state, dt, input) {
  const target = weatherTargets(input, state.time);
  const rain = approach(state.rain, target.rain, dt * 0.3);
  const storm = approach(state.storm, target.storm, dt * 0.2);
  const wetness = rain > 0.5 ? approach(state.wetness, 1, dt * 0.2) : approach(state.wetness, 0, dt / 60);
  return {
    rain,
    storm,
    wetness,
    seasonPhase: nextSeasonPhase(state.seasonPhase, dt, input.season),
    ...updateLightning(state, dt, storm),
  };
}

/** Brightness of a lightning flash over its short life: a double flicker, then a fade. */
export function flashLevel(lightning) {
  if (!lightning) return 0;
  const { age } = lightning;
  if (age < 0.08) return 1;
  if (age < 0.15) return 0.3;
  if (age < 0.22) return 0.8;
  return Math.exp(-(age - 0.22) * 8) * 0.6;
}

/** Seconds between flash and thunder: farther strikes rumble later. */
export const thunderDelay = (lightning) => 0.3 + lightning.far * 3;
