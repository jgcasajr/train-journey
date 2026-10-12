import { moonFullness } from './moon.js';
import { celestialPos } from './sky.js';
import { circle, clamp, hash, hex, mix, rgba, scale, smoothstep } from './utils.js';

// Wonders of the sky, rarer than the rest: a comet that hangs over the night for a whole day,
// a total solar eclipse in the morning, and the pale arc of a moonbow after rain under a full moon.
// `state.wonder` (from ?ceu=cometa|eclipse|arcolunar) forces one, to see or share it.

export const WONDERS = ['cometa', 'eclipse', 'arcolunar'];
const ECLIPSE_FROM = 0.32; // mid-morning, while the sun is still inside the window (~7:40 to 10:05)
const ECLIPSE_TO = 0.42;
const CORONA = hex('#f4f0ff');
const COMET_DUST = hex('#fff1c8');
const COMET_ION = hex('#9fd4ff');

const forced = (state, name) => state.wonder === name;
const night = (env) => smoothstep(-0.05, -0.25, env.sunElev);

/** A comet visits on about one in nine days (clear nights only). */
export function cometNight(state) {
  return forced(state, 'cometa') || hash(state.dayCount ?? 0, 7401) < 0.11;
}

export const cometVisible = (state, env) => cometNight(state) && night(env) * (1 - env.rain) > 0.3;

/**
 * The eclipse now: `cover` 0..1 of the sun hidden by the moon, `offset` -1..1 of the moon's pass.
 * Happens on about one in twenty days, in the middle of the morning. Null when there is none.
 */
export function eclipseAt(state) {
  if (!forced(state, 'eclipse') && hash(state.dayCount ?? 0, 7402) > 0.05) return null;
  const t = state.dayTime % 1;
  if (t < ECLIPSE_FROM || t > ECLIPSE_TO) return null;
  const offset = ((t - ECLIPSE_FROM) / (ECLIPSE_TO - ECLIPSE_FROM)) * 2 - 1;
  return { offset, cover: clamp(1 - Math.abs(offset) * 1.15) };
}

/** Darkens the day during the eclipse (light, sky colors), so the stars come out at totality. */
export function withEclipse(env, state) {
  const e = eclipseAt(state);
  if (!e || e.cover < 0.3) return env;
  const dark = smoothstep(0.3, 1, e.cover) * 0.85;
  const dusk = hex('#1a2238');
  return {
    ...env,
    light: env.light * (1 - dark),
    top: mix(env.top, scale(dusk, 0.6), dark),
    bottom: mix(env.bottom, dusk, dark * 0.8),
    eclipse: e.cover,
  };
}

/** Moonbow: a full moon low in the sky, light rain or wet air, and dark night. 0..1. */
export function moonbowStrength(state, env) {
  const moonElev = -env.sunElev;
  const wet = forced(state, 'arcolunar') ? 1 : clamp((env.rain - 0.04) / 0.2) * clamp((0.45 - env.rain) / 0.15);
  const full = forced(state, 'arcolunar') ? 1 : smoothstep(0.82, 0.95, moonFullness(env.moonPhase ?? 0.5));
  return wet * full * night(env) * smoothstep(0.05, 0.2, moonElev) * smoothstep(0.75, 0.45, moonElev);
}

function drawComet(ctx, layout, state, env) {
  const a = night(env) * (1 - env.rain);
  if (!cometNight(state) || a < 0.05) return;
  const { win, horizon, u } = layout;
  const hx = win.x + win.w * (0.3 + hash(state.dayCount ?? 0, 7403) * 0.4) + (state.dayTime % 1) * u * 6; // drifts a little over the night
  const hy = win.y + (horizon - win.y) * 0.3;
  const dir = hash(state.dayCount ?? 0, 7404) > 0.5 ? 1 : -1;
  [[COMET_DUST, 34, 0.28, 0.5], [COMET_ION, 44, 0.18, 0.1]].forEach(([color, len, alpha, bend]) => {
    const tx = hx + dir * u * len;
    const ty = hy - u * len * 0.35;
    const g = ctx.createLinearGradient(hx, hy, tx, ty);
    g.addColorStop(0, rgba(color, alpha * a));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(hx, hy - u * 0.6);
    ctx.quadraticCurveTo(hx + dir * u * len * 0.5, hy - u * len * (0.12 + bend * 0.2), tx, ty - u * 3.5);
    ctx.lineTo(tx, ty + u * 3.5);
    ctx.quadraticCurveTo(hx + dir * u * len * 0.5, hy - u * len * 0.1 + u * 2, hx, hy + u * 0.6);
    ctx.fill();
  });
  const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, u * 2.5);
  glow.addColorStop(0, rgba(hex('#ffffff'), 0.95 * a));
  glow.addColorStop(1, rgba(COMET_DUST, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  circle(ctx, hx, hy, u * 2.5);
  ctx.fill();
}

function drawEclipse(ctx, layout, state, env) {
  const e = eclipseAt(state);
  if (!e || env.rain > 0.6) return;
  const { u } = layout;
  const sun = celestialPos(layout, env.dayTime, -Math.cos(env.dayTime * Math.PI * 2));
  const r = u * 2.6;
  const total = smoothstep(0.92, 1, e.cover);
  if (total > 0) {
    const corona = ctx.createRadialGradient(sun.x, sun.y, r, sun.x, sun.y, r * 4);
    corona.addColorStop(0, rgba(CORONA, 0.8 * total));
    corona.addColorStop(1, rgba(CORONA, 0));
    ctx.fillStyle = corona;
    ctx.beginPath();
    circle(ctx, sun.x, sun.y, r * 4);
    ctx.fill();
  }
  ctx.fillStyle = rgba(hex('#0d1020'));
  ctx.beginPath();
  circle(ctx, sun.x + e.offset * r * 2.2, sun.y - e.offset * r * 0.3, r * 1.03);
  ctx.fill();
}

function drawMoonbow(ctx, layout, state, env) {
  const s = moonbowStrength(state, env);
  if (s < 0.03) return;
  const { win, horizon, u } = layout;
  const moon = celestialPos(layout, ((state.dayTime % 1) + 0.5) % 1, -env.sunElev);
  const cx = win.x + win.w - (moon.x - win.x); // opposite the moon
  const cy = horizon + win.h * 0.15;
  ctx.lineWidth = u * 2.2;
  ctx.strokeStyle = rgba(hex('#eef2ff'), 0.16 * s);
  ctx.beginPath();
  ctx.arc(cx, cy, win.h * 0.55, Math.PI, 0);
  ctx.stroke();
  ctx.lineWidth = u * 0.6;
  ctx.strokeStyle = rgba(hex('#dfe8ff'), 0.12 * s);
  ctx.beginPath();
  ctx.arc(cx, cy, win.h * 0.55 + u * 1.4, Math.PI, 0);
  ctx.stroke();
  ctx.lineWidth = 1;
}

/** Drawn right after the sky (sun, moon, clouds), before the landscape. */
export function drawSkyWonders(ctx, layout, state, env) {
  drawComet(ctx, layout, state, env);
  drawEclipse(ctx, layout, state, env);
  drawMoonbow(ctx, layout, state, env);
}
