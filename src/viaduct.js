import { SEGMENT, biomeAt, color, segmentBiome } from './biomes.js';
import { trackX } from './frame.js';
import { shade } from './sky.js';
import { hex, mix, rgba } from './utils.js';

const START = 0.68; // fraction into a vineyard segment (well after its station, before the blend)
const LENGTH = 320; // meters
const STONE = hex('#b5a58c');
const STONE_DARK = hex('#8a7a62');
const RIVER = hex('#6aa0c0');

function viaductIn(k) {
  if (segmentBiome(k).name !== 'Vinhedos') return null;
  const start = k * SEGMENT + SEGMENT * START;
  return { start, end: start + LENGTH };
}

/** The stone viaduct over the valley, if the train is on (or at the edge of) one around `meters`. */
export function viaductsBetween(m0, m1) {
  const first = Math.floor(m0 / SEGMENT);
  const count = Math.floor(m1 / SEGMENT) - first + 1;
  return Array.from({ length: count }, (_, i) => viaductIn(first + i)).filter((v) => v && v.end > m0 && v.start < m1);
}

export const onViaduct = (meters) => viaductsBetween(meters, meters).length > 0;

/** The valley far below, between the viaduct's ends: hazy fields, a winding river and air. */
function drawValley(ctx, layout, env, x0, x1, bm) {
  const { win, horizon } = layout;
  const top = horizon + win.h * 0.06;
  const bottom = win.y + win.h;
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, rgba(shade(color(bm, 'hills'), env, 0.45)));
  g.addColorStop(0.5, rgba(shade(color(bm, 'field'), env, 0.35)));
  g.addColorStop(1, rgba(shade(mix(color(bm, 'field'), env.bottom, 0.3), env, 0.25)));
  ctx.fillStyle = g;
  ctx.fillRect(x0, top, x1 - x0, bottom - top);
  ctx.strokeStyle = rgba(shade(RIVER, env, 0.3));
  ctx.lineWidth = Math.max(2, win.h * 0.012);
  ctx.beginPath();
  ctx.moveTo(x0, top + win.h * 0.12);
  ctx.bezierCurveTo(x0 + (x1 - x0) * 0.3, top + win.h * 0.25, x0 + (x1 - x0) * 0.6, top + win.h * 0.05, x1, top + win.h * 0.2);
  ctx.stroke();
}

/** The parapet along the viaduct edge, right outside the window, with its stone copings. */
function drawParapet(ctx, layout, env, x0, x1) {
  const { win, u } = layout;
  const top = win.y + win.h - u * 5;
  ctx.fillStyle = rgba(shade(STONE, env));
  ctx.fillRect(x0, top, x1 - x0, win.y + win.h - top + u * 4);
  ctx.fillStyle = rgba(shade(STONE_DARK, env));
  ctx.fillRect(x0, top, x1 - x0, u * 0.8);
  for (let x = x0; x < x1; x += u * 9) ctx.fillRect(x, top, u * 0.4, u * 5);
}

/**
 * Crossing the viaduct: the near ground falls away into a deep valley, so between its ends
 * we see the valley floor far below and the parapet right beside the train.
 */
export function drawViaduct(ctx, layout, state, env) {
  const { win } = layout;
  const toX = trackX(layout, state);
  viaductsBetween(state.distance - 200, state.distance + win.w / layout.px + 200).forEach((v) => {
    const x0 = Math.max(win.x - 20, toX(v.start));
    const x1 = Math.min(win.x + win.w + 20, toX(v.end));
    if (x1 <= x0) return;
    const bm = biomeAt((v.start + v.end) / 2);
    drawValley(ctx, layout, env, x0, x1, bm);
    drawParapet(ctx, layout, env, x0, x1);
  });
}
