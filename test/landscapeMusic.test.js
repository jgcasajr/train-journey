import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BIOMES } from '../src/biomes.js';
import { THEMES, scheduleLandscape } from '../src/landscapeMusic.js';

/** A Web Audio stand-in that only counts the sounds scheduled. */
function fakeGraph() {
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {} });
  let notes = 0;
  const node = () => ({
    connect: (n) => n, start() { notes += 1; }, stop() {},
    frequency: param(), gain: param(), Q: param(), type: '', buffer: null,
  });
  const ac = { currentTime: 0, createGain: node, createOscillator: node, createBiquadFilter: node, createBufferSource: node };
  return { g: { ac, out: node(), noise: {} }, notes: () => notes };
}

test('every landscape has a theme', () => {
  BIOMES.forEach((b) => assert.ok(THEMES[b.name], b.name));
});

test('every theme plays, by day and (softer) by night', () => {
  Object.keys(THEMES).forEach((biome) => {
    const day = fakeGraph();
    scheduleLandscape(day.g, { step: 0, time: 0, theme: biome }, 30, () => ({ biome, night: false }));
    const night = fakeGraph();
    scheduleLandscape(night.g, { step: 0, time: 0, theme: biome }, 30, () => ({ biome, night: true }));
    assert.ok(day.notes() > 10, `${biome} by day: ${day.notes()}`);
    assert.ok(night.notes() > 0, `${biome} at night`);
  });
});

test('the theme changes only at the end of a phrase', () => {
  const { g } = fakeGraph();
  let biome = 'Campos';
  let cursor = { step: 0, time: 0, theme: 'Campos' };
  cursor = scheduleLandscape(g, cursor, 3, () => ({ biome, night: false }));
  assert.ok(cursor.step > 0 && cursor.theme === 'Campos');
  biome = 'Deserto';
  cursor = scheduleLandscape(g, cursor, 4, () => ({ biome, night: false }));
  assert.equal(cursor.theme, 'Campos', 'still finishing the phrase');
  cursor = scheduleLandscape(g, cursor, 60, () => ({ biome, night: false }));
  assert.equal(cursor.theme, 'Deserto');
});
