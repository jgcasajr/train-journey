import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const chrome = process.env.CHROME_BIN || (process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : 'google-chrome');
const probeFile = join(root, '.browser-smoke.html');
const probe = `<script>
window.addEventListener('error', e => document.documentElement.dataset.smokeError = e.message);
window.addEventListener('unhandledrejection', e => document.documentElement.dataset.smokeError = String(e.reason));
let smokeTicks = 0;
const smokeTimer = setInterval(() => console.log('smoke tick', ++smokeTicks, Math.round(performance.now())), 500);
setTimeout(() => clearInterval(smokeTimer), 6000);
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

try {
  const html = await readFile(join(root, 'index.html'), 'utf8');
  await writeFile(probeFile, html.replace('<head>', `<head>${probe}`));
  for (const [width, height] of [[1280, 800], [390, 844]]) {
    const url = `${pathToFileURL(probeFile).href}?nosplash&nowelcome&lang=pt`;
    // Just enough virtual time for the probe (it reads the page at 1.2 s). A fresh profile for every
    // launch, no /dev/shm and no D-Bus (absent on CI machines) avoid the known start-up hangs of
    // headless Chrome there; a stalled launch is retried once.
    const runChrome = async () => {
      const profile = await mkdtemp(join(tmpdir(), 'tj-smoke-'));
      try {
        return spawnSync(chrome, [
          '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run',
          '--no-default-browser-check', '--disable-extensions', `--user-data-dir=${profile}`,
          '--allow-file-access-from-files', '--enable-logging=stderr', '--v=0',
          `--window-size=${width},${height}`, '--virtual-time-budget=1600', '--dump-dom', url,
        ], { encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024, env: { ...process.env, DBUS_SESSION_BUS_ADDRESS: 'disabled:' } });
      } finally {
        await rm(profile, { recursive: true, force: true }).catch(() => {});
      }
    };
    let result = await runChrome();
    if (result.error?.code === 'ETIMEDOUT') {
      console.warn(`Chrome stalled at ${width}x${height}; trying once more.`);
      result = await runChrome();
    }
    if (result.error) {
      // Show what the page was doing before Chrome had to be stopped (console lines and errors).
      const log = String(result.stderr ?? '').split('\n').filter((l) => /CONSOLE|ERROR|Uncaught|smoke/.test(l)).slice(-40).join('\n');
      console.error(`Chrome did not finish at ${width}x${height}. Last page log lines:\n${log || '(none)'}`);
      throw result.error;
    }
    const dom = result.stdout;
    const ok = /data-smoke-canvas="true"/.test(dom) && /data-smoke-destinations="([2-9]\d|\d{3,})"/.test(dom)
      && /data-smoke-route="true"/.test(dom) && /data-smoke-actions="true"/.test(dom)
      && !/data-smoke-error=/.test(dom);
    if (!ok) throw new Error(`Browser smoke failed at ${width}x${height}: ${dom.match(/<html[^>]*>/)?.[0] ?? result.stderr.slice(-700)}`);
    console.log(`Browser smoke OK: ${width}x${height}, canvas rendered, route and scene actions loaded`);
  }
} finally {
  await unlink(probeFile).catch(() => {});
}
