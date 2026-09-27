import { SEGMENT, biomeAt, num, segmentBiome } from './biomes.js';
import { forEachSlot } from './layers.js';
import { shade } from './sky.js';
import { hash, hex, radialGlow, rgba, smoothstep } from './utils.js';

const HULLS = ['#7a2e2e', '#2e4a7a', '#f4f1ea', '#3d5a3a'].map(hex);
const SAIL = hex('#f7f3e8');
const MAST = hex('#3a3027');
const TOWER = hex('#f2eee6');
const BAND = hex('#c0392b');
const ROCK = hex('#6b6560');
const LANTERN = hex('#fff0b3');
const LIGHTHOUSE_POSITION = 0.72; // fraction into the coast segment

function drawSailboat(ctx, x, y, s, hull, env) {
  ctx.fillStyle = rgba(shade(hull, env, 0.1));
  ctx.beginPath();
  ctx.moveTo(x - s, y - s * 0.3);
  ctx.lineTo(x + s, y - s * 0.3);
  ctx.lineTo(x + s * 0.7, y);
  ctx.lineTo(x - s * 0.7, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(shade(MAST, env, 0.1));
  ctx.fillRect(x - s * 0.04, y - s * 2.2, s * 0.08, s * 1.9);
  ctx.fillStyle = rgba(shade(SAIL, env, 0.1));
  ctx.beginPath();
  ctx.moveTo(x + s * 0.08, y - s * 2.1);
  ctx.lineTo(x + s * 0.9, y - s * 0.45);
  ctx.lineTo(x + s * 0.08, y - s * 0.45);
  ctx.closePath();
  ctx.moveTo(x - s * 0.08, y - s * 1.8);
  ctx.lineTo(x - s * 0.7, y - s * 0.45);
  ctx.lineTo(x - s * 0.08, y - s * 0.45);
  ctx.fill();
}

function drawFishingBoat(ctx, x, y, s, hull, env) {
  ctx.fillStyle = rgba(shade(hull, env, 0.1));
  ctx.beginPath();
  ctx.moveTo(x - s, y - s * 0.4);
  ctx.lineTo(x + s * 1.1, y - s * 0.5);
  ctx.lineTo(x + s * 0.8, y);
  ctx.lineTo(x - s * 0.8, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(shade(SAIL, env, 0.1));
  ctx.fillRect(x - s * 0.5, y - s * 0.95, s * 0.7, s * 0.55);
  ctx.fillStyle = rgba(shade(MAST, env, 0.1));
  ctx.fillRect(x + s * 0.4, y - s * 1.6, s * 0.06, s * 1.2);
}

/** Boats bobbing on the sea layer; they drift slowly back and forth. */
export function drawBoats(ctx, layout, state, env, lf, waterTop) {
  const { win, u } = layout;
  forEachSlot(win, lf, u * 22, u * 8, 1301, (i, x, wx, bm) => {
    const water = num(bm, 'water');
    if (water < 0.3 || hash(i, 1302) > water * 0.45) return;
    const depthT = hash(i, 1303) ** 1.5;
    const s = u * (0.6 + depthT * 1.6);
    const bx = x + Math.sin(state.time * 0.05 + i) * u * 5;
    const by = waterTop + u * 0.6 + depthT * win.h * 0.12 + Math.sin(state.time * 1.4 + i) * s * 0.08;
    const hull = HULLS[Math.floor(hash(i, 1304) * HULLS.length)];
    if (hash(i, 1305) < 0.6) drawSailboat(ctx, bx, by, s, hull, env);
    else drawFishingBoat(ctx, bx, by, s, hull, env);
  });
}

function lighthousesBetween(m0, m1) {
  const first = Math.floor(m0 / SEGMENT);
  const count = Math.floor(m1 / SEGMENT) - first + 1;
  return Array.from({ length: count }, (_, i) => first + i)
    .filter((k) => segmentBiome(k).water > 0.5)
    .map((k) => k * SEGMENT + SEGMENT * LIGHTHOUSE_POSITION)
    .filter((at) => at > m0 && at < m1);
}

function drawBeam(ctx, x, y, layout, time, night) {
  const { win, u } = layout;
  const angle = time * 1.1;
  const reach = Math.cos(angle);
  const facing = 1 - Math.abs(reach); // beam pointing at the viewer
  const len = win.w * 0.6 * Math.abs(reach);
  const spread = u * (1.2 + facing * 3);
  const g = ctx.createLinearGradient(x, y, x + Math.sign(reach) * len, y);
  g.addColorStop(0, rgba(LANTERN, 0.35 * night));
  g.addColorStop(1, rgba(LANTERN, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y - u * 0.3);
  ctx.lineTo(x + Math.sign(reach) * len, y - spread);
  ctx.lineTo(x + Math.sign(reach) * len, y + spread);
  ctx.lineTo(x, y + u * 0.3);
  ctx.fill();
  radialGlow(ctx, x, y, u * (2 + facing ** 4 * 10), LANTERN, 0.5 + facing ** 4 * 0.5);
}

/** Striped lighthouse on the coastal hills; its beam sweeps around at night. */
export function drawLighthouses(ctx, layout, state, env, lf, heightAt) {
  const { win, u } = layout;
  const night = smoothstep(0.5, 0.15, env.light);
  const m0 = (lf.offset - lf.margin) / lf.px - 50;
  const m1 = (lf.offset + win.w + lf.margin) / lf.px + 50;
  lighthousesBetween(m0, m1).forEach((at) => {
    const x = win.x + at * lf.px - lf.offset;
    const base = heightAt(at * lf.px, biomeAt(at));
    const h = win.h * 0.17;
    const w0 = u * 2.2;
    const w1 = u * 1.4;
    ctx.fillStyle = rgba(shade(ROCK, env, 0.12));
    ctx.beginPath();
    ctx.ellipse(x, base, u * 4, u * 1.4, 0, Math.PI, 0);
    ctx.fill();
    for (let k = 0; k < 5; k++) {
      const t0 = k / 5;
      const t1 = (k + 1) / 5;
      ctx.fillStyle = rgba(shade(k % 2 ? BAND : TOWER, env, 0.12));
      ctx.beginPath();
      ctx.moveTo(x - (w0 + (w1 - w0) * t0) / 2, base - h * t0);
      ctx.lineTo(x + (w0 + (w1 - w0) * t0) / 2, base - h * t0);
      ctx.lineTo(x + (w0 + (w1 - w0) * t1) / 2, base - h * t1);
      ctx.lineTo(x - (w0 + (w1 - w0) * t1) / 2, base - h * t1);
      ctx.fill();
    }
    const lanternY = base - h - u * 0.9;
    ctx.fillStyle = night > 0.05 ? rgba(LANTERN) : rgba(shade(hex('#9fb3c0'), env, 0.12));
    ctx.fillRect(x - w1 * 0.4, lanternY - u * 0.6, w1 * 0.8, u * 1.3);
    ctx.fillStyle = rgba(shade(BAND, env, 0.12));
    ctx.beginPath();
    ctx.moveTo(x - w1 * 0.6, lanternY - u * 0.6);
    ctx.lineTo(x, lanternY - u * 1.6);
    ctx.lineTo(x + w1 * 0.6, lanternY - u * 0.6);
    ctx.fill();
    if (night > 0.05) drawBeam(ctx, x, lanternY, layout, state.time, night);
    const flash = (state.effects ?? []).find((e) => e.kind === 'flash' && e.at === at);
    const age = flash ? state.time - flash.born : Infinity;
    if (age < FLASH_SECONDS) {
      const k = 1 - age / FLASH_SECONDS;
      radialGlow(ctx, x, lanternY, u * (6 + k * 26), LANTERN, 0.9 * k);
    }
  });
}

const FLASH_SECONDS = 1.6;
export const LIGHTHOUSE_DEPTH = 0.12; // lighthouses stand on the hills layer

/** Lighthouses in view: track position and screen x (outside-view coordinates). */
export function lighthousesInView(layout, lf) {
  const m0 = (lf.offset - lf.margin) / lf.px - 50;
  const m1 = (lf.offset + layout.win.w + lf.margin) / lf.px + 50;
  return lighthousesBetween(m0, m1).map((at) => ({ at, x: layout.win.x + at * lf.px - lf.offset }));
}
