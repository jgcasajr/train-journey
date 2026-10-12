import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cometNight, eclipseAt, moonbowStrength, withEclipse } from '../src/skyWonders.js';

const days = Array.from({ length: 400 }, (_, d) => d);

test('comets and eclipses are rare, and ?ceu forces them', () => {
  const comets = days.filter((d) => cometNight({ dayCount: d })).length;
  const eclipses = days.filter((d) => eclipseAt({ dayCount: d, dayTime: 0.37 })).length;
  assert.ok(comets > 10 && comets < 80, `${comets} comet nights`);
  assert.ok(eclipses > 2 && eclipses < 40, `${eclipses} eclipse days`);
  assert.ok(cometNight({ dayCount: 0, wonder: 'cometa' }) || cometNight({ dayCount: 1, wonder: 'cometa' }));
});

test('an eclipse passes in the morning, total in the middle, and darkens the day', () => {
  const at = (t) => eclipseAt({ dayCount: 0, dayTime: t, wonder: 'eclipse' });
  assert.equal(at(0.3), null);
  assert.equal(at(0.5), null);
  assert.ok(at(0.37).cover > 0.95, 'totality');
  assert.ok(at(0.33).cover < 0.3, 'just starting');
  const day = { light: 1, top: [100, 150, 220], bottom: [180, 210, 240] };
  assert.ok(withEclipse(day, { dayCount: 0, dayTime: 0.37, wonder: 'eclipse' }).light < 0.3);
  assert.equal(withEclipse(day, { dayCount: 0, dayTime: 0.6, wonder: 'eclipse' }), day);
});

test('a moonbow needs a full moon, light rain, night and a low moon', () => {
  const night = { sunElev: -0.4, rain: 0.15, moonPhase: 0.5 };
  assert.ok(moonbowStrength({}, night) > 0.5);
  assert.equal(moonbowStrength({}, { ...night, rain: 0 }), 0, 'no rain, no bow');
  assert.equal(moonbowStrength({}, { ...night, moonPhase: 0.1 }), 0, 'crescent moon');
  assert.equal(moonbowStrength({}, { ...night, sunElev: 0.3 }), 0, 'daytime');
});
