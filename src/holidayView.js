import { biomeAt, num } from './biomes.js';
import { shade } from './sky.js';
import { hash, hex, mod, rgba, smoothstep } from './utils.js';

// What the special days look like: Christmas lights and trees, Carnival confetti, kites.

const BULBS = ['#ff3b3b', '#ffd23f', '#3fd27a', '#4fa3ff', '#ff7ad9'].map(hex);
const CONFETTI = ['#ff4fa3', '#ffd23f', '#3ff0ff', '#7cff6b', '#ff7a3a', '#b388ff'].map(hex);
const PINE = hex('#2f6b3a');
const TRUNK = hex('#6b4a33');
const STAR = hex('#ffd23f');
const KITES = [['#e63946', '#f1c453'], ['#2a9d8f', '#e9c46a'], ['#6a4c93', '#ffffff'], ['#1d6fd8', '#ffd23f']].map((p) => p.map(hex));

const nightness = (env) => smoothstep(0.55, 0.15, env.light);

/** A string of blinking bulbs along a house's roof edges (Christmas, dusk and night). */
export function drawRoofLights(ctx, x, y, s, env, id) {
  const night = nightness(env);
  if (night < 0.1) return;
  const h = s * 0.6;
  const eaves = [[x - s * 0.6, y - h], [x, y - h - s * 0.45], [x + s * 0.6, y - h]];
  const n = 9;
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const [a, b] = t < 0.5 ? [eaves[0], eaves[1]] : [eaves[1], eaves[2]];
    const p = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    const bx = a[0] + (b[0] - a[0]) * p;
    const by = a[1] + (b[1] - a[1]) * p;
    const on = Math.sin((env.time ?? 0) * 3 + k * 1.7 + id) > -0.3;
    ctx.fillStyle = rgba(BULBS[(k + id) % BULBS.length], night * (on ? 0.95 : 0.25));
    const r = Math.max(1.6, s * 0.05);
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
    if (on) {
      ctx.fillStyle = rgba(BULBS[(k + id) % BULBS.length], night * 0.25);
      ctx.beginPath();
      ctx.arc(bx, by, r * 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** A decorated Christmas tree on the platform (station geometry `g`). */
export function drawStationTree(ctx, g, x, time) {
  const { win, platformTop } = g;
  const h = win.h * 0.32;
  const base = platformTop + win.h * 0.05;
  ctx.fillStyle = g.c(TRUNK);
  ctx.fillRect(x - h * 0.04, base - h * 0.1, h * 0.08, h * 0.1);
  ctx.fillStyle = g.c(PINE);
  [0, 1, 2].forEach((k) => {
    const top = base - h * (0.45 + k * 0.25);
    const w = h * (0.34 - k * 0.08);
    ctx.beginPath();
    ctx.moveTo(x, top - h * 0.18);
    ctx.lineTo(x + w, top + h * 0.22);
    ctx.lineTo(x - w, top + h * 0.22);
    ctx.fill();
  });
  for (let k = 0; k < 14; k++) {
    const row = hash(k, 7101);
    const y = base - h * (0.12 + row * 0.75);
    const half = h * 0.3 * (1 - row * 0.8);
    const bx = x + (hash(k, 7102) * 2 - 1) * half;
    const on = Math.sin(time * 2.5 + k * 2.1) > -0.4;
    ctx.fillStyle = rgba(BULBS[k % BULBS.length], on ? 0.95 : 0.35);
    ctx.beginPath();
    ctx.arc(bx, y, Math.max(1.5, h * 0.02), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = rgba(STAR);
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const r = (k % 2 ? 0.035 : 0.08) * h;
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    ctx.lineTo(x + Math.cos(a) * r, base - h * 1.15 + Math.sin(a) * r);
  }
  ctx.fill();
}

/** Carnival on the platform: streamers hanging from the canopy and confetti drifting down. */
export function drawCarnival(ctx, g, time) {
  const { win } = g;
  const top = g.canopyBottom;
  const floor = g.platformTop + win.h * 0.12;
  ctx.lineWidth = Math.max(1, g.u * 0.25);
  for (let k = 0; k < 14; k++) {
    const x = win.x + hash(k, 7201) * win.w;
    const len = win.h * (0.08 + hash(k, 7202) * 0.12);
    ctx.strokeStyle = rgba(CONFETTI[k % CONFETTI.length], 0.9);
    ctx.beginPath();
    ctx.moveTo(x, top);
    for (let j = 1; j <= 8; j++) ctx.lineTo(x + Math.sin(j * 1.3 + time * 2 + k) * g.u * 0.8, top + (len * j) / 8);
    ctx.stroke();
  }
  for (let k = 0; k < 60; k++) {
    const fall = (time * (0.08 + hash(k, 7203) * 0.08) + hash(k, 7204)) % 1;
    const x = win.x + hash(k, 7205) * win.w + Math.sin(time * 2 + k) * g.u;
    const y = top + fall * (floor - top);
    ctx.fillStyle = rgba(CONFETTI[k % CONFETTI.length], 0.9);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(time * 3 + k);
    ctx.fillRect(-g.u * 0.3, -g.u * 0.15, g.u * 0.6, g.u * 0.3);
    ctx.restore();
  }
}

/** Kites over the open fields on Children's Day: diamond kites with ribbon tails, swaying on their lines. */
export function drawKites(ctx, layout, state, env) {
  if (env.light < 0.35 || env.rain > 0.4) return;
  if (num(biomeAt(state.distance), 'city') > 0.5) return;
  const { win, horizon, u } = layout;
  [0, 1, 2].forEach((k) => {
    const across = mod(0.25 + k * 0.47 - state.time * 0.012, 1.4) - 0.2; // they slide slowly past the window
    const x = win.x + across * win.w + Math.sin(state.time * 0.8 + k) * u * 1.5;
    const y = win.y + (horizon - win.y) * (0.25 + hash(k, 7302) * 0.25) + Math.sin(state.time * 1.3 + k * 2) * u;
    const s = u * (2.4 + hash(k, 7303) * 1.2);
    const [a, b] = KITES[k % KITES.length].map((c) => rgba(shade(c, env, 0.1)));
    ctx.strokeStyle = rgba(shade(hex('#f4efe6'), env, 0.3), 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + s);
    ctx.quadraticCurveTo(x - u * 6, horizon, x - u * 14, horizon + win.h * 0.2);
    ctx.stroke();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(state.time * 1.1 + k) * 0.2);
    ctx.fillStyle = a;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.7, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.7, 0);
    ctx.fill();
    ctx.fillStyle = b;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.7, 0);
    ctx.lineTo(0, 0);
    ctx.moveTo(0, s);
    ctx.lineTo(-s * 0.7, 0);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.strokeStyle = b;
    ctx.lineWidth = Math.max(1, u * 0.2);
    ctx.beginPath();
    ctx.moveTo(0, s);
    for (let j = 1; j <= 6; j++) ctx.lineTo(Math.sin(state.time * 4 + j + k) * u * 0.8, s + j * u * 0.9);
    ctx.stroke();
    ctx.restore();
  });
  ctx.lineWidth = 1;
}
