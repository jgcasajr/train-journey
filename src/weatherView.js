import { shade } from './sky.js';
import { clamp, hash, hex, mix, mod, rgba, smoothstep } from './utils.js';

const RAINBOW = ['#ff4b4b', '#ff9f40', '#ffe066', '#6bd66b', '#4da3ff', '#5b5bd6', '#a05bd6'].map(hex);
const BOLT = hex('#f4f0ff');
const MIST = hex('#e8ecef');
const LEAVES = ['#c8642d', '#e0a030', '#a8401f', '#d98a2b'].map(hex);

/** Rainbow opposite the sun once the rain stops while the ground is still wet. */
export const rainbowStrength = (env) => env.wetness * (1 - smoothstep(0.1, 0.5, env.rain))
  * smoothstep(0.02, 0.2, env.sunElev) * (1 - env.storm);

/** Some rainbow days show a second, fainter bow with the colors reversed. */
export const doubleRainbow = (state) => hash(state.dayCount ?? 0, 3701) < 0.5;

export function drawRainbow(ctx, layout, env, double = false) {
  const strength = rainbowStrength(env);
  if (strength < 0.02) return;
  const { win, horizon, u } = layout;
  const sunLeft = env.dayTime < 0.5;
  const cx = win.x + win.w * (sunLeft ? 0.68 : 0.32);
  const cy = horizon + win.h * 0.15;
  const r0 = win.h * 0.55;
  const band = u * 0.55;
  ctx.lineWidth = band + 0.5;
  RAINBOW.forEach((c, k) => {
    ctx.strokeStyle = rgba(c, 0.3 * strength);
    ctx.beginPath();
    ctx.arc(cx, cy, r0 - k * band, Math.PI, 0);
    ctx.stroke();
  });
  if (!double || strength < 0.3) return;
  const r1 = r0 + band * (RAINBOW.length + 5);
  RAINBOW.forEach((c, k) => {
    ctx.strokeStyle = rgba(c, 0.13 * strength);
    ctx.beginPath();
    ctx.arc(cx, cy, r1 + k * band, Math.PI, 0);
    ctx.stroke();
  });
}

/** Jagged lightning bolt from the clouds toward the horizon, drawn during the first instants. */
export function drawLightning(ctx, layout, lightning) {
  if (!lightning || lightning.age > 0.25) return;
  const { win, horizon, u } = layout;
  const x0 = win.x + lightning.x * win.w;
  const y0 = win.y + (horizon - win.y) * 0.15;
  const segments = 9;
  const pts = Array.from({ length: segments + 1 }, (_, k) => ({
    x: x0 + (hash(lightning.seed + k, 1501) - 0.5) * u * 6 * (k > 0 ? 1 : 0) + k * u * 0.6,
    y: y0 + ((horizon - y0) * k) / segments,
  }));
  const alpha = lightning.age < 0.08 || (lightning.age > 0.15 && lightning.age < 0.22) ? 1 : 0.4;
  [[u * 1.6, 0.25], [u * 0.35, 1]].forEach(([width, a]) => {
    ctx.strokeStyle = rgba(BOLT, a * alpha);
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    const fork = pts[4];
    ctx.moveTo(fork.x, fork.y);
    ctx.lineTo(fork.x + u * 3, fork.y + u * 4);
    ctx.lineTo(fork.x + u * 2.5, fork.y + u * 8);
    ctx.stroke();
  });
}

/** A soft band of valley mist lying at height `y`, with slowly drifting denser patches. */
export function drawMist(ctx, layout, state, env, y, thickness, seed) {
  if (env.mist < 0.02) return;
  const { win, u } = layout;
  const color = shade(mix(MIST, env.bottom, 0.3), env, 0);
  const g = ctx.createLinearGradient(0, y - thickness, 0, y + thickness);
  g.addColorStop(0, rgba(color, 0));
  g.addColorStop(0.5, rgba(color, 0.85 * env.mist));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(win.x - u * 14, y - thickness, win.w + u * 28, thickness * 2);
  ctx.fillStyle = rgba(color, 0.3 * env.mist);
  for (let k = 0; k < 6; k++) {
    const x = win.x + mod(hash(k, seed) * win.w + state.time * u * (0.5 + hash(k, seed + 1)), win.w + u * 30) - u * 15;
    ctx.beginPath();
    ctx.ellipse(x, y + (hash(k, seed + 2) - 0.5) * thickness * 0.6, u * (10 + hash(k, seed + 3) * 12), thickness * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** What falls from the sky: rain, snow (winter or mountains) or, in autumn, a few leaves. */
export function precipitationKind(env, snowyBiome) {
  if (env.rain < 0.02) return env.season.autumn > 0.5 ? 'leaves' : null;
  return env.season.winter > 0.5 || snowyBiome > 0.5 ? 'snow' : 'rain';
}

function drawRainStreaks(ctx, layout, state, amount) {
  const { win, u, px } = layout;
  const drift = state.distance * px * 0.9 + state.time * u * 3;
  const dx = -(u * 0.5 + state.speed * 0.08 * u);
  ctx.strokeStyle = `rgba(210,220,235,${0.28 * amount})`;
  ctx.lineWidth = Math.max(1, u * 0.08);
  ctx.beginPath();
  for (let i = 0; i < Math.round(amount * 90); i++) {
    const x = win.x + mod(hash(i, 1) * win.w - drift * (0.6 + hash(i, 3) * 0.4), win.w);
    const y = win.y + mod(hash(i, 2) * win.h + state.time * win.h * 1.6, win.h);
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y + u * 2.2);
  }
  ctx.stroke();
}

function drawFlakes(ctx, layout, state, count, fallSpeed, drawOne) {
  const { win, u, px } = layout;
  const drift = state.distance * px * 0.5;
  for (let i = 0; i < count; i++) {
    const depth = 0.4 + hash(i, 1511) * 0.6;
    const sway = Math.sin(state.time * (0.8 + hash(i, 1512)) + i) * u * 2;
    const x = win.x + mod(hash(i, 1513) * win.w - drift * depth + sway, win.w);
    const y = win.y + mod(hash(i, 1514) * win.h + state.time * win.h * fallSpeed * depth, win.h);
    drawOne(x, y, depth, i);
  }
}

export function drawPrecipitation(ctx, layout, state, env, kind) {
  const { u } = layout;
  if (kind === 'rain') {
    drawRainStreaks(ctx, layout, state, clamp(env.rain + env.storm * 0.4));
  } else if (kind === 'snow') {
    ctx.fillStyle = `rgba(250,252,255,${0.85 * env.rain})`;
    ctx.beginPath();
    drawFlakes(ctx, layout, state, Math.round(env.rain * 160), 0.12, (x, y, depth) => {
      ctx.moveTo(x + u * 0.35 * depth, y);
      ctx.arc(x, y, u * 0.35 * depth, 0, Math.PI * 2);
    });
    ctx.fill();
  } else if (kind === 'leaves') {
    drawFlakes(ctx, layout, state, 18, 0.08, (x, y, depth, i) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(state.time * (1 + hash(i, 1515) * 2) + i);
      ctx.fillStyle = rgba(shade(LEAVES[i % LEAVES.length], env), 0.9);
      ctx.beginPath();
      ctx.ellipse(0, 0, u * 1.1 * depth, u * 0.5 * depth, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
}
