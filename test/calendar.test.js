import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCalendar, easter, holidayFor, parseDay } from '../src/calendar.js';

const day = (y, m, d) => new Date(y, m - 1, d, 12);

test('Easter dates', () => {
  assert.equal(easter(2026).toDateString(), day(2026, 4, 5).toDateString());
  assert.equal(easter(2027).toDateString(), day(2027, 3, 28).toDateString());
  assert.equal(easter(2025).toDateString(), day(2025, 4, 20).toDateString());
});

test('special days of the calendar', () => {
  assert.equal(holidayFor(day(2026, 12, 24)), 'natal');
  assert.equal(holidayFor(day(2026, 12, 31)), 'anoNovo');
  assert.equal(holidayFor(day(2027, 1, 1)), 'anoNovo');
  assert.equal(holidayFor(day(2026, 10, 12)), 'criancas');
  assert.equal(holidayFor(day(2026, 6, 24)), 'junina');
  assert.equal(holidayFor(day(2026, 2, 14)), 'carnaval', 'Saturday');
  assert.equal(holidayFor(day(2026, 2, 17)), 'carnaval', 'Tuesday');
  assert.equal(holidayFor(day(2026, 2, 18)), 'carnaval', 'Ash Wednesday');
  assert.equal(holidayFor(day(2026, 2, 19)), null);
  assert.equal(holidayFor(day(2026, 10, 13)), null);
});

test('?data= pretends it is another day; invalid dates are ignored', () => {
  assert.equal(createCalendar(new URLSearchParams('data=2026-12-25')).current(), 'natal');
  assert.equal(parseDay('2026-02-30'), null);
  assert.equal(createCalendar(new URLSearchParams('data=nope'), () => day(2026, 10, 12)).current(), 'criancas');
});
