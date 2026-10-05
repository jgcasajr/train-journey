import assert from 'node:assert/strict';
import { test } from 'node:test';

// Each test file runs in its own process: start this one in English.
globalThis.window.location.search = '?lang=en';
const { currentLang, t } = await import('../src/i18n.js');
const { EN, EN_PATTERNS } = await import('../src/lang/en.js');

test('starts in the language asked for in the address', () => {
  assert.equal(currentLang(), 'en');
});

test('dictionary strings and their lowercase forms translate', () => {
  assert.equal(t('Caderno'), 'Notebook');
  assert.equal(t('caderno'), 'notebook');
});

test('patterns translate sentences with names and places', () => {
  assert.equal(t('Responder a Ana'), 'Reply to Ana');
  assert.match(t('Te escrevi uma carta do trem (Linha Aurora, km 3.0, Campo). Abra para ler e ver a mesma vista:'), /^I wrote you a letter/);
});

test('unknown and empty text pass through untouched', () => {
  assert.equal(t('Xyzzy'), 'Xyzzy');
  assert.equal(t(''), '');
  assert.equal(t(undefined), undefined);
});

test('the dictionary is well formed', () => {
  Object.entries(EN).forEach(([pt, en]) => assert.equal(typeof en, 'string', pt));
  EN_PATTERNS.forEach(([re, fn]) => {
    assert.ok(re instanceof RegExp);
    assert.equal(typeof fn, 'function');
  });
});
