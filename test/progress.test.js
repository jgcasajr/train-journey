import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exportProgress, importProgress, saveJourney, savedJourney } from '../src/progress.js';
import { validStops } from '../src/itinerary.js';
import { initialState } from '../src/journey.js';

function storage() {
  const data = new Map();
  return {
    get length() { return data.size; },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

test('a journey survives a backup and restores its position', () => {
  const source = storage();
  const state = { ...initialState({ targetKmh: 90, dayTime: 0.3, weather: 'clear', season: 'summer' }), distance: 32145, time: 600, destination: 'Nexus', car: 'passenger' };
  assert.equal(saveJourney(state, source), true);
  const target = storage();
  assert.equal(importProgress(exportProgress(source), target), 1);
  assert.deepEqual(savedJourney(target), state);
});

test('invalid backups cannot write unrelated browser data', () => {
  const target = storage();
  target.setItem('another-app:key', 'keep');
  const malicious = JSON.stringify({ kind: 'train-journey-backup', version: 1, entries: { 'another-app:key': 'replace' } });
  assert.throws(() => importProgress(malicious, target));
  assert.equal(target.getItem('another-app:key'), 'keep');
});

test('route accepts known stops, including a repeated visit, within its limit', () => {
  assert.equal(validStops(['Nexus', 'Porto Azul', 'Nexus'], ['Nexus', 'Porto Azul']), true);
  assert.equal(validStops(['Unknown'], ['Nexus']), false);
  assert.equal(validStops(Array(13).fill('Nexus'), ['Nexus']), false);
});
