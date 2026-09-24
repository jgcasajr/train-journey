import { num } from './biomes.js';
import { forEachSegment, forEachSlot, layerFrame } from './layers.js';
import { shade } from './sky.js';
import { hash, hex, mod, radialGlow, rgba, scale, smoothstep } from './utils.js';

const CONCRETE = ['#8d939c', '#a39c91', '#6f7885', '#b5b0a6', '#7d8a95', '#9a8878'].map(hex);
const GLASS = hex('#34414f');
const LIT = hex('#ffd98a');
const BEACON = hex('#ff3b30');
const BRICK = hex('#8a4a3a');
const SMOKE = hex('#c8c8c8');
const WALL = hex('#8c8a84');
const METAL = hex('#3d4148');
const LAMP = hex('#ffcf7a');

const nightness = (env) => smoothstep(0.55, 0.15, env.light);

function drawWindows(ctx, left, top, w, h, b, env, night) {
  const cols = Math.floor((w - b.cell) / (b.cell * 1.8));
  const rows = Math.floor((h - b.cell) / (b.cell * 2.2));
  if (cols < 1 || rows < 1) return;
  const lit = new Path2D();
  const dark = new Path2D();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isLit = hash(b.id * 977 + r * 31 + c, 404) < 0.45 * night;
      if (!isLit && !b.dayWindows) continue;
      (isLit ? lit : dark).rect(left + b.cell + c * b.cell * 1.8, top + b.cell + r * b.cell * 2.2, b.cell, b.cell * 1.2);
    }
  }
  ctx.fillStyle = rgba(shade(GLASS, env, b.haze), 0.7);
  ctx.fill(dark);
  if (night <= 0) return;
  ctx.fillStyle = rgba(LIT, 0.9 * night);
  ctx.fill(lit);
}

/** b: { x, y, w, h, id, cell, haze, dayWindows } — y is the ground line. */
export function drawBuilding(ctx, b, env, time) {
  const left = b.x - b.w / 2;
  const top = b.y - b.h;
  const night = nightness(env);
  const body = rgba(shade(CONCRETE[Math.floor(hash(b.id, 401) * CONCRETE.length)], env, b.haze));
  ctx.fillStyle = body;
  ctx.fillRect(left, top, b.w, b.h);
  if (hash(b.id, 406) < 0.3) ctx.fillRect(b.x - b.w * 0.3, top - b.h * 0.12, b.w * 0.6, b.h * 0.12);
  drawWindows(ctx, left, top, b.w, b.h, b, env, night);
  if (hash(b.id, 405) > 0.35 || b.h < b.w * 2) return;
  const tip = top - b.h * 0.25;
  ctx.fillRect(b.x - 0.5, tip, 1.2, b.h * 0.25);
  const blink = night * (Math.sin(time * 3 + b.id) > 0.3 ? 1 : 0.2);
  if (blink > 0.05) radialGlow(ctx, b.x, tip, Math.max(3, b.cell * 1.5), BEACON, blink);
}

function drawSmoke(ctx, x, y, s, env, time, id) {
  for (let k = 0; k < 6; k++) {
    const t = (time * 0.25 + k / 6 + hash(id, 421)) % 1;
    ctx.fillStyle = rgba(shade(SMOKE, env, 0.2), 0.35 * (1 - t));
    ctx.beginPath();
    ctx.arc(x - t * s * 0.9, y - t * s * 0.7, s * (0.05 + t * 0.14), 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawFactory(ctx, x, y, s, env, haze, id, time) {
  const w = s * 1.6;
  const h = s * 0.45;
  const left = x - w / 2;
  ctx.fillStyle = rgba(shade(BRICK, env, haze));
  ctx.fillRect(left, y - h, w, h);
  ctx.fillStyle = rgba(shade(scale(BRICK, 0.7), env, haze));
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    ctx.moveTo(left + (k * w) / 4, y - h);
    ctx.lineTo(left + (k * w) / 4, y - h - s * 0.15);
    ctx.lineTo(left + ((k + 1) * w) / 4, y - h);
  }
  ctx.fill();
  const cx = x + w * 0.3;
  const top = y - s * 1.3;
  ctx.fillRect(cx - s * 0.05, top, s * 0.1, s * 1.3);
  ctx.fillStyle = rgba(shade(hex('#d9d4c8'), env, haze));
  ctx.fillRect(cx - s * 0.05, top + s * 0.08, s * 0.1, s * 0.06);
  drawSmoke(ctx, cx, top, s, env, time, id);
}

/** Distant skyline behind the hills: visible (and growing) as the train approaches a city. */
export function drawSkyline(ctx, layout, state, env) {
  const { win, horizon, u } = layout;
  const lf = layerFrame(layout, state, 0.08);
  const base = horizon + win.h * 0.08;
  forEachSlot(win, lf, u * 4.5, u * 8, 411, (i, x, wx, bm) => {
    const city = num(bm, 'city');
    if (city < 0.05 || hash(i, 412) > city) return;
    const h = win.h * (0.05 + hash(i, 413) ** 2 * 0.34) * (0.4 + 0.6 * city);
    const b = { x, y: base, w: u * (3 + hash(i, 414) * 5), h, id: i, cell: Math.max(2, u * 0.45), haze: 0.38, dayWindows: false };
    drawBuilding(ctx, b, env, state.time);
  });
}

/** Mid-distance block: an office/apartment building, or sometimes a factory. */
export function drawCityBlock(ctx, x, y, s, env, haze, id, time, u, city) {
  if (hash(id, 431) < 0.15) return drawFactory(ctx, x, y, s, env, haze, id, time);
  const h = s * (0.6 + hash(id, 432) ** 2 * 2.6) * (0.4 + 0.6 * city);
  const b = { x, y, w: s * (0.5 + hash(id, 433) * 0.7), h, id, cell: Math.max(2.5, u * 0.55), haze, dayWindows: true };
  return drawBuilding(ctx, b, env, time);
}

function drawStreetLamp(ctx, x, ground, layout, env) {
  const { win, u } = layout;
  const top = ground - win.h * 0.32;
  ctx.fillStyle = rgba(shade(METAL, env));
  ctx.fillRect(x - u * 0.3, top, u * 0.6, ground - top);
  ctx.fillRect(x, top, u * 2.6, u * 0.4);
  ctx.fillRect(x + u * 2, top, u * 1.4, u * 0.7);
  const night = nightness(env);
  if (night < 0.05) return;
  radialGlow(ctx, x + u * 2.7, top + u * 0.9, u * 9, LAMP, 0.4 * night);
}

/** Trackside concrete wall with street lamps where the biome is urban. */
export function drawStreetside(ctx, layout, lf, groundAt, env) {
  const { win, u } = layout;
  const spacing = u * 22;
  ctx.fillStyle = rgba(shade(WALL, env));
  forEachSegment(win, lf, spacing, (i, wx0, x0, bm) => {
    if (num(bm, 'city') < 0.3) return;
    const y = groundAt(wx0);
    ctx.fillRect(x0, y - u * 2.2, spacing + 1, win.h);
  });
  forEachSegment(win, lf, spacing, (i, wx0, x0, bm) => {
    if (num(bm, 'city') < 0.3 || mod(i, 2) !== 0) return;
    drawStreetLamp(ctx, x0, groundAt(wx0) - u * 2.2, layout, env);
  });
}
