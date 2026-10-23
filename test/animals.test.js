import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bellaAt, bellaGreeting } from '../src/bella.js';
import { tunnelsBetween } from '../src/tunnel.js';
import { baseInput, run, start } from './helpers.js';

const running = (over = {}) => ({ time: 30, distance: 2000, speed: 25, dwell: 0, bellaFirst: 25, ...over });

test('Bella comes running early in the trip, and ?bella brings her sooner', () => {
  assert.ok(bellaAt(running()));
  assert.equal(bellaAt(running({ time: 10 })), null);
  assert.ok(bellaAt(running({ time: 5, bellaFirst: 3 })));
  assert.ok(bellaAt(running({ time: 4005, bellaFirst: 4003 })), '?bella also works in a resumed trip');
});

test('she fades out as the train stops, and is gone at the platform', () => {
  assert.equal(bellaAt(running()).alpha, 1);
  assert.ok(bellaAt(running({ speed: 2.5 })).alpha < 1);
  assert.equal(bellaAt(running({ speed: 0 })), null);
  assert.equal(bellaAt(running({ dwell: 5, speed: 0 })), null);
});

test('she does not run into tunnels', () => {
  const [tunnel] = tunnelsBetween(0, 400000);
  assert.ok(tunnel, 'the line has a tunnel');
  assert.equal(bellaAt(running({ distance: tunnel.start + 10 })), null);
});

test('the passenger greets her once per run', () => {
  const input = baseInput({ stops: false });
  const first = { ...start(input, 2), bellaFirst: 3 };
  let greetings = 0;
  run(first, input, 30, { until: (s) => { if (s.speech?.text.includes('Bella')) greetings = s.bellaRuns; return false; } });
  assert.equal(greetings, 1);
});

test('no greeting while she is still far behind or already greeted', () => {
  assert.deepEqual(bellaGreeting(running({ time: 26 }), running({ time: 26.1 })), {}, 'too early');
  assert.deepEqual(bellaGreeting(running({ time: 29 }), running({ time: 29.1 })), {}, 'already greeted');
  assert.ok(bellaGreeting(running({ time: 27.95 }), running({ time: 28.05 })).speech);
});

test('with Bella aboard she no longer runs outside, and her mood follows the trip', async () => {
  const { bellaMood, bellaCanBoard } = await import('../src/bellaAboard.js');
  assert.equal(bellaAt(running({ bellaAboard: true })), null);
  const calm = { time: 1, dwell: 0, pose: { sleep: 0 }, effects: [] };
  assert.equal(bellaMood({ ...calm, dwell: 5 }).station, 1, 'ears up at stations');
  assert.equal(bellaMood({ ...calm, pose: { sleep: 1 } }).sleep, 1, 'sleeps with her');
  assert.ok(bellaMood({ ...calm, time: 2, effects: [{ kind: 'bella', born: 1.5 }] }).happy > 0.5, 'happy when petted');
  assert.deepEqual(['passenger', 'dining', 'sleeper', 'cab'].map(bellaCanBoard), [true, true, false, false]);
});

test('some days Bella waits at a station and the passenger greets her on arrival', async () => {
  const { bellaWaitsAt, bellaPlatformGreeting } = await import('../src/bellaPlatform.js');
  const { stationsBetween } = await import('../src/stations.js');
  const sts = stationsBetween(0, 38500 * 3);
  const days = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const waits = days.flatMap((d) => sts.filter((st) => bellaWaitsAt(st, { dayCount: d })));
  assert.ok(waits.length > 0 && waits.length < sts.length * days.length * 0.4, `${waits.length} waits`);
  const nexus = sts.find((st) => st.nexus);
  const day = days.find((d) => bellaWaitsAt(nexus, { dayCount: d }));
  assert.equal(bellaWaitsAt(nexus, { dayCount: day, bellaAboard: true }), false, 'not while she travels aboard');
  const prev = { arrived: false, dayCount: day, time: 10 };
  const next = { ...prev, arrived: true, served: { id: nexus.id, name: 'Nexus' }, pose: { sleep: 0 } };
  assert.match(bellaPlatformGreeting(prev, next).speech.text, /Bella/);
  assert.deepEqual(bellaPlatformGreeting(next, next), {}, 'only on arrival');
});
