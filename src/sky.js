import { circle, clamp, hash, hex, mix, radialGlow, rgba, scale, smoothstep } from './utils.js';

const SKY = {
  night: { top: hex('#060a1c'), bottom: hex('#1a2247') },
  twilight: { top: hex('#2b3668'), bottom: hex('#f3915d') },
  day: { top: hex('#2c6cc7'), bottom: hex('#b6ddf7') },
  overcast: { top: hex('#58616e'), bottom: hex('#9ea5ad') },
};
const NIGHT_TINT = hex('#0c1230');
const WARM = hex('#ff9a5c');
const WHITE = hex('#ffffff');

function skyColor(key, sunElev) {
  if (sunElev < 0) return mix(SKY.night[key], SKY.twilight[key], smoothstep(-0.35, 0, sunElev));
  return mix(SKY.twilight[key], SKY.day[key], smoothstep(0, 0.35, sunElev));
}

/** dayTime: 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset. */
export function environment(dayTime, rain) {
  const sunElev = -Math.cos(dayTime * Math.PI * 2);
  const clear = smoothstep(-0.25, 0.3, sunElev);
  const gloom = rain * 0.75;
  const overcast = (key) => scale(SKY.overcast[key], 0.12 + 0.88 * clear);
  return {
    dayTime,
    sunElev,
    rain,
    top: mix(skyColor('top', sunElev), overcast('top'), gloom),
    bottom: mix(skyColor('bottom', sunElev), overcast('bottom'), gloom),
    light: clear * (1 - rain * 0.35),
    warm: clamp(1 - Math.abs(sunElev) / 0.35) * (1 - rain * 0.7),
  };
}

/** Applies time-of-day light, sunset warmth and atmospheric haze to a scenery color. */
export function shade(color, env, haze = 0) {
  const lit = mix(NIGHT_TINT, color, 0.12 + 0.88 * env.light);
  const warmed = mix(lit, WARM, env.warm * 0.18);
  return mix(warmed, env.bottom, clamp(haze * (1 + env.rain)));
}

function celestialPos(layout, phase, elev) {
  const { win, horizon } = layout;
  return {
    x: win.x + win.w * (0.1 + 0.8 * clamp((phase - 0.2) / 0.6)),
    y: horizon - elev * win.h * 0.6,
  };
}

function drawSun(ctx, layout, env) {
  if (env.sunElev < -0.12) return;
  const { x, y } = celestialPos(layout, env.dayTime, env.sunElev);
  const r = layout.u * 2.6;
  const vis = (1 - env.rain * 0.85) * smoothstep(-0.12, 0.02, env.sunElev);
  const core = mix(hex('#fff6d8'), hex('#ffb070'), env.warm);
  radialGlow(ctx, x, y, r * 9, core, 0.45 * vis);
  ctx.fillStyle = rgba(core, vis);
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fill();
}

function drawMoon(ctx, layout, env) {
  const elev = -env.sunElev;
  if (elev < -0.12) return;
  const { x, y } = celestialPos(layout, (env.dayTime + 0.5) % 1, elev);
  const r = layout.u * 1.8;
  const vis = (1 - env.rain * 0.9) * smoothstep(-0.12, 0.05, elev) * (1 - env.light * 0.6);
  const pale = hex('#eef0ff');
  radialGlow(ctx, x, y, r * 6, pale, 0.18 * vis);
  ctx.fillStyle = rgba(pale, vis);
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.fillStyle = rgba(hex('#9aa0c0'), 0.35 * vis);
  ctx.beginPath();
  circle(ctx, x - r * 0.3, y - r * 0.2, r * 0.25);
  circle(ctx, x + r * 0.35, y + r * 0.3, r * 0.18);
  ctx.fill();
}

function drawStars(ctx, layout, env, time) {
  const alpha = (1 - smoothstep(-0.3, 0.02, env.sunElev)) * (1 - env.rain);
  if (alpha <= 0.01) return;
  const { win, horizon } = layout;
  for (let i = 0; i < 160; i++) {
    const x = win.x + hash(i, 3) * win.w;
    const y = win.y + hash(i, 4) ** 1.4 * (horizon - win.y);
    const twinkle = 0.55 + 0.45 * Math.sin(time * (1 + hash(i, 5) * 3) + i);
    const size = 0.6 + hash(i, 6) * 1.2;
    ctx.fillStyle = `rgba(255,250,235,${alpha * twinkle})`;
    ctx.fillRect(x, y, size, size);
  }
}

function drawCloud(ctx, x, y, size, id) {
  ctx.beginPath();
  for (let k = 0; k < 5; k++) {
    const r = size * (0.45 + hash(id * 5 + k, 12) * 0.35);
    circle(ctx, x + (k - 2) * size * 0.55, y - r * 0.4, r);
  }
  ctx.fill();
}

function drawClouds(ctx, layout, state, env) {
  const { win, horizon, px, u } = layout;
  const offset = state.distance * px * 0.01 + state.time * u * 0.6;
  const spacing = u * 34;
  const coverage = 0.45 + env.rain * 0.45;
  const lit = mix(scale(env.bottom, 0.55), WHITE, env.light * 0.85);
  const tone = mix(mix(lit, hex('#ffb38a'), env.warm * 0.35), hex('#6b717a'), env.rain * 0.5);
  ctx.fillStyle = rgba(tone, 0.55 + 0.3 * env.light);
  const first = Math.floor(offset / spacing) - 2;
  const last = Math.floor((offset + win.w) / spacing) + 2;
  for (let i = first; i <= last; i++) {
    if (hash(i, 7) > coverage) continue;
    const x = win.x + (i + hash(i, 8)) * spacing - offset;
    const y = win.y + (0.08 + hash(i, 9) * 0.35) * (horizon - win.y);
    drawCloud(ctx, x, y, u * (5 + hash(i, 10) * 9), i);
  }
}

export function drawSky(ctx, layout, state, env) {
  const { win, horizon } = layout;
  const g = ctx.createLinearGradient(0, win.y, 0, horizon);
  g.addColorStop(0, rgba(env.top));
  g.addColorStop(1, rgba(env.bottom));
  ctx.fillStyle = g;
  const margin = layout.u * 14;
  ctx.fillRect(win.x - margin, win.y - margin, win.w + margin * 2, win.h + margin * 2);
  drawStars(ctx, layout, env, state.time);
  drawSun(ctx, layout, env);
  drawMoon(ctx, layout, env);
  drawClouds(ctx, layout, state, env);
}
