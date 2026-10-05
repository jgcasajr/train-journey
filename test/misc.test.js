import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chooseStop } from '../src/focus.js';
import { DEFAULT_DURATIONS, durationsFromParams } from '../src/pomodoro.js';
import { sharedViewUrl } from '../src/share.js';
import { LINE_STATIONS } from '../src/stations.js';
import { CHAPTERS, chapterFor } from '../src/travelers.js';
import { baseInput, start } from './helpers.js';

test('focus durations come from the address, with safe fallbacks', () => {
  assert.deepEqual(durationsFromParams(new URLSearchParams('foco=50&pausa=10')), { focus: 50, rest: 10 });
  assert.deepEqual(durationsFromParams(new URLSearchParams('foco=-1&pausa=abc')), DEFAULT_DURATIONS);
  assert.deepEqual(durationsFromParams(new URLSearchParams('foco=999')), DEFAULT_DURATIONS);
});

test('a focus block heads to a station of the current line', () => {
  const state = start(baseInput());
  [60, 25 * 60, 50 * 60].forEach((seconds) => {
    const name = chooseStop(state, seconds, true);
    assert.ok(LINE_STATIONS[0].includes(name), `${seconds}s -> ${name}`);
  });
});

test('travelers tell the next chapter on each reunion', () => {
  assert.equal(chapterFor('kid', 0), null);
  assert.equal(chapterFor('kid', 1), CHAPTERS.kid[0]);
  assert.equal(chapterFor('kid', 99), CHAPTERS.kid.at(-1));
  assert.equal(chapterFor('nobody', 2), null);
});

test('a shared link carries the exact view', () => {
  const location = { origin: 'https://example.org', pathname: '/train-journey/' };
  const state = { distance: 12345, dayCount: 3, dayTime: 0.75, car: 'dining' };
  const url = new URL(sharedViewUrl(location, state, { weather: 'rain', season: 'autumn' }));
  assert.equal(url.pathname, '/train-journey/');
  const p = url.searchParams;
  assert.deepEqual(
    [p.get('km'), p.get('dia'), p.get('hora'), p.get('clima'), p.get('estacao'), p.get('vagao')],
    ['12.35', '3', '18:00', 'rain', 'autumn', 'dining'],
  );
});

test('the sleep timer fades sound and light gradually', async () => {
  const { sleepLevels } = await import('../src/sleepTimer.js');
  const start = sleepLevels(0);
  const half = sleepLevels(0.5);
  const end = sleepLevels(1);
  assert.equal(start.volume, 1);
  assert.equal(start.veil, 0);
  assert.ok(half.volume < 1 && half.volume > 0);
  assert.ok(half.veil > 0 && half.veil < end.veil);
  assert.equal(end.volume, 0);
  assert.ok(sleepLevels(0.01).drowsy);
});

test('a drowsy passenger falls asleep even in daylight', async () => {
  const { run: go } = await import('./helpers.js');
  const input = baseInput({ stops: false, drowsy: true });
  const s = go(start(input), input, 8);
  assert.ok(s.pose.sleep > 0.5, `sleep pose ${s.pose.sleep}`);
});
