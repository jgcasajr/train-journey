import { biomeAt, num } from './biomes.js';
import { forEachSlot, layerFrame } from './layers.js';
import { shade } from './sky.js';
import { circle, hash, hex, rgba, scale } from './utils.js';

// Animals that move on their own: a herd galloping in the fields, dolphins leaping in the sea
// and capybara families grazing by the lake.

const HORSE_COATS = ['#6b3e26', '#2b2320', '#a8703f', '#d9cfc1', '#8a5a3a'].map(hex);
const MANE = hex('#241c18');
const DOLPHIN = hex('#5d7386');
const DOLPHIN_BELLY = hex('#d8e2ea');
const FOAM = hex('#f4f8fb');
const CAPY = hex('#8a6440');
const CAPY_DARK = hex('#5e4228');
export const HERD_DEPTH = 0.3; // the fields layer
export const CAPY_DEPTH = 0.3;
const HERD = { period: 70, seconds: 28, seed: 4201 };
const DOLPHINS = { period: 32, seconds: 7, seed: 4211 };

/** A periodic episode: { k, t, p } (t seconds in, p 0..1), or null. */
function episode(time, { period, seconds, seed }, chance = 1) {
  const k = Math.floor(time / period);
  if (hash(k, seed) > chance) return null;
  const t = time - (k * period + hash(k, seed + 1) * (period - seconds));
  return t >= 0 && t <= seconds ? { k, t, p: t / seconds } : null;
}

const pasture = (bm) => num(bm, 'farm') >= 0.25 && num(bm, 'city') < 0.3 && num(bm, 'trees') < 0.7 && num(bm, 'water') < 0.5;

// ---------- Horses galloping in the fields ----------

/** The herd now (the train slowly overtakes it), or null: horses with screen x and size. */
export function herdInView(layout, state) {
  if (!(state.speed > 8)) return null;
  const ep = episode(state.time, HERD, 0.6);
  if (!ep) return null;
  const { win } = layout;
  const lf = layerFrame(layout, state, HERD_DEPTH);
  const lead = win.x + (1.15 - ep.p * 1.45) * win.w;
  if (!pasture(biomeAt((lead - win.x + lf.offset) / lf.px))) return null;
  const count = 3 + Math.floor(hash(ep.k, 4203) * 3);
  return Array.from({ length: count }, (_, i) => ({
    i,
    x: lead + i * win.w * (0.06 + hash(ep.k * 7 + i, 4204) * 0.03),
    s: win.h * (0.075 + hash(ep.k * 7 + i, 4205) * 0.015),
    coat: HORSE_COATS[Math.floor(hash(ep.k * 7 + i, 4206) * HORSE_COATS.length)],
    phase: hash(ep.k * 7 + i, 4207) * 6,
  }));
}

function drawHorse(ctx, x, ground, s, ph, coat, env) {
  const c = (col) => rgba(shade(col, env, 0.06));
  const by = ground - s * 0.66 - s * 0.05 * Math.abs(Math.sin(ph));
  const len = s * 0.33;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, s * 0.07);
  [[0.5, scale(coat, 0.75)], [0, coat]].forEach(([off, col], pass) => {
    ctx.strokeStyle = c(col);
    const fa = 0.6 * Math.sin(ph + off);
    const ha = 0.55 * Math.sin(ph + Math.PI * 0.9 + off);
    [[0.3, fa, fa - Math.max(0, Math.cos(ph + off))], [-0.32, ha + 0.3, ha - 0.4]].forEach(([dx, a1, a2]) => {
      const kx = x + dx * s + Math.sin(a1) * len;
      const ky = by + Math.cos(a1) * len;
      ctx.beginPath();
      ctx.moveTo(x + dx * s, by);
      ctx.lineTo(kx, ky);
      ctx.lineTo(kx + Math.sin(a2) * len, ky + Math.cos(a2) * len);
      ctx.stroke();
    });
    if (pass === 1) return;
    ctx.strokeStyle = c(MANE); // tail, behind the body
    ctx.lineWidth = Math.max(1, s * 0.06);
    ctx.beginPath();
    ctx.moveTo(x - s * 0.4, by - s * 0.06);
    ctx.quadraticCurveTo(x - s * 0.62, by - s * 0.02, x - s * 0.7, by + s * 0.12 + Math.sin(ph) * s * 0.05);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, s * 0.07);
  });
  ctx.fillStyle = c(coat);
  ctx.beginPath();
  ctx.ellipse(x, by, s * 0.42, s * 0.15, 0.05 * Math.sin(ph), 0, Math.PI * 2);
  ctx.fill();
  const hx = x + s * 0.58;
  const hy = by - s * 0.36 + Math.sin(ph) * s * 0.03;
  ctx.strokeStyle = c(coat);
  ctx.lineWidth = s * 0.15;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.3, by - s * 0.02);
  ctx.lineTo(hx - s * 0.06, hy);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(hx + s * 0.04, hy + s * 0.04, s * 0.15, s * 0.06, 0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = c(MANE);
  ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.beginPath();
  ctx.moveTo(x + s * 0.24, by - s * 0.1);
  ctx.quadraticCurveTo(x + s * 0.36, by - s * 0.32, hx - s * 0.08, hy - s * 0.07);
  ctx.stroke();
}

/** The herd galloping the same way as the train, in the fields. */
export function drawHerd(ctx, layout, state, env, heightAt) {
  const herd = herdInView(layout, state);
  if (!herd) return;
  const { win } = layout;
  const lf = layerFrame(layout, state, HERD_DEPTH);
  herd.forEach((h) => {
    const wx = h.x - win.x + lf.offset;
    drawHorse(ctx, h.x, heightAt(wx, biomeAt(wx / lf.px)) + h.s * 0.12, h.s, state.time * Math.PI * 2 * 1.9 + h.phase, h.coat, env);
  });
}

// ---------- Dolphins leaping in the sea ----------

/** Dolphins leaping right now (only on open sea), or null. */
export function dolphinsAt(state, layout) {
  const ep = episode(state.time, DOLPHINS, 0.5);
  if (!ep) return null;
  const x = 0.15 + hash(ep.k, 4213) * 0.6;
  const lf = layerFrame(layout, state, 0.08);
  const bm = biomeAt((lf.offset + x * layout.win.w) / lf.px);
  return num(bm, 'water') > 0.8 && num(bm, 'mirror') < 0.2 ? { ...ep, x, dir: hash(ep.k, 4214) > 0.5 ? 1 : -1 } : null;
}

function drawDolphin(ctx, x, y, s, angle, env) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = rgba(shade(DOLPHIN, env, 0.1));
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.5, s * 0.13, 0, 0, Math.PI * 2);
  ctx.moveTo(s * 0.45, -s * 0.02);
  ctx.lineTo(s * 0.66, s * 0.02);
  ctx.lineTo(s * 0.45, s * 0.05);
  ctx.moveTo(-s * 0.05, -s * 0.1);
  ctx.lineTo(-s * 0.2, -s * 0.3);
  ctx.lineTo(-s * 0.22, -s * 0.08);
  ctx.moveTo(-s * 0.45, 0);
  ctx.lineTo(-s * 0.66, -s * 0.13);
  ctx.lineTo(-s * 0.58, 0);
  ctx.lineTo(-s * 0.66, s * 0.13);
  ctx.fill();
  ctx.fillStyle = rgba(shade(DOLPHIN_BELLY, env, 0.1), 0.55);
  ctx.beginPath();
  ctx.ellipse(s * 0.08, s * 0.08, s * 0.28, s * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Three dolphins leaping one after another, with a splash where each one dives. */
export function drawDolphins(ctx, layout, state, env, waterTop) {
  const pod = dolphinsAt(state, layout);
  if (!pod) return;
  const { win, u } = layout;
  const s = u * 2.6;
  const y0 = waterTop + win.h * 0.08;
  [0, 1, 2].forEach((i) => {
    const p = (pod.t - 1 - i * 0.9) / 1.6; // each jump lasts 1.6 s
    if (p < -0.1 || p > 1.15) return;
    const x0 = win.x + (pod.x + i * 0.04 * pod.dir) * win.w;
    const reach = s * 2.2 * pod.dir;
    if (p >= 0 && p <= 1) {
      const h = s * 0.9;
      const angle = Math.atan2(-Math.cos(p * Math.PI) * h * Math.PI, Math.abs(reach)); // along the arc (mirrored for dir < 0)
      ctx.save();
      ctx.translate(x0 + reach * p, y0 - Math.sin(p * Math.PI) * h);
      ctx.scale(pod.dir, 1);
      drawDolphin(ctx, 0, 0, s, angle, env);
      ctx.restore();
    }
    ctx.fillStyle = rgba(FOAM, 0.75);
    ctx.beginPath();
    [[0, -0.1, 0.1], [1, 0.9, 1.15]].forEach(([at, from, to]) => {
      if (p < from || p > to) return;
      const k = 1 - Math.abs(p - at) / 0.15;
      for (let d = -2; d <= 2; d++) circle(ctx, x0 + reach * at + d * s * 0.12, y0 - Math.abs(d) * s * 0.03 * k - s * 0.08 * k, s * 0.06 * k + 0.5);
    });
    ctx.fill();
  });
}

// ---------- Capybaras by the lake ----------

/** Capybara families on the lake shore (fields layer). */
export function capybarasInView(layout, state) {
  const lf = layerFrame(layout, state, CAPY_DEPTH);
  const found = [];
  forEachSlot(layout.win, lf, layout.win.h * 1.1, layout.win.h * 0.2, 4301, (i, x, wx, bm) => {
    if (num(bm, 'mirror') < 0.6 || hash(i, 4302) > 0.4) return;
    found.push({ i, x, wx, bm });
  });
  return found;
}

function drawCapybara(ctx, x, ground, s, dir, graze, env) {
  ctx.fillStyle = rgba(shade(CAPY, env, 0.06));
  [-0.22, -0.1, 0.12, 0.22].forEach((lx) => ctx.fillRect(x + lx * s, ground - s * 0.18, Math.max(1, s * 0.07), s * 0.18));
  ctx.beginPath();
  ctx.ellipse(x, ground - s * 0.32, s * 0.36, s * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  const hx = x + dir * s * 0.36;
  const hy = ground - s * (0.38 - graze * 0.16);
  ctx.beginPath();
  ctx.ellipse(hx, hy, s * 0.17, s * 0.11, dir * (0.25 + graze * 0.5), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(shade(CAPY_DARK, env, 0.06));
  ctx.fillRect(hx - dir * s * 0.08 - s * 0.03, hy - s * 0.15, s * 0.06, s * 0.06);
  ctx.fillRect(hx + dir * s * 0.12, hy - s * 0.02 + graze * s * 0.04, Math.max(1, s * 0.05), Math.max(1, s * 0.04));
}

/** A grown-up capybara and two pups, grazing and looking up now and then. */
export function drawCapybaras(ctx, layout, state, env, heightAt) {
  const s = layout.win.h * 0.07;
  capybarasInView(layout, state).forEach(({ i, x, wx, bm }) => {
    const dir = hash(i, 4303) > 0.5 ? 1 : -1;
    const y = heightAt(wx, bm) + s * 0.25;
    [[0, 1], [-0.75, 0.55], [0.7, 0.5]].forEach(([dx, k], j) => {
      const graze = Math.max(0, Math.sin(state.time * 0.5 + i + j * 1.7)) ** 0.5;
      drawCapybara(ctx, x + dx * s * dir, y + j * s * 0.04, s * k, dir, graze, env);
    });
  });
}
