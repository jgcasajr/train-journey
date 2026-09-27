import { biomeAt, num } from './biomes.js';
import { meteorNight } from './moon.js';
import { hash, hex, rgba } from './utils.js';

const FIREWORK_COLORS = ['#ff5a5a', '#ffd166', '#6be38a', '#5ab0ff', '#d58bff', '#ffffff'].map(hex);
const STAR_PERIOD = 25;
const STAR_SECONDS = 1.2;
const SHOW_PERIOD = 70;
const SHOW_SECONDS = 20;
const BURST_GAP = 1.4;
const RISE = 0.5;
const BLOOM = 1.8;

/** A shooting star crossing a clear night sky now (normalized geometry), or null. */
export function shootingStarAt(state, env) {
  if (env.sunElev > -0.15 || env.rain > 0.2) return null;
  const k = Math.floor(state.time / STAR_PERIOD);
  if (hash(k, 2102) > 0.35) return null;
  const start = k * STAR_PERIOD + hash(k, 2103) * (STAR_PERIOD - STAR_SECONDS);
  const p = (state.time - start) / STAR_SECONDS;
  if (p < 0 || p > 1) return null;
  const dir = hash(k, 2104) > 0.5 ? 1 : -1;
  return { x: 0.15 + hash(k, 2105) * 0.7, y: 0.08 + hash(k, 2106) * 0.25, dir, p };
}

const METEOR_PERIOD = 0.7;
const METEOR_SECONDS = 0.9;

/** On a meteor-shower night, a streak every fraction of a second (clear skies only). */
export function meteorsAt(state, env) {
  if (env.sunElev > -0.15 || env.rain > 0.2 || !meteorNight(state.dayCount ?? 0)) return [];
  const k0 = Math.floor(state.time / METEOR_PERIOD);
  return [k0 - 1, k0].flatMap((k) => {
    if (hash(k, 2711) > 0.8) return [];
    const p = (state.time - k * METEOR_PERIOD - hash(k, 2712) * 0.3) / METEOR_SECONDS;
    if (p < 0 || p > 1) return [];
    return [{ x: 0.05 + hash(k, 2713) * 0.9, y: 0.03 + hash(k, 2714) * 0.3, dir: hash(k, 2715) > 0.35 ? 1 : -1, p, short: true }];
  });
}

export function drawShootingStar(ctx, layout, state, env) {
  const star = shootingStarAt(state, env);
  [...(star ? [star] : []), ...meteorsAt(state, env)].forEach((s) => drawStreak(ctx, layout, s));
}

function drawStreak(ctx, layout, star) {
  const { win, horizon, u } = layout;
  const x0 = win.x + star.x * win.w;
  const y0 = win.y + star.y * (horizon - win.y);
  const travel = u * (star.short ? 30 : 55) * star.p;
  const hx = x0 + star.dir * travel * 0.94;
  const hy = y0 + travel * 0.34;
  const tail = u * 20;
  const fade = star.p > 0.7 ? (1 - star.p) / 0.3 : 1;
  const g = ctx.createLinearGradient(hx, hy, hx - star.dir * tail * 0.94, hy - tail * 0.34);
  g.addColorStop(0, `rgba(255,255,240,${0.95 * fade})`);
  g.addColorStop(1, 'rgba(255,255,240,0)');
  ctx.strokeStyle = g;
  ctx.lineWidth = Math.max(1.5, u * 0.4);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(hx - star.dir * tail * 0.94, hy - tail * 0.34);
  ctx.stroke();
}

/** A fireworks show happens over the city at dusk or night, some of the time. */
function showAt(state, env, layout) {
  if (env.light > 0.35 || env.rain > 0.3) return null;
  const ahead = state.distance + layout.win.w / layout.px / 2;
  if (num(biomeAt(ahead), 'city') < 0.6) return null;
  const k = Math.floor(state.time / SHOW_PERIOD);
  if (hash(k, 2111) > 0.6) return null;
  const start = k * SHOW_PERIOD + hash(k, 2112) * (SHOW_PERIOD - SHOW_SECONDS);
  return state.time >= start && state.time <= start + SHOW_SECONDS ? { k, start } : null;
}

/** Bursts of the current show that are visible now, with their age in seconds. */
export function fireworkBursts(state, env, layout) {
  const show = showAt(state, env, layout);
  if (!show) return [];
  const count = Math.floor(SHOW_SECONDS / BURST_GAP);
  return Array.from({ length: count }, (_, j) => {
    const id = show.k * 97 + j;
    const born = show.start + j * BURST_GAP + hash(id, 2113) * 0.6;
    return { id, age: state.time - born };
  }).filter((b) => b.age >= 0 && b.age < RISE + BLOOM);
}

/** How many bursts exploded between two instants (for the boom sounds). */
export function burstsExploded(prev, state, env, layout) {
  return fireworkBursts(state, env, layout)
    .filter((b) => b.age >= RISE && b.age - (state.time - prev) < RISE).length;
}

export function drawFireworks(ctx, layout, state, env) {
  const bursts = fireworkBursts(state, env, layout);
  if (bursts.length === 0) return;
  const { win, horizon, u } = layout;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  bursts.forEach((b) => {
    const x = win.x + (0.15 + hash(b.id, 2114) * 0.7) * win.w;
    const top = horizon - win.h * (0.25 + hash(b.id, 2115) * 0.2);
    const color = FIREWORK_COLORS[Math.floor(hash(b.id, 2116) * FIREWORK_COLORS.length)];
    if (b.age < RISE) {
      const y = horizon + (top - horizon) * (b.age / RISE);
      ctx.fillStyle = rgba(color, 0.9);
      ctx.fillRect(x - u * 0.15, y, u * 0.3, u * 1.2);
      return;
    }
    const t = (b.age - RISE) / BLOOM;
    const radius = u * (6 + hash(b.id, 2117) * 5) * (1 - (1 - t) ** 3);
    const drop = t * t * u * 4;
    ctx.fillStyle = rgba(color, (1 - t) * 0.9);
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2 + hash(b.id, 2118);
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * radius, top + Math.sin(a) * radius + drop, Math.max(1, u * 0.28), 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.restore();
}
