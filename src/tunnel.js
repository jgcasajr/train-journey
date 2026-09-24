import { trackX } from './frame.js';
import { shade } from './sky.js';
import { stationsBetween } from './stations.js';
import { clamp, hash, hex, rgba } from './utils.js';

const CELL = 2600;
const LENGTH = 320;
const LAMP_GAP = 30;
const ROCK = hex('#5a5550');
const LAMP = hex('#ffc070');

function tunnelIn(k) {
  if (k < 1 || hash(k, 91) > 0.5) return null;
  const start = k * CELL + hash(k, 92) * (CELL - LENGTH - 200);
  const nearStation = stationsBetween(start - 150, start + LENGTH + 150).length > 0;
  return nearStation ? null : { start, end: start + LENGTH };
}

export function tunnelsBetween(m0, m1) {
  const first = Math.floor(m0 / CELL);
  const count = Math.floor(m1 / CELL) - first + 1;
  return Array.from({ length: count }, (_, i) => tunnelIn(first + i))
    .filter((t) => t && t.end > m0 && t.start < m1);
}

/** Fraction of the window currently covered by tunnel walls (0..1). */
export function tunnelCoverage(layout, state) {
  const m0 = state.distance;
  const m1 = m0 + layout.win.w / layout.px;
  const covered = tunnelsBetween(m0, m1)
    .reduce((sum, t) => sum + Math.min(t.end, m1) - Math.max(t.start, m0), 0);
  return clamp(covered / (m1 - m0));
}

function drawLamps(ctx, layout, state, tunnel, toX) {
  const { win, u } = layout;
  const stretch = 1 + Math.min(6, state.speed / 12);
  const y = win.y + win.h * 0.22;
  const first = Math.ceil(tunnel.start / LAMP_GAP);
  const last = Math.floor(tunnel.end / LAMP_GAP);
  for (let k = first; k <= last; k++) {
    const x = toX(k * LAMP_GAP);
    if (x < win.x - u * 20 || x > win.x + win.w + u * 20) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(stretch, 1);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, u * 3);
    g.addColorStop(0, rgba(LAMP, 0.95));
    g.addColorStop(1, rgba(LAMP, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-u * 3, -u * 3, u * 6, u * 6);
    ctx.restore();
  }
}

export function drawTunnels(ctx, layout, state, env) {
  const { win, u, px } = layout;
  const edge = u * 5;
  const toX = trackX(layout, state);
  const m0 = state.distance - (edge + u * 12) / px;
  const m1 = state.distance + (win.w + edge + u * 12) / px;
  const rock = rgba(shade(ROCK, env));
  const top = win.y - 40;
  const height = win.h + 80;
  tunnelsBetween(m0, m1).forEach((t) => {
    const x0 = toX(t.start);
    const x1 = toX(t.end);
    ctx.fillStyle = '#07080a';
    ctx.fillRect(x0, top, x1 - x0, height);
    ctx.fillStyle = rock;
    ctx.fillRect(x0 - edge, top, edge, height);
    ctx.fillRect(x1, top, edge, height);
    drawLamps(ctx, layout, state, t, toX);
  });
}
