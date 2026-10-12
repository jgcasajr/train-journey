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

test('passport stamps: one per station and line, first visit kept, never mutated', async () => {
  const { LINE_PAGES, addStamp, lineComplete } = await import('../src/passport.js');
  const empty = Object.freeze({});
  const one = addStamp(empty, 'aurora', 'Nexus', Date.UTC(2026, 9, 5, 12));
  assert.deepEqual(empty, {});
  assert.ok(one.aurora.Nexus.date);
  assert.equal(addStamp(one, 'aurora', 'Nexus', Date.UTC(2027, 0, 1, 12)), one, 'same station again changes nothing');
  assert.equal(addStamp(one, 'horizonte', 'Nexus').aurora, one.aurora);
  assert.equal(lineComplete(one, 'aurora'), false);
  const full = LINE_PAGES[0].stations.reduce((b, s) => addStamp(b, 'aurora', s.name), {});
  assert.equal(lineComplete(full, 'aurora'), true);
  assert.deepEqual(LINE_PAGES.map((p) => p.stations.length), [10, 9, 8]);
});

test('recordings pick a supported format and get a telling file name', async () => {
  const { pickMime, videoName } = await import('../src/recorder.js');
  assert.equal(pickMime((m) => m.startsWith('video/webm')), 'video/webm;codecs=vp9');
  assert.equal(pickMime(() => false), null);
  assert.equal(videoName('timelapse', 12.34, 'video/mp4;codecs=avc1'), 'train-journey-timelapse-km12.3.mp4');
  assert.equal(videoName('clip', 3, 'video/webm'), 'train-journey-video-km3.0.webm');
});

test('the passenger look takes valid choices and falls back for anything else', async () => {
  const { DEFAULT_LOOK, lookFrom } = await import('../src/appearance.js');
  const look = lookFrom({ hairColor: 'ruivo', hairStyle: 'solto', skin: 'negra', sweater: 'verde', pants: 'jeans', glasses: true });
  assert.deepEqual(look.hair, [138, 58, 30]);
  assert.equal(look.hairStyle, 'solto');
  assert.equal(look.glasses, true);
  assert.equal(look.beard, false);
  assert.deepEqual(lookFrom({ hairColor: '<script>', hairStyle: 'moicano', glasses: 'yes' }), DEFAULT_LOOK);
});

test('the album gathers what the browser kept, and copes with missing or broken data', async () => {
  const { albumData } = await import('../src/album.js');
  localStorage.clear();
  const empty = albumData();
  assert.deepEqual([empty.km, empty.stickers.length, empty.stamps, empty.notebook.length, empty.letters.length], [0, 0, 0, 0, 0]);
  localStorage.setItem('train-journey:journal:v1', JSON.stringify({ found: { deer: { km: 3, clock: '10:00' } }, traveled: 12500, seconds: 3900 }));
  localStorage.setItem('train-journey:passport:v1', JSON.stringify({ aurora: { Nexus: { date: '05/10/2026', at: 1 } } }));
  localStorage.setItem('train-journey:letters:v1', '{not json');
  const full = albumData();
  assert.equal(full.km, 12.5);
  assert.equal(full.minutes, 65);
  assert.deepEqual(full.stickers.map((d) => d.id), ['deer']);
  assert.equal(full.stamps, 1);
  assert.deepEqual(full.letters, [], 'broken letters storage is ignored');
  localStorage.clear();
});

test('battery saver: on, off, or automatic on a low battery that is not charging', async () => {
  const { saverActive, shouldDraw, SAVER_FPS } = await import('../src/batterySaver.js');
  assert.equal(saverActive('on', null), true);
  assert.equal(saverActive('off', { charging: false, level: 0.05 }), false);
  assert.equal(saverActive('auto', null), false, 'unknown battery: stays off');
  assert.equal(saverActive('auto', { charging: false, level: 0.2 }), true);
  assert.equal(saverActive('auto', { charging: true, level: 0.2 }), false);
  assert.equal(saverActive('auto', { charging: false, level: 0.8 }), false);
  assert.equal(shouldDraw(1010, 1000, true), false, 'too soon at 20 fps');
  assert.equal(shouldDraw(1000 + 1000 / SAVER_FPS, 1000, true), true);
  assert.equal(shouldDraw(1001, 1000, false), true, 'never skips when not saving');
});
