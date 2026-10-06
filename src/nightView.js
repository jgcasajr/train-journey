import { biomeAt, num } from './biomes.js';
import { forEachSlot, layerFrame } from './layers.js';
import { clamp, hash, hex, rgba, smoothstep } from './utils.js';

const GREEN = hex('#5dffb0');
const VIOLET = hex('#b48cff');
const WINDOW_LIGHT = hex('#ffd28c');
const LIGHTS_DEPTH = 0.04; // between the far and the mid mountains

const darkness = (env) => smoothstep(-0.1, -0.25, env.sunElev);

/** Some nights bring an aurora anywhere; over the snowy mountains it shows on every clear night. */
export const auroraNight = (dayCount) => hash(dayCount, 2901) < 0.25;

/** How strong the aurora is now (0..1). */
export function auroraStrength(state, env) {
  const bm = biomeAt(state.distance);
  const chance = Math.max(num(bm, 'snow'), auroraNight(state.dayCount ?? 0) ? 0.7 : 0);
  const cityLights = 1 - num(bm, 'city') * 0.9; // light pollution washes it out over towns
  return clamp(darkness(env) * (1 - env.rain * 3) * chance * cityLights);
}

/** Green curtains with violet hems, rippling slowly across the sky (drawn right after the sky). */
export function drawAurora(ctx, layout, state, env) {
  const strength = auroraStrength(state, env);
  if (strength < 0.02) return;
  const { win, horizon, u } = layout;
  const skyH = horizon - win.y;
  const step = Math.max(2, u * 0.6);
  [0, 1, 2].forEach((band) => {
    const top = win.y + skyH * (0.06 + band * 0.1);
    const len = skyH * (0.32 - band * 0.06);
    const g = ctx.createLinearGradient(0, top, 0, top + len);
    g.addColorStop(0, rgba(VIOLET, 0));
    g.addColorStop(0.25, rgba(GREEN, 0.5));
    g.addColorStop(1, rgba(GREEN, 0));
    ctx.fillStyle = g;
    for (let x = win.x - u * 14; x < win.x + win.w + u * 14; x += step) {
      const k = x / (u * 40);
      const ray = 0.5 + 0.5 * Math.sin(k * 5 + state.time * 0.7 + band * 2) * Math.sin(k * 1.7 - state.time * 0.23 + band);
      const wave = Math.sin(k * 2.1 + state.time * 0.35 + band) * skyH * 0.05;
      ctx.globalAlpha = strength * ray * (0.8 - band * 0.18);
      ctx.fillRect(x, top + wave, step + 0.5, len);
    }
  });
  ctx.globalAlpha = 1;
}

/** Faraway towns at night: little clusters of warm lights at the foot of the far hills. */
export function drawDistantLights(ctx, layout, state, env) {
  const night = darkness(env);
  if (night < 0.05) return;
  const { win, horizon, u } = layout;
  const lf = layerFrame(layout, state, LIGHTS_DEPTH);
  const base = horizon + win.h * 0.015;
  forEachSlot(win, lf, u * 14, u * 4, 2911, (i, x, wx, bm) => {
    if (hash(i, 2912) > 0.35 || num(bm, 'water') > 0.5) return;
    const count = 3 + Math.floor(hash(i, 2913) * 7);
    for (let k = 0; k < count; k++) {
      const twinkle = 0.65 + 0.35 * Math.sin(state.time * (1 + hash(k, i)) + k * 3);
      ctx.fillStyle = rgba(WINDOW_LIGHT, night * twinkle * 0.9);
      const lx = x + (hash(i * 7 + k, 2914) - 0.5) * u * 7;
      const ly = base - hash(i * 7 + k, 2915) * u * 1.4;
      ctx.fillRect(lx, ly, Math.max(1.2, u * 0.25), Math.max(1.2, u * 0.25));
    }
  });
}
