import { biomeAt, num } from './biomes.js';
import { forEachSlot, layerFrame } from './layers.js';
import { shade } from './sky.js';
import { circle, hash, hex, rgba } from './utils.js';

const DEER = hex('#8a5a34');
const DEER_BELLY = hex('#d9b98a');
const ANTLER = hex('#e8dcc0');
const WHALE = hex('#3a4a5c');
const SPRAY = hex('#f2f6fa');
export const DEER_DEPTH = 0.3; // deer graze on the fields layer
const WHALE_PERIOD = 45;
const WHALE_SECONDS = 9;

/** Deer slots currently in view on the fields layer (only deep in the forest, and rare). */
export function deerInView(layout, state) {
  const lf = layerFrame(layout, state, DEER_DEPTH);
  const found = [];
  forEachSlot(layout.win, lf, layout.win.h * 0.9, layout.win.h * 0.2, 2201, (i, x, wx, bm) => {
    if (num(bm, 'trees') < 0.8 || num(bm, 'snow') > 0.5 || hash(i, 2202) > 0.3) return;
    found.push({ i, x, wx, bm });
  });
  return found;
}

/** A deer in profile; `graze` 0..1 lowers the head to the grass. */
function drawDeer(ctx, x, y, s, dir, graze, env) {
  const body = rgba(shade(DEER, env, 0.06));
  ctx.fillStyle = body;
  [-0.18, -0.12, 0.12, 0.18].forEach((lx) => ctx.fillRect(x + lx * s, y - s * 0.42, Math.max(1, s * 0.035), s * 0.42));
  ctx.beginPath();
  ctx.ellipse(x, y - s * 0.46, s * 0.26, s * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(shade(DEER_BELLY, env, 0.06));
  ctx.beginPath();
  ctx.ellipse(x, y - s * 0.4, s * 0.18, s * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();
  const neckX = x + dir * s * 0.22;
  const headX = neckX + dir * s * (0.1 + graze * 0.06);
  const headY = y - s * (0.78 - graze * 0.5);
  ctx.strokeStyle = body;
  ctx.lineWidth = Math.max(1, s * 0.08);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(neckX, y - s * 0.5);
  ctx.lineTo(headX, headY);
  ctx.stroke();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(headX + dir * s * 0.05, headY, s * 0.08, s * 0.045, dir * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(shade(ANTLER, env, 0.06));
  ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.beginPath();
  [-0.04, 0.03].forEach((o) => {
    ctx.moveTo(headX + o * s, headY - s * 0.03);
    ctx.lineTo(headX + o * s - dir * s * 0.05, headY - s * 0.2);
    ctx.moveTo(headX + o * s - dir * s * 0.02, headY - s * 0.1);
    ctx.lineTo(headX + o * s + dir * s * 0.06, headY - s * 0.16);
  });
  ctx.stroke();
}

/** Deer grazing among the forest trees; they lift their heads now and then. */
export function drawWildlife(ctx, layout, state, env, heightAt) {
  const s = layout.win.h * 0.13;
  deerInView(layout, state).forEach(({ i, x, wx, bm }) => {
    const dir = hash(i, 2203) > 0.5 ? 1 : -1;
    const graze = Math.max(0, Math.sin(state.time * 0.4 + i)) ** 0.5;
    drawDeer(ctx, x, heightAt(wx, bm) + s * 0.05, s, dir, graze, env);
  });
}

/** A whale surfacing in the sea: rises, blows, arches its back and dives showing the tail. */
export function whaleAt(state, layout) {
  const k = Math.floor(state.time / WHALE_PERIOD);
  if (hash(k, 2211) > 0.45) return null;
  const start = k * WHALE_PERIOD + hash(k, 2212) * (WHALE_PERIOD - WHALE_SECONDS);
  const t = state.time - start;
  if (t < 0 || t > WHALE_SECONDS) return null;
  const x = 0.2 + hash(k, 2213) * 0.6;
  const lf = layerFrame(layout, state, 0.08);
  const meters = (lf.offset + x * layout.win.w) / lf.px;
  return num(biomeAt(meters), 'water') > 0.8 ? { k, t, x } : null;
}

export function drawWhale(ctx, layout, state, env, waterTop) {
  const whale = whaleAt(state, layout);
  if (!whale) return;
  const { win, u } = layout;
  const x = win.x + whale.x * win.w;
  const y = waterTop + win.h * (0.05 + hash(whale.k, 2214) * 0.06);
  const s = u * 7;
  const { t } = whale;
  ctx.fillStyle = rgba(shade(WHALE, env, 0.1));
  if (t < 6) {
    const rise = Math.sin(Math.min(1, t / 6) * Math.PI) * s * 0.35;
    ctx.beginPath();
    ctx.ellipse(x, y, s, rise + 1, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + s * 0.2, y - rise);
    ctx.lineTo(x + s * 0.35, y - rise - s * 0.12);
    ctx.lineTo(x + s * 0.4, y - rise * 0.7);
    ctx.fill();
  }
  if (t > 1.5 && t < 3.5) {
    const k = (t - 1.5) / 2;
    ctx.fillStyle = rgba(SPRAY, 0.8 * (1 - k));
    ctx.beginPath();
    for (let d = 0; d < 7; d++) circle(ctx, x - s * 0.5 + (d - 3) * s * 0.07 * k, y - s * (0.3 + k * 0.8) + Math.abs(d - 3) * s * 0.06, s * 0.08);
    ctx.fill();
  }
  if (t > 6) {
    const k = (t - 6) / 3;
    const lift = Math.sin(k * Math.PI) * s * 0.7;
    ctx.fillStyle = rgba(shade(WHALE, env, 0.1));
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - s * 0.08, y - lift);
    ctx.quadraticCurveTo(x - s * 0.45, y - lift - s * 0.2, x - s * 0.5, y - lift - s * 0.05);
    ctx.lineTo(x, y - lift + s * 0.05);
    ctx.lineTo(x + s * 0.5, y - lift - s * 0.05);
    ctx.quadraticCurveTo(x + s * 0.45, y - lift - s * 0.2, x + s * 0.08, y - lift);
    ctx.closePath();
    ctx.fill();
  }
}
