import { biomeAt, num } from './biomes.js';
import { clamp, hash, mod, rgba, smoothstep } from './utils.js';

const HAIL_SLOT = 120; // seconds: each stormy stretch either hails or not
const ICE = [236, 242, 250];

/** Wind strength 0..1: storms and rain, breezy coasts and mountains, and slow gusts. */
export function windAt(state) {
  const bm = biomeAt(state.distance);
  const breeze = 0.12 + num(bm, 'water') * 0.15 + num(bm, 'mtn') * 0.08;
  const gust = 0.12 * Math.sin(state.time * 0.31) + 0.08 * Math.sin(state.time * 1.13 + 1);
  return clamp(breeze + (state.storm ?? 0) * 0.65 + (state.rain ?? 0) * 0.15 + gust);
}

/** Some stormy stretches bring hail instead of plain rain. */
export const hailAt = (state) => (state.storm ?? 0) > 0.5 && hash(Math.floor(state.time / HAIL_SLOT), 3801) < 0.4;

/** How much a tree leans with the wind (skew factor), different for each tree `seed`. */
export const treeLean = (env, time, seed) => (env.wind ?? 0) * (0.1 + 0.07 * Math.sin(time * 1.7 + seed));

/** Draws something tall (a tree) leaning with the wind, pivoting at its base (x, y). */
export function leaning(ctx, x, y, lean, draw) {
  if (Math.abs(lean) < 0.004) {
    draw(x, y);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.transform(1, 0, lean, 1, 0, 0); // the higher up, the further it bends
  draw(0, 0);
  ctx.restore();
}

/** Hailstones: small white pellets falling fast and slanted by the wind. */
export function drawHail(ctx, layout, state, env) {
  const { win, u } = layout;
  const slant = 0.3 + (env.wind ?? 0) * 0.5;
  ctx.fillStyle = rgba(ICE, 0.9);
  for (let i = 0; i < 150; i++) {
    const depth = 0.4 + hash(i, 3811) * 0.6;
    const fall = state.time * win.h * 1.6 * depth;
    const y = win.y + mod(hash(i, 3812) * win.h + fall, win.h);
    const x = win.x + mod(hash(i, 3813) * win.w - fall * slant - state.distance * layout.px * 0.4, win.w);
    ctx.beginPath();
    ctx.arc(x, y, u * 0.28 * depth + 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Blizzard: snow driven sideways by the wind and a white-out that swallows the distance. */
export function drawBlizzard(ctx, layout, state, env) {
  const { win, u } = layout;
  const wind = Math.max(0.6, env.wind ?? 0);
  ctx.fillStyle = rgba([240, 244, 250], 0.28 + env.rain * 0.2);
  ctx.fillRect(win.x, win.y, win.w, win.h);
  ctx.strokeStyle = rgba([250, 252, 255], 0.85);
  ctx.lineCap = 'round';
  for (let i = 0; i < 260; i++) {
    const depth = 0.35 + hash(i, 3821) * 0.65;
    const run = state.time * win.w * 0.9 * wind * depth + state.distance * layout.px * 0.6 * depth;
    const x = win.x + mod(hash(i, 3822) * win.w - run, win.w);
    const y = win.y + mod(hash(i, 3823) * win.h + state.time * win.h * 0.25 * depth + Math.sin(state.time * 3 + i) * u, win.h);
    ctx.lineWidth = u * 0.4 * depth + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + u * 2.5 * depth * wind, y - u * 0.4 * depth);
    ctx.stroke();
  }
}

/** How strong the desert mirage is: clear, high sun over the desert. */
export function mirageStrength(state, env) {
  const bm = biomeAt(state.distance);
  const desert = (bm.a.name === 'Deserto' ? 1 - bm.t : 0) + (bm.b.name === 'Deserto' ? bm.t : 0);
  return desert * smoothstep(0.75, 0.92, env.sunElev) * (1 - clamp(env.rain * 4)); // around midday only
}

/** Heat shimmer at the horizon: a wavering band of sky "water" over the far ground. */
export function drawMirage(ctx, layout, state, env) {
  const strength = mirageStrength(state, env);
  if (strength < 0.03) return;
  const { win, horizon } = layout;
  const band = win.h * 0.05;
  for (let y = horizon - band * 0.2; y < horizon + band; y += 2) {
    const k = (y - horizon) / band;
    const shimmer = 0.5 + 0.5 * Math.sin(y * 0.9 + state.time * 5);
    const offset = Math.sin(y * 0.35 + state.time * 3) * 3;
    ctx.fillStyle = rgba(env.top, strength * 0.8 * shimmer * (1 - Math.abs(k - 0.3)));
    ctx.fillRect(win.x - 20 + offset, y, win.w + 40, 2);
  }
}
