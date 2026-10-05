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
