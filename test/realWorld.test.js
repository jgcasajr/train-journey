import assert from 'node:assert/strict';
import { test } from 'node:test';
import { realDayTime, seasonFor, weatherFromCode } from '../src/realWorld.js';

test('the clock maps to the fraction of the day', () => {
  assert.equal(realDayTime(new Date(2026, 9, 5, 0, 0, 0)), 0);
  assert.equal(realDayTime(new Date(2026, 9, 5, 12, 0, 0)), 0.5);
  assert.equal(realDayTime(new Date(2026, 9, 5, 18, 0, 0)), 0.75);
});

test('seasons flip south of the equator', () => {
  const october = new Date(2026, 9, 5);
  assert.equal(seasonFor(october, 48.8), 'autumn');
  assert.equal(seasonFor(october, -23.5), 'spring');
  assert.equal(seasonFor(new Date(2026, 0, 10), -23.5), 'summer');
  assert.equal(seasonFor(new Date(2026, 6, 10), -23.5), 'winter');
});

test('WMO weather codes map to clear, rain, snow and storm', () => {
  assert.deepEqual(weatherFromCode(0), { weather: 'clear', snow: false });
  assert.deepEqual(weatherFromCode(3), { weather: 'clear', snow: false });
  assert.deepEqual(weatherFromCode(61), { weather: 'rain', snow: false });
  assert.deepEqual(weatherFromCode(81), { weather: 'rain', snow: false });
  assert.deepEqual(weatherFromCode(73), { weather: 'rain', snow: true });
  assert.deepEqual(weatherFromCode(95), { weather: 'storm', snow: false });
});
