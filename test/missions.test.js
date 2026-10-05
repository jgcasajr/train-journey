import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MISSIONS, completed, dayKey, dayRecord, missionFor } from '../src/missions.js';

test('every day has a mission, the same for everyone, never repeated two days in a row', () => {
  const keys = Array.from({ length: 120 }, (_, i) => dayKey(new Date(2026, 0, 1 + i, 12)));
  const picks = keys.map(missionFor);
  picks.forEach((m) => assert.ok(MISSIONS.includes(m)));
  picks.slice(1).forEach((m, i) => assert.notEqual(m.id, picks[i].id, `${keys[i]} -> ${keys[i + 1]}`));
  assert.equal(missionFor('2026-10-05'), missionFor('2026-10-05'));
  assert.ok(new Set(picks.map((m) => m.id)).size > MISSIONS.length / 2, 'variety');
});

test('streak grows on consecutive days and resets after a gap', () => {
  const day1 = completed(dayRecord(null, '2026-10-05'));
  assert.deepEqual([day1.streak, day1.total], [1, 1]);
  assert.equal(dayRecord(day1, '2026-10-05'), day1, 'same day keeps the record');
  const day2 = completed(dayRecord(day1, '2026-10-06'));
  assert.deepEqual([day2.streak, day2.total, day2.done], [2, 2, true]);
  const fresh = dayRecord(day2, '2026-10-07');
  assert.deepEqual([fresh.done, fresh.km, fresh.streak], [false, 0, 2]);
  const gap = dayRecord(day2, '2026-10-09');
  assert.deepEqual([gap.streak, gap.total], [0, 2]);
});

test('distance and time missions count what was done today', () => {
  const km = MISSIONS.find((m) => m.id === 'km10');
  assert.equal(km.test({}, { km: 9.9, minutes: 0 }), false);
  assert.equal(km.test({}, { km: 10, minutes: 0 }), true);
  assert.equal(MISSIONS.find((m) => m.id === 'nexus').test({ station: 'Nexus' }), true);
});
