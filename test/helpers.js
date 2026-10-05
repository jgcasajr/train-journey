import { initialState, step } from '../src/journey.js';

export const baseInput = (over = {}) => ({
  targetKmh: 80,
  dayTime: 0.5,
  autoDay: false,
  stops: true,
  weather: 'clear',
  season: 'summer',
  destination: '',
  events: [],
  ...over,
});

/** Runs the simulation for `seconds` at a fixed frame time; `until(state)` stops early. */
export function run(state, input, seconds, { dt = 1 / 30, until } = {}) {
  let s = state;
  for (let t = 0; t < seconds; t += dt) {
    s = step(s, dt, input);
    if (until?.(s)) return s;
  }
  return s;
}

export const start = (input, km) => initialState(input, km);
