import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Opens the real page in headless Chrome at a desktop and a phone size and checks that it
// renders, lists the stations, takes a route and shows the scene actions, with no page errors.
// With Playwright installed (as in CI) it drives the browser and waits for the checks; without
// it (a plain checkout) it runs the local Chrome once and reads the page it dumps.

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const chrome = process.env.CHROME_BIN || (process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : 'google-chrome');
const probeFile = join(root, '.browser-smoke.html');
const VIEWPORTS = [[1280, 800], [390, 844]];
const probe = `<script>
window.addEventListener('error', e => document.documentElement.dataset.smokeError = e.message);
window.addEventListener('unhandledrejection', e => document.documentElement.dataset.smokeError = String(e.reason));
setTimeout(() => {
  const canvas = document.getElementById('scene');
  const pixel = canvas?.getContext('2d')?.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
  document.documentElement.dataset.smokeCanvas = String(Boolean(canvas?.width && canvas?.height && pixel?.[3]));
  document.documentElement.dataset.smokeDestinations = String(document.getElementById('destination')?.options.length ?? 0);
  const route = document.getElementById('route-stop');
  route.value = 'Nexus';
  document.getElementById('route-add').click();
  document.documentElement.dataset.smokeRoute = String(document.getElementById('destination').value === 'Nexus'
    && document.querySelectorAll('#route-list li').length === 1);
  document.documentElement.dataset.smokeActions = String(document.querySelectorAll('#scene-actions button').length >= 6);
}, 1200);
</script>`;

/** The <html> start tag after the probe ran, with its data-smoke-* results. */
async function withPlaywright(playwright, url, [width, height]) {
  const browser = await playwright.chromium.launch({ args: ['--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on('crash', () => console.error(`Page crashed at ${width}x${height}`));
    page.on('pageerror', (err) => console.error(`Page error at ${width}x${height}:`, err.message));
    page.on('console', (msg) => { if (msg.type() === 'error' || msg.type() === 'warning') console.error(`console.${msg.type()}:`, msg.text()); });
    await page.goto(url);
    await page.waitForFunction(() => document.documentElement.dataset.smokeActions !== undefined, null, { timeout: 20000 });
    return page.evaluate(() => document.documentElement.outerHTML.match(/<html[^>]*>/)[0]);
  } finally {
    await browser.close();
  }
}

async function withLocalChrome(url, [width, height]) {
  const profile = await mkdtemp(join(tmpdir(), 'tj-smoke-'));
  try {
    const result = spawnSync(chrome, [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
      `--user-data-dir=${profile}`, '--allow-file-access-from-files',
      `--window-size=${width},${height}`, '--virtual-time-budget=1600', '--dump-dom', url,
    ], { encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
    if (result.error) throw result.error;
    return result.stdout.match(/<html[^>]*>/)?.[0] ?? result.stderr.slice(-700);
  } finally {
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }
}

const playwright = await import('playwright').catch(() => null);
try {
  const html = await readFile(join(root, 'index.html'), 'utf8');
  await writeFile(probeFile, html.replace('<head>', `<head>${probe}`));
  const url = `${pathToFileURL(probeFile).href}?nosplash&nowelcome&lang=pt`;
  for (const size of VIEWPORTS) {
    const tag = playwright ? await withPlaywright(playwright, url, size) : await withLocalChrome(url, size);
    const ok = /data-smoke-canvas="true"/.test(tag) && /data-smoke-destinations="([2-9]\d|\d{3,})"/.test(tag)
      && /data-smoke-route="true"/.test(tag) && /data-smoke-actions="true"/.test(tag)
      && !/data-smoke-error=/.test(tag);
    if (!ok) throw new Error(`Browser smoke failed at ${size.join('x')}: ${tag}`);
    console.log(`Browser smoke OK (${playwright ? 'Playwright' : 'local Chrome'}): ${size.join('x')}, canvas rendered, route and scene actions loaded`);
  }
} finally {
  await unlink(probeFile).catch(() => {});
}
