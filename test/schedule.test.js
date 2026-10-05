import assert from 'node:assert/strict';
import { test } from 'node:test';
import { planSchedule, solveSpeed } from '../src/schedule.js';
import { baseInput, run, start } from './helpers.js';

test('solveSpeed: more time means a slower train, impossible means null', () => {
  const fast = solveSpeed(10000, 300, 0);
  const slow = solveSpeed(10000, 900, 0);
  assert.ok(fast > slow);
  assert.equal(solveSpeed(100000, 60, 0), null);
  assert.ok(solveSpeed(0, 60, 0) > 0);
});

test('a planned trip arrives close to the asked time', () => {
  const seconds = 600;
  const dt = 1 / 10;
  const first = start(baseInput({ stops: false }));
  const plan = planSchedule(first, 'Nexus', seconds, false);
  assert.ok(plan && !plan.late, 'reachable');
  const driving = baseInput({ stops: false, targetKmh: plan.kmh, destination: 'Nexus', destinationAt: plan.stopAt });
  let elapsed = 0;
  run(first, driving, seconds * 2, { dt, until: (s) => { elapsed += dt; return s.holding; } });
  assert.ok(Math.abs(elapsed - seconds) < 20, `arrived after ${elapsed.toFixed(1)} s`);
});

test('too little time is flagged as late at full speed', () => {
  const plan = planSchedule(start(baseInput()), 'Lago Sereno', 5, true);
  assert.equal(plan.late, true);
  assert.equal(Math.round(plan.kmh), 220);
});
