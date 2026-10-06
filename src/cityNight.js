import { biomeAt, num } from './biomes.js';
import { layerFrame } from './frame.js';
import { clamp, hash, hex, rgba, smoothstep } from './utils.js';

// The big city at night: an amber glow over the skyline, neon signs, and the lights of the
// streets sliding across the window glass as blurred reflections.

const GLOW = hex('#ffaa5a');
const NEONS = ['#ff4fa3', '#3ff0ff', '#ffd23f', '#7cff6b', '#b388ff'].map(hex);
const BOKEH = ['#ffcf7a', '#ffe2b0', '#ff7a7a', '#9fd4ff'].map(hex);

export const nightness = (env) => smoothstep(0.55, 0.15, env.light);

/** How much "city at night" there is around the train (0..1). */
export const cityNight = (state, env) => num(biomeAt(state.distance), 'city') * nightness(env);

/** Amber light pollution over the skyline (drawn behind the distant buildings). */
export function drawCityGlow(ctx, layout, state, env) {
  const { win, horizon } = layout;
  const lf = layerFrame(layout, state, 0.08);
  const city = num(biomeAt((lf.offset + win.w / 2) / lf.px), 'city');
  const a = 0.38 * city * nightness(env) * (1 - env.rain * 0.4);
  if (a < 0.01) return;
  const top = horizon - win.h * 0.4;
  const g = ctx.createLinearGradient(0, horizon + win.h * 0.08, 0, top);
  g.addColorStop(0, rgba(GLOW, a));
  g.addColorStop(0.45, rgba(GLOW, a * 0.35));
  g.addColorStop(1, rgba(GLOW, 0));
  ctx.fillStyle = g;
  ctx.fillRect(win.x - win.w, top, win.w * 3, horizon + win.h * 0.08 - top);
}

/** A vertical neon sign on the side of a building; a few of them flicker. */
export function drawNeon(ctx, b, night, time) {
  if (night < 0.1 || hash(b.id, 407) > 0.3 || b.h < b.w * 1.2) return;
  const flickery = hash(b.id, 408) < 0.25;
  const on = !flickery || Math.sin(time * 13 + b.id) + Math.sin(time * 5.3) > -0.6;
  const color = NEONS[Math.floor(hash(b.id, 409) * NEONS.length)];
  const w = Math.max(4, b.w * 0.2);
  const h = Math.min(b.h * 0.5, w * 4.5);
  const x = hash(b.id, 410) > 0.5 ? b.x - b.w / 2 - w * 0.6 : b.x + b.w / 2 - w * 0.4;
  const y = b.y - b.h * 0.85;
  ctx.fillStyle = rgba(hex('#1a1a22'), 0.9);
  ctx.fillRect(x, y, w, h);
  if (!on) return;
  const a = night * (flickery ? 0.75 : 0.95);
  const glow = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, h * 0.9);
  glow.addColorStop(0, rgba(color, 0.55 * a));
  glow.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(x - h, y - h * 0.4, w + h * 2, h * 1.8);
  ctx.strokeStyle = rgba(color, a);
  ctx.lineWidth = Math.max(1.5, w * 0.14);
  ctx.strokeRect(x + w * 0.12, y + w * 0.12, w * 0.76, h - w * 0.24);
  ctx.fillStyle = rgba(color, a);
  const bars = Math.max(2, Math.floor(h / (w * 0.9)));
  for (let k = 0; k < bars; k++) ctx.fillRect(x + w * 0.3, y + w * 0.35 + k * (h - w * 0.6) / bars, w * 0.4, Math.max(1, w * 0.18));
}

/**
 * Lights of the street sliding over the glass: soft out-of-focus discs (and streaks at speed),
 * reflections of lamps and signs on the other side of the carriage. Drawn on the glass itself.
 */
export function drawCityReflections(ctx, layout, state, env) {
  const amount = cityNight(state, env);
  if (amount < 0.05) return;
  const { win, u } = layout;
  const lf = layerFrame(layout, state, 1.25);
  const spacing = u * 26;
  const first = Math.floor(lf.offset / spacing) - 1;
  const last = Math.floor((lf.offset + win.w) / spacing) + 1;
  const streak = clamp(state.speed / 30) * u * 6;
  for (let i = first; i <= last; i++) {
    if (hash(i, 6201) > 0.7) continue;
    const x = win.x + i * spacing + hash(i, 6202) * spacing * 0.6 - lf.offset;
    const y = win.y + win.h * (0.12 + hash(i, 6203) * 0.45);
    const r = u * (2 + hash(i, 6204) * 4);
    const color = BOKEH[Math.floor(hash(i, 6205) * BOKEH.length)];
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, rgba(color, 0.16 * amount));
    g.addColorStop(0.7, rgba(color, 0.08 * amount));
    g.addColorStop(1, rgba(color, 0));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale((r + streak) / r, 1); // stretched into a streak by the speed
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
