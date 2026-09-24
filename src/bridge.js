import { biomeAt } from './biomes.js';
import { trackX } from './frame.js';
import { ABUTMENT, riversBetween } from './rivers.js';
import { shade } from './sky.js';
import { hash, hex, mix, mod, rgba, scale } from './utils.js';

const WATER = hex('#2f6f98');
const BANK = hex('#6e6446');
const STONE = hex('#8d877c');
const WHITE = hex('#ffffff');
const STEEL = ['#7a3326', '#3f4a45', '#4a5a6e'].map(hex);
const PANEL = 8; // meters between truss verticals

function waterFill(ctx, env, haze, top, bottom) {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, rgba(shade(mix(WATER, env.bottom, 0.45), env, haze)));
  g.addColorStop(1, rgba(shade(scale(WATER, 0.7), env, haze)));
  return g;
}

/**
 * Cuts a river into a terrain layer: a flat water surface just below the lowest
 * ground point of the span, framed by muddy banks.
 */
export function drawRiverBand(ctx, layout, state, lf, heightAt, env, haze) {
  const { win } = layout;
  const m1 = state.distance + win.w / lf.px;
  const bottom = win.y + win.h + 40;
  riversBetween(state.distance - 200, m1 + 200).forEach((r) => {
    const x0 = win.x + r.start * lf.px - lf.offset;
    const x1 = win.x + r.end * lf.px - lf.offset;
    if (x1 < win.x - 50 || x0 > win.x + win.w + 50) return;
    const samples = Array.from({ length: 9 }, (_, i) => {
      const m = r.start + ((r.end - r.start) * i) / 8;
      return heightAt(m * lf.px, biomeAt(m));
    });
    const bank = Math.max(2, (x1 - x0) * 0.08);
    const surface = Math.max(...samples) + bank * 0.2;
    const spread = win.h * 0.1; // the river narrows as it recedes into the distance
    ctx.fillStyle = rgba(shade(BANK, env, haze));
    traceRiver(ctx, x0 - bank, x1 + bank, surface - bank * 0.3, spread, bottom);
    ctx.fill();
    ctx.fillStyle = waterFill(ctx, env, haze, surface, bottom);
    traceRiver(ctx, x0, x1, surface, spread, bottom);
    ctx.fill();
    ctx.fillStyle = rgba(WHITE, 0.25 * env.light + 0.05);
    const inset = (x1 - x0) * 0.28;
    ctx.fillRect(x0 + inset, surface, x1 - x0 - inset * 2, 1);
  });
}

function traceRiver(ctx, x0, x1, top, spread, bottom) {
  const inset = (x1 - x0) * 0.28;
  ctx.beginPath();
  ctx.moveTo(x0 + inset, top);
  ctx.lineTo(x1 - inset, top);
  ctx.lineTo(x1, top + spread);
  ctx.lineTo(x1, bottom);
  ctx.lineTo(x0, bottom);
  ctx.lineTo(x0, top + spread);
  ctx.closePath();
}

function drawTruss(ctx, layout, r, toX, chordY, deckY) {
  const { u } = layout;
  const panels = Math.max(2, Math.round((r.end - r.start + 10) / PANEL));
  const m0 = r.start - 5;
  const step = (r.end + 5 - m0) / panels;
  ctx.lineWidth = u * 0.55;
  ctx.beginPath();
  ctx.moveTo(toX(m0), deckY);
  ctx.lineTo(toX(m0 + step), chordY);
  ctx.lineTo(toX(m0 + step * (panels - 1)), chordY);
  ctx.lineTo(toX(m0 + step * panels), deckY);
  for (let k = 1; k < panels; k++) {
    const x = toX(m0 + step * k);
    ctx.moveTo(x, chordY);
    ctx.lineTo(x, deckY);
    const toward = k < panels / 2 ? -1 : 1; // Pratt pattern: diagonals lean toward the center
    ctx.moveTo(x, chordY);
    ctx.lineTo(toX(m0 + step * (k - toward)), deckY);
  }
  ctx.stroke();
}

function drawBridge(ctx, layout, state, env, r) {
  const { win, u } = layout;
  const toX = trackX(layout, state);
  const deckY = win.y + win.h * 0.9;
  const chordY = win.y + win.h * 0.66;
  const waterTop = win.y + win.h * 0.82;
  const bottom = win.y + win.h + 40;
  const x0 = toX(r.start);
  const x1 = toX(r.end);

  ctx.fillStyle = waterFill(ctx, env, 0, waterTop, bottom);
  ctx.fillRect(x0, waterTop, x1 - x0, bottom - waterTop);
  ctx.fillStyle = rgba(WHITE, 0.3 * env.light + 0.05);
  for (let k = 0; k < 24; k++) {
    const gx = x0 + mod(hash(r.id * 29 + k, 721) * (x1 - x0) + state.time * u * 2, Math.max(1, x1 - x0));
    const gy = waterTop + u + hash(r.id * 29 + k, 722) * (deckY - waterTop);
    ctx.fillRect(gx, gy, u * (1 + hash(k, 723) * 2), Math.max(1, u * 0.15));
  }

  ctx.fillStyle = rgba(shade(STONE, env));
  ctx.fillRect(toX(r.start - ABUTMENT), deckY - u, x0 - toX(r.start - ABUTMENT), bottom - deckY);
  ctx.fillRect(x1, deckY - u, toX(r.end + ABUTMENT) - x1, bottom - deckY);

  const steel = rgba(shade(STEEL[Math.floor(hash(r.id, 724) * STEEL.length)], env));
  ctx.fillStyle = steel;
  ctx.fillRect(x0 - u, deckY - u * 0.4, x1 - x0 + u * 2, u * 2.4);
  ctx.strokeStyle = steel;
  drawTruss(ctx, layout, r, toX, chordY, deckY);
}

/** Trackside view while crossing: water under the track and a steel truss rushing past. */
export function drawBridges(ctx, layout, state, env) {
  const { win, px } = layout;
  riversBetween(state.distance - 60, state.distance + win.w / px + 60)
    .forEach((r) => drawBridge(ctx, layout, state, env, r));
}
