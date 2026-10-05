import assert from 'node:assert/strict';
import { test } from 'node:test';
import { step } from '../src/journey.js';
import { DWELL, nextStation } from '../src/stations.js';
import { baseInput, run, start } from './helpers.js';

test('step never mutates the previous state', () => {
  const input = baseInput();
  const prev = start(input);
  const before = JSON.stringify(prev);
  step(prev, 1 / 30, input);
  assert.equal(JSON.stringify(prev), before);
});

test('the train speeds up towards the chosen speed', () => {
  const input = baseInput({ stops: false });
  const s = run({ ...start(input), speed: 0 }, input, 20);
  assert.ok(Math.abs(s.speed - 80 / 3.6) < 0.01, `speed ${s.speed}`);
});

test('stops at the next station, waits the dwell and leaves again', () => {
  const input = baseInput();
  const first = start(input);
  const station = nextStation(first.distance, null);
  const arrived = run(first, input, 600, { until: (s) => s.arrived });
  assert.equal(arrived.served.name, station.name);
  assert.equal(arrived.distance, station.stopAt);
  assert.equal(arrived.dwell, DWELL);
  const gone = run(arrived, input, DWELL + 5);
  assert.ok(gone.distance > station.stopAt, 'moving again');
});

test('holds at the destination and records the trip', () => {
  const input = baseInput({ destination: 'Nexus', stops: false });
  const s = run(start(input), input, 1200, { until: (st) => st.holding });
  assert.equal(s.holding, true);
  assert.equal(s.arrivedAt.name, 'Nexus');
  assert.ok(s.arrivedAt.km > 0);
  const later = run(s, input, 30);
  assert.equal(later.distance, s.distance, 'waits until the viewer decides');
});

test('days advance only with the automatic clock', () => {
  const fixed = run(start(baseInput()), baseInput(), 5);
  assert.equal(fixed.dayTime, 0.5);
  const auto = baseInput({ autoDay: true });
  assert.ok(run(start(auto), auto, 5).dayTime > 0.5);
});
