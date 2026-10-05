import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LINES, LINE_SPAN, lineAt, lineKm, lineStart, nightLine } from '../src/biomes.js';
import { TRANSFER_STATION, canTransfer, needsChange, otherLine, transferState } from '../src/lineChange.js';
import { LINE_STATIONS, STATION_NAMES, linesOf, stationOnLine } from '../src/stations.js';

test('distance maps to a line and a km within it', () => {
  assert.equal(lineAt(0), 0);
  assert.equal(lineAt(LINE_SPAN + 5), 1);
  assert.equal(lineAt(1e15), LINES.length - 1);
  assert.equal(lineKm(lineStart(1) + 2500), 2.5);
});

test('only the Star Line is night-only', () => {
  assert.deepEqual(LINES.map((_, i) => nightLine(lineStart(i))), [false, false, true]);
});

test('every line stops at Nexus and station names are unique per line', () => {
  LINE_STATIONS.forEach((names) => {
    assert.ok(names.includes(TRANSFER_STATION));
    assert.equal(new Set(names).size, names.length);
  });
  assert.deepEqual(linesOf(TRANSFER_STATION), [0, 1, 2]);
  assert.ok(STATION_NAMES.length > 20);
});

const atNexus = (line, extra = {}) => {
  const st = stationOnLine(line, TRANSFER_STATION);
  return { distance: st.stopAt, dwell: 10, served: { id: st.id, name: st.name }, holding: false, destination: null, ...extra };
};

test('a change is only possible while standing at Nexus', () => {
  assert.equal(canTransfer(atNexus(0)), true);
  assert.equal(canTransfer(atNexus(0, { dwell: 0 })), false);
  assert.equal(canTransfer(atNexus(0, { holding: true })), false);
  assert.deepEqual(transferState(atNexus(0, { dwell: 0 })), {});
});

test("the other line is the destination's line, or the next one", () => {
  assert.equal(otherLine(atNexus(0)), 1);
  assert.equal(otherLine(atNexus(2)), 0);
  assert.equal(otherLine(atNexus(0, { destination: 'Vega' })), 2);
  assert.equal(needsChange(atNexus(0, { destination: 'Vega' })), true);
  assert.equal(needsChange(atNexus(0, { destination: 'Oásis' })), false);
});

test("changing trains lands on the other line's Nexus and keeps the trip distance", () => {
  const from = atNexus(0, { destination: 'Maré Mansa', tripStart: { distance: 1000, time: 0 }, transfers: 0 });
  const next = transferState(from);
  const to = stationOnLine(1, TRANSFER_STATION);
  assert.equal(next.distance, to.stopAt);
  assert.equal(next.speed, 0);
  assert.equal(next.transfers, 1);
  assert.equal(next.distance - next.tripStart.distance, from.distance - from.tripStart.distance);
});
