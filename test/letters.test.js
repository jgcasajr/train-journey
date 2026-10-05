import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeLetter, encodeLetter } from '../src/letters.js';

test('a letter survives the trip through the URL, accents and emoji included', () => {
  const letter = { text: 'Olá! Vista linda daqui 🚆✨ — ção', name: 'Guilherme', date: '05/10/2026' };
  const code = encodeLetter(letter);
  assert.match(code, /^[A-Za-z0-9_-]+$/, 'URL-safe');
  assert.deepEqual(decodeLetter(code), letter);
});

test('markup stays plain text (rendered with textContent)', () => {
  const text = '<img src=x onerror=alert(1)>';
  assert.equal(decodeLetter(encodeLetter({ text, name: '', date: '' })).text, text);
});

test('control characters are cleaned and lengths capped', () => {
  const back = decodeLetter(encodeLetter({ text: `a\u0000b\n\nc${'x'.repeat(400)}`, name: 'n'.repeat(80), date: '' }));
  assert.ok(back.text.startsWith('a b c'));
  assert.equal(back.text.length, 280);
  assert.equal(back.name.length, 40);
});

test('garbage, empty letters and oversized codes are ignored', () => {
  assert.equal(decodeLetter(null), null);
  assert.equal(decodeLetter('%%%not-base64'), null);
  assert.equal(decodeLetter(encodeLetter({ text: '   ', name: 'x', date: '' })), null);
  assert.equal(decodeLetter('A'.repeat(2001)), null);
});
