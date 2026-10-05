import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';

// Every module except the browser entry point must load: catches broken imports/exports early.
const files = readdirSync(new URL('../src/', import.meta.url)).filter((f) => f.endsWith('.js') && f !== 'main.js');

for (const file of files) {
  test(`src/${file} loads`, async () => {
    const mod = await import(`../src/${file}`);
    assert.ok(Object.keys(mod).length > 0, 'exports something');
  });
}

// main.js needs a page to run, so check its imports statically: every name must be exported.
test('src/main.js imports only names that exist', async () => {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const imports = [...source.matchAll(/import \{([^}]+)\} from '(\.\/[\w/]+\.js)';/g)];
  assert.ok(imports.length > 20);
  for (const [, names, path] of imports) {
    const mod = await import(new URL(path, new URL('../src/', import.meta.url)).href);
    names.split(',').map((n) => n.trim()).filter(Boolean).forEach((name) => {
      assert.ok(name in mod, `${name} is not exported by ${path}`);
    });
  }
});
