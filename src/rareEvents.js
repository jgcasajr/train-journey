import { SEGMENT, biomeAt, segmentBiome } from './biomes.js';
import { layerFrame } from './frame.js';
import { shade } from './sky.js';
import { circle, clamp, hash, hex, rgba, smoothstep } from './utils.js';

const FLAGS = ['#e84b3c', '#f2c230', '#2f9e5a', '#3a7bd5', '#e86fb0', '#ffffff'].map(hex);
const FIRE = ['#ffd24a', '#ff8a2a', '#e8452c'].map(hex);
const TENT = hex('#d8342c');
const TENT_LIGHT = hex('#f4efe6');
const SMOKE = hex('#ffffff');
const PLANE = hex('#e8e8ec');
const CIRCUS_AT = 0.72; // fraction into a fields/farm segment
const PLANE_PERIOD = 150;
const PLANE_SECONDS = 28;

// ---------- Festa junina at country stations ----------

/** Some days a country station throws a festa junina (flags over the platform, a bonfire). */
export function festaAt(state, st) {
  if (st.grand || st.nexus) return false;
  return hash(st.id * 31 + (state.dayCount ?? 0), 3401) < 0.3;
}

function drawBunting(ctx, g, x0, x1, y, time) {
  const { u } = g;
  ctx.strokeStyle = g.c(hex('#3a3a3a'));
  ctx.lineWidth = Math.max(1, u * 0.15);
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.quadraticCurveTo((x0 + x1) / 2, y + u * 3, x1, y);
  ctx.stroke();
  const n = Math.max(4, Math.floor((x1 - x0) / (u * 2.4)));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = x0 + (x1 - x0) * t;
    const sag = 4 * t * (1 - t) * u * 1.5;
    const flutter = Math.sin(time * 4 + i) * u * 0.3;
    ctx.fillStyle = g.c(FLAGS[i % FLAGS.length]);
    ctx.beginPath();
    ctx.moveTo(x - u * 0.8, y + sag);
    ctx.lineTo(x + u * 0.8, y + sag);
    ctx.lineTo(x + flutter, y + sag + u * 1.8);
    ctx.fill();
  }
}

function drawBonfire(ctx, g, x, time) {
  const { u } = g;
  const base = g.platformTop - u * 0.2;
  ctx.fillStyle = g.c(hex('#5a3a22'));
  ctx.fillRect(x - u * 2.5, base - u * 0.8, u * 5, u * 0.8);
  FIRE.forEach((c, k) => {
    const h = u * (4 - k) * (0.85 + 0.15 * Math.sin(time * 9 + k * 2));
    ctx.fillStyle = rgba(c, 0.9);
    ctx.beginPath();
    ctx.moveTo(x - u * (1.8 - k * 0.4), base - u * 0.6);
    ctx.quadraticCurveTo(x + Math.sin(time * 6 + k) * u * 0.6, base - h * 1.4, x + u * (1.8 - k * 0.4), base - u * 0.6);
    ctx.fill();
  });
  const glow = ctx.createRadialGradient(x, base - u * 2, 0, x, base - u * 2, u * 14);
  glow.addColorStop(0, rgba(FIRE[1], 0.25 + g.night * 0.3));
  glow.addColorStop(1, rgba(FIRE[1], 0));
  ctx.fillStyle = glow;
  ctx.fillRect(x - u * 14, base - u * 16, u * 28, u * 28);
}

/** Flags under the canopy and a bonfire on the platform (station geometry `g` from stationView). */
export function drawFesta(ctx, g, st, time) {
  const x0 = g.toX(st.start + 10);
  const x1 = g.toX(st.end - 10);
  const step = (x1 - x0) / 3;
  [0, 1, 2].forEach((k) => drawBunting(ctx, g, x0 + k * step, x0 + (k + 1) * step, g.canopyBottom + g.u * 1.2, time));
  drawBonfire(ctx, g, g.toX(st.stopAt + 30), time); // mid-window while stopped
}

// ---------- The circus in the fields ----------

/** A circus big top pitched in some field or farm segments. */
function circusIn(k) {
  const biome = segmentBiome(k);
  if (biome.name !== 'Campos' && biome.name !== 'Fazenda') return null;
  return hash(k, 3501) < 0.5 ? k * SEGMENT + SEGMENT * CIRCUS_AT : null;
}

/** Screen position of a circus visible on the fields layer, or null. */
export function circusInView(layout, state, depth) {
  const lf = layerFrame(layout, state, depth);
  const { win } = layout;
  const m0 = (lf.offset - win.w) / lf.px;
  const m1 = (lf.offset + win.w * 2) / lf.px;
  for (let k = Math.floor(m0 / SEGMENT); k <= Math.floor(m1 / SEGMENT); k++) {
    const at = circusIn(k);
    if (at === null) continue;
    const x = win.x + at * lf.px - lf.offset;
    if (x > win.x - win.w * 0.2 && x < win.x + win.w * 1.2) return { x, wx: at * lf.px, at };
  }
  return null;
}

export function drawCircus(ctx, layout, state, env, depth, heightAt) {
  const c = circusInView(layout, state, depth);
  if (!c) return;
  const s = layout.win.h * 0.16;
  const base = heightAt(c.wx, biomeAt(c.at)) + s * 0.08;
  const stripes = 8;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = rgba(shade(i % 2 ? TENT_LIGHT : TENT, env, 0.06));
    const xa = c.x - s * 0.7 + (i * s * 1.4) / stripes;
    const xb = xa + (s * 1.4) / stripes;
    ctx.beginPath();
    ctx.moveTo(c.x, base - s * 0.95);
    ctx.lineTo(xa, base - s * 0.45);
    ctx.lineTo(xa, base);
    ctx.lineTo(xb, base);
    ctx.lineTo(xb, base - s * 0.45);
    ctx.fill();
  }
  ctx.fillStyle = rgba(shade(hex('#3a2a1e'), env, 0.06));
  ctx.fillRect(c.x - s * 0.1, base - s * 0.28, s * 0.2, s * 0.28);
  ctx.strokeStyle = rgba(shade(hex('#444444'), env, 0.06));
  ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.beginPath();
  ctx.moveTo(c.x, base - s * 0.95);
  ctx.lineTo(c.x, base - s * 1.15);
  ctx.stroke();
  ctx.fillStyle = rgba(shade(FLAGS[1], env, 0.06));
  ctx.beginPath();
  ctx.moveTo(c.x, base - s * 1.15);
  ctx.lineTo(c.x + s * 0.18 + Math.sin(state.time * 3) * s * 0.02, base - s * 1.1);
  ctx.lineTo(c.x, base - s * 1.05);
  ctx.fill();
}

// ---------- Skywriting ----------

/** A small plane writing a heart in the sky on some clear days (0..1 progress), or null. */
export function skywriterAt(state, env) {
  if (env.sunElev < 0.05 || env.rain > 0.2) return null;
  const k = Math.floor(state.time / PLANE_PERIOD);
  if (hash(k, 3601) > 0.35) return null;
  const start = k * PLANE_PERIOD + 10 + hash(k, 3602) * (PLANE_PERIOD - PLANE_SECONDS - 60);
  const t = (state.time - start) / PLANE_SECONDS;
  return t >= 0 && t <= 2 ? { k, t } : null; // t > 1: the heart lingers and fades
}

/** Heart curve, 0..1 along the outline, centered at (0,0), about 2 units wide. */
function heartPoint(p) {
  const a = p * Math.PI * 2;
  return { x: (16 * Math.sin(a) ** 3) / 17, y: -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 17 };
}

export function drawSkywriter(ctx, layout, state, env) {
  const w = skywriterAt(state, env);
  if (!w) return;
  const { win, horizon, u } = layout;
  const cx = win.x + win.w * (0.3 + hash(w.k, 3603) * 0.4);
  const cy = win.y + (horizon - win.y) * 0.35;
  const r = Math.min(win.w, win.h) * 0.16;
  const drawn = clamp(w.t);
  const fade = 1 - smoothstep(1.2, 2, w.t);
  ctx.fillStyle = rgba(SMOKE, 0.75 * fade);
  for (let p = 0; p < drawn; p += 0.006) {
    const h = heartPoint(p);
    const puff = u * (0.7 + (drawn - p) * 1.2);
    ctx.beginPath();
    circle(ctx, cx + h.x * r, cy + h.y * r, puff);
    ctx.fill();
  }
  if (w.t > 1) return;
  const h = heartPoint(drawn);
  ctx.fillStyle = rgba(shade(PLANE, env));
  ctx.beginPath();
  ctx.ellipse(cx + h.x * r, cy + h.y * r, u * 1.4, u * 0.45, 0, 0, Math.PI * 2);
  ctx.fillRect(cx + h.x * r - u * 0.3, cy + h.y * r - u * 1.1, u * 0.6, u * 2.2);
  ctx.fill();
}
