import { num } from './biomes.js';
import { forEachSlot, layerFrame } from './layers.js';
import { shade } from './sky.js';
import { clamp, hash, hex, rgba, smoothstep } from './utils.js';

const BIRD = hex('#2a2a30');
const PLANE = hex('#d9dde3');
const BEACON_RED = hex('#ff3b30');
const ENVELOPES = [
  ['#e63946', '#f1c453'], ['#2a9d8f', '#e9c46a'], ['#6a4c93', '#f4a261'], ['#1d3557', '#f1faee'], ['#ff7f51', '#ffd166'],
].map((pair) => pair.map(hex));
const BASKET = hex('#7a5230');

/** Periodic events (flocks, planes) as a pure function of time: which one, and how far along. */
function episode(time, period, duration, seed) {
  const k = Math.floor(time / period);
  const offset = hash(k, seed) * (period - duration);
  const p = (time - k * period - offset) / duration;
  return p >= 0 && p <= 1 ? { k, p } : null;
}

function drawBird(ctx, x, y, s, flap) {
  const lift = Math.sin(flap) * s * 0.5;
  ctx.moveTo(x - s, y - lift);
  ctx.quadraticCurveTo(x - s * 0.45, y - s * 0.35, x, y);
  ctx.quadraticCurveTo(x + s * 0.45, y - s * 0.35, x + s, y - lift);
}

const SCATTER_SECONDS = 3;

/**
 * Birds of the flock currently crossing the sky (outside-view coordinates), or [] if none.
 * Right after a click (`state.scatterAt`) they burst apart in every direction, flapping hard.
 */
export function flockBirds(layout, state, env) {
  if (env.light < 0.15) return [];
  const ep = episode(state.time, 40, 22, 1201);
  if (!ep) return [];
  const { win, horizon, u } = layout;
  const dir = hash(ep.k, 1202) > 0.5 ? 1 : -1;
  const count = 5 + Math.floor(hash(ep.k, 1203) * 5);
  const span = win.w + u * 40;
  const lead = dir > 0 ? win.x - u * 20 + ep.p * span : win.x + win.w + u * 20 - ep.p * span;
  const y0 = win.y + (0.12 + hash(ep.k, 1204) * 0.3) * (horizon - win.y);
  const s = u * 0.7;
  const scatter = clamp((state.time - (state.scatterAt ?? -99)) / SCATTER_SECONDS);
  const burst = scatter < 1 ? Math.sin(scatter * Math.PI * 0.5) * u * 18 : 0;
  return Array.from({ length: count }, (_, i) => {
    const rank = Math.ceil(i / 2);
    const side = i % 2 ? -1 : 1;
    const angle = hash(ep.k * 31 + i, 1205) * Math.PI * 2;
    return {
      x: lead - dir * rank * s * 2.6 + Math.cos(angle) * burst,
      y: y0 + side * rank * s * 1.6 + Math.sin(state.time * 1.3 + i) * s * 0.3 + Math.sin(angle) * burst * 0.6,
      s,
      flap: state.time * (scatter < 1 ? 20 : 9) + i * 0.7,
    };
  });
}

/** A flock in V formation crossing the sky roughly every 40 s (daylight and dusk only). */
function drawFlock(ctx, layout, state, env) {
  const birds = flockBirds(layout, state, env);
  if (birds.length === 0) return;
  ctx.strokeStyle = rgba(shade(BIRD, env), 0.85);
  ctx.lineWidth = Math.max(1, layout.u * 0.18);
  ctx.beginPath();
  birds.forEach((b) => drawBird(ctx, b.x, b.y, b.s, b.flap));
  ctx.stroke();
}

/** A high airliner every ~75 s: contrail by day, blinking lights at night. */
function drawPlane(ctx, layout, state, env) {
  const ep = episode(state.time, 75, 40, 1211);
  if (!ep) return;
  const { win, horizon, u } = layout;
  const dir = hash(ep.k, 1212) > 0.5 ? 1 : -1;
  const x = dir > 0 ? win.x - u * 10 + ep.p * (win.w + u * 20) : win.x + win.w + u * 10 - ep.p * (win.w + u * 20);
  const y = win.y + (0.06 + hash(ep.k, 1213) * 0.14) * (horizon - win.y);
  const night = smoothstep(0.35, 0.1, env.light);
  const trail = u * 45;
  if (night < 0.8 && env.rain < 0.5) {
    const g = ctx.createLinearGradient(x, y, x - dir * trail, y);
    g.addColorStop(0, `rgba(255,255,255,${0.55 * (1 - night)})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(x, x - dir * trail), y - u * 0.12, trail, u * 0.24);
  }
  ctx.fillStyle = rgba(shade(PLANE, env));
  ctx.beginPath();
  ctx.ellipse(x, y, u * 1.1, u * 0.18, 0, 0, Math.PI * 2);
  ctx.moveTo(x - dir * u * 0.1, y);
  ctx.lineTo(x - dir * u * 0.6, y + u * 0.7);
  ctx.lineTo(x - dir * u * 0.3, y);
  ctx.fill();
  if (night > 0.2 && Math.sin(state.time * 6) > 0.6) {
    ctx.fillStyle = rgba(BEACON_RED);
    ctx.fillRect(x - u * 0.2, y - u * 0.2, u * 0.4, u * 0.4);
  }
}

export function drawSkyLife(ctx, layout, state, env) {
  drawPlane(ctx, layout, state, env);
  drawFlock(ctx, layout, state, env);
}

function drawBalloon(ctx, x, y, s, colors, env) {
  const [a, b] = colors.map((c) => rgba(shade(c, env, 0.25)));
  const stripes = 6;
  for (let k = 0; k < stripes; k++) {
    const t0 = -Math.PI / 2 + (k / stripes) * Math.PI - Math.PI / 2;
    ctx.fillStyle = k % 2 ? a : b;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.95);
    ctx.ellipse(x, y, s * 0.8, s, 0, t0, t0 + Math.PI / stripes);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = a;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.8, y);
  ctx.quadraticCurveTo(x - s * 0.6, y + s * 0.9, x - s * 0.18, y + s * 1.25);
  ctx.lineTo(x + s * 0.18, y + s * 1.25);
  ctx.quadraticCurveTo(x + s * 0.6, y + s * 0.9, x + s * 0.8, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(shade(BASKET, env, 0.25));
  ctx.fillRect(x - s * 0.16, y + s * 1.4, s * 0.32, s * 0.25);
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.18, y + s * 1.25);
  ctx.lineTo(x - s * 0.14, y + s * 1.4);
  ctx.moveTo(x + s * 0.18, y + s * 1.25);
  ctx.lineTo(x + s * 0.14, y + s * 1.4);
  ctx.stroke();
}

/** Hot-air balloons drifting over farmland on calm, bright days. */
/** Balloons currently in view (outside-view coordinates); `y` is the envelope center. */
export function balloonsInView(layout, state, env) {
  if (env.light < 0.4 || env.rain > 0.3) return [];
  const { win, horizon, u } = layout;
  const lf = layerFrame(layout, state, 0.03);
  const found = [];
  forEachSlot(win, lf, u * 30, u * 6, 1221, (i, x, wx, bm) => {
    const chance = num(bm, 'farm') * 0.35 + (1 - num(bm, 'trees')) * 0.1 - num(bm, 'city') * 0.3;
    if (hash(i, 1222) > clamp(chance)) return;
    const s = u * (1.4 + hash(i, 1223) * 1.6);
    const y = horizon - win.h * (0.2 + hash(i, 1224) * 0.25) + Math.sin(state.time * 0.25 + i) * u * 0.8;
    found.push({ i, x, y, s });
  });
  return found;
}

const WAVE_SECONDS = 2.5;

/** Passengers in the basket waving back after a click on their balloon. */
function drawWave(ctx, { x, y, s }, age, env, u) {
  const basketY = y + s * 1.4;
  const swing = Math.sin(age * 14) * s * 0.12;
  ctx.strokeStyle = rgba(shade(BASKET, env, 0.25));
  ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.beginPath();
  [-0.08, 0.1].forEach((dx) => {
    ctx.moveTo(x + dx * s, basketY);
    ctx.lineTo(x + dx * s + swing, basketY - s * 0.35);
  });
  ctx.stroke();
  ctx.fillStyle = `rgba(255,255,255,${1 - age / WAVE_SECONDS})`;
  ctx.font = `600 ${u * 1.5}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Olá!', x, y - s * 1.25 - age * u * 1.5);
}

export function drawBalloons(ctx, layout, state, env) {
  const waves = (state.effects ?? []).filter((e) => e.kind === 'wave');
  balloonsInView(layout, state, env).forEach((b) => {
    drawBalloon(ctx, b.x, b.y, b.s, ENVELOPES[Math.floor(hash(b.i, 1225) * ENVELOPES.length)], env);
    const wave = waves.find((e) => e.id === b.i && state.time - e.born < WAVE_SECONDS);
    if (wave) drawWave(ctx, b, state.time - wave.born, env, layout.u);
  });
}
