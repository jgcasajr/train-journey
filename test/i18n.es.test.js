import assert from 'node:assert/strict';
import { test } from 'node:test';

// Each test file runs in its own process: start this one in Spanish.
globalThis.window.location.search = '?lang=es';
const { currentLang, dateLocale, t } = await import('../src/i18n.js');
const { EN, EN_PATTERNS } = await import('../src/lang/en.js');
const { ES } = await import('../src/lang/es.js');
const { ES_PATTERNS } = await import('../src/lang/esPatterns.js');

test('starts in Spanish when the address asks for it', () => {
  assert.equal(currentLang(), 'es');
  assert.equal(dateLocale(), 'es-ES');
});

test('every Portuguese string has a Spanish translation', () => {
  const missing = Object.keys(EN).filter((pt) => typeof ES[pt] !== 'string' || ES[pt] === '');
  assert.deepEqual(missing, []);
});

test('placeholders and emoji survive the translation', () => {
  Object.entries(ES).forEach(([pt, es]) => {
    if (pt.includes('{x}')) assert.ok(es.includes('{x}'), pt);
  });
});

test('dictionary strings and runtime sentences translate', () => {
  assert.equal(t('Caderno'), 'Cuaderno');
  assert.equal(t('Boa menina, Bella!'), '¡Buena chica, Bella!');
  assert.equal(t('3 dias seguidos'), '3 días seguidos');
  assert.equal(t('6 de 10 carimbos'), '6 de 10 sellos');
  assert.equal(t('Hora real: 06:21 · lá fora: chuva · atualizado às 06:21').startsWith('Hora real: 06:21 · afuera:'), true);
  assert.equal(t('Próxima estação: Nexus.'), 'Próxima estación: Nexus.');
  assert.equal(t('Você chegou a Nexus!'), '¡Llegaste a Nexus!');
});

test('the same runtime sentences exist in English and Spanish, with intact regexes', () => {
  assert.equal(ES_PATTERNS.length, EN_PATTERNS.length);
  [...EN_PATTERNS, ...ES_PATTERNS].forEach(([re]) => {
    // A lost backslash turns \S, \d or \. into a literal letter or any-character.
    assert.doesNotMatch(re.source, /\((?:S|d)\+\)/, `broken escape in ${re}`);
  });
});
