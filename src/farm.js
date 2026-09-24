import { biomeAt, num } from './biomes.js';
import { STEP, forEachSegment } from './layers.js';
import { shade } from './sky.js';
import { circle, hash, hex, rgba, scale } from './utils.js';

const CROPS = ['#d8c25a', '#8fae3e', '#a9743f', '#c9d36a', '#6f8f35', '#b8a04a'].map(hex);
const BARN = hex('#a8322d');
const BARN_ROOF = hex('#4a2a25');
const TRIM = hex('#efe6d6');
const SILO = hex('#9aa4ab');
const HAY = hex('#d9b75a');
const COW = hex('#f2efe8');
const SPOT = hex('#222222');
const WOOD = hex('#7a6248');
const STEEL = hex('#5d6166');

const surfaceY = (lf, heightAt, wx) => heightAt(wx, biomeAt(wx / lf.px));

function tracePatch(ctx, win, lf, heightAt, wx0, wx1, bottom) {
  ctx.beginPath();
  ctx.moveTo(win.x + wx0 - lf.offset, bottom);
  for (let wx = wx0; wx < wx1 + STEP; wx += STEP) {
    const w = Math.min(wx, wx1);
    ctx.lineTo(win.x + w - lf.offset, surfaceY(lf, heightAt, w));
  }
  ctx.lineTo(win.x + wx1 - lf.offset, bottom);
  ctx.closePath();
}

/** Plough furrows that follow the terrain, spaced wider as they come closer (perspective). */
function drawFurrows(ctx, win, lf, heightAt, wx0, wx1, rowGap) {
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 1; k <= 7; k++) {
    const dy = rowGap * k * (1 + k * 0.35);
    ctx.moveTo(win.x + wx0 - lf.offset, surfaceY(lf, heightAt, wx0) + dy);
    for (let wx = wx0 + STEP * 2; wx <= wx1; wx += STEP * 2) {
      ctx.lineTo(win.x + wx - lf.offset, surfaceY(lf, heightAt, wx) + dy);
    }
  }
  ctx.stroke();
}

/** Patchwork of crop fields over a terrain layer; fades in with the biome's `farm` weight. */
export function drawCropPatches(ctx, win, lf, heightAt, env, { spacing, seed, haze, rowGap }) {
  const bottom = win.y + win.h + 40;
  forEachSegment(win, lf, spacing, (i, wx0, _x, bm) => {
    const farm = num(bm, 'farm');
    if (farm < 0.05 || hash(i, seed) > 0.4 + farm * 0.6) return;
    const crop = CROPS[Math.floor(hash(i, seed + 1) * CROPS.length)];
    tracePatch(ctx, win, lf, heightAt, wx0, wx0 + spacing, bottom);
    ctx.fillStyle = rgba(shade(crop, env, haze), farm * 0.8);
    ctx.fill();
    if (hash(i, seed + 2) > 0.5) return;
    ctx.strokeStyle = rgba(shade(scale(crop, 0.7), env, haze), farm * 0.5);
    drawFurrows(ctx, win, lf, heightAt, wx0 + 2, wx0 + spacing - 2, rowGap);
  });
}

function drawBarn(ctx, x, y, s, c) {
  const w = s * 1.1;
  const h = s * 0.5;
  ctx.fillStyle = c(BARN);
  ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.fillStyle = c(BARN_ROOF);
  ctx.beginPath();
  ctx.moveTo(x - w * 0.55, y - h);
  ctx.lineTo(x - w * 0.4, y - h - s * 0.22);
  ctx.lineTo(x, y - h - s * 0.34);
  ctx.lineTo(x + w * 0.4, y - h - s * 0.22);
  ctx.lineTo(x + w * 0.55, y - h);
  ctx.closePath();
  ctx.fill();
  const dw = s * 0.3;
  const dh = s * 0.32;
  ctx.strokeStyle = c(TRIM);
  ctx.lineWidth = Math.max(1, s * 0.025);
  ctx.strokeRect(x - dw / 2, y - dh, dw, dh);
  ctx.beginPath();
  ctx.moveTo(x - dw / 2, y - dh);
  ctx.lineTo(x + dw / 2, y);
  ctx.moveTo(x + dw / 2, y - dh);
  ctx.lineTo(x - dw / 2, y);
  ctx.stroke();
}

function drawSilo(ctx, x, y, s, c) {
  const w = s * 0.26;
  const h = s * 0.95;
  ctx.fillStyle = c(SILO);
  ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.beginPath();
  ctx.arc(x, y - h, w / 2, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = c(scale(SILO, 0.75));
  ctx.lineWidth = Math.max(1, s * 0.015);
  ctx.beginPath();
  for (let k = 1; k <= 4; k++) {
    ctx.moveTo(x - w / 2, y - (h * k) / 5);
    ctx.lineTo(x + w / 2, y - (h * k) / 5);
  }
  ctx.stroke();
}

function drawBales(ctx, x, y, s, c) {
  const r = s * 0.09;
  [0, 1, 2].forEach((k) => {
    const bx = x + (k - 1) * s * 0.26;
    ctx.fillStyle = c(HAY);
    ctx.beginPath();
    circle(ctx, bx, y - r, r);
    ctx.fill();
    ctx.fillStyle = c(scale(HAY, 0.75));
    ctx.beginPath();
    circle(ctx, bx, y - r, r * 0.45);
    ctx.fill();
  });
}

function drawCow(ctx, x, y, s, c, id) {
  const dir = hash(id, 511) > 0.5 ? 1 : -1;
  const grazing = hash(id, 512) > 0.5;
  const bodyY = y - s * 0.09;
  ctx.fillStyle = c(COW);
  [-0.07, -0.04, 0.04, 0.07].forEach((lx) => ctx.fillRect(x + lx * s, bodyY, Math.max(1, s * 0.015), s * 0.09));
  ctx.beginPath();
  ctx.ellipse(x, bodyY, s * 0.1, s * 0.05, 0, 0, Math.PI * 2);
  ctx.ellipse(x + dir * s * 0.12, bodyY + (grazing ? s * 0.05 : -s * 0.02), s * 0.035, s * 0.028, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c(SPOT);
  ctx.beginPath();
  circle(ctx, x - s * 0.03, bodyY - s * 0.01, s * 0.025);
  circle(ctx, x + s * 0.045, bodyY + s * 0.012, s * 0.018);
  ctx.fill();
}

function drawWindmill(ctx, x, y, s, c, angle) {
  const h = s * 1.3;
  const top = y - h;
  ctx.strokeStyle = c(STEEL);
  ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.beginPath();
  ctx.moveTo(x - s * 0.18, y);
  ctx.lineTo(x, top);
  ctx.lineTo(x + s * 0.18, y);
  for (let k = 1; k <= 3; k++) {
    const half = s * 0.18 * (1 - k / 4);
    ctx.moveTo(x - half, y - (h * k) / 4);
    ctx.lineTo(x + half, y - (h * k) / 4);
  }
  ctx.stroke();
  ctx.fillStyle = c(STEEL);
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x + s * 0.3, top - s * 0.04);
  ctx.lineTo(x + s * 0.3, top + s * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = Math.max(1, s * 0.03);
  ctx.beginPath();
  for (let k = 0; k < 12; k++) {
    const a = angle + (k * Math.PI) / 6;
    ctx.moveTo(x + Math.cos(a) * s * 0.04, top + Math.sin(a) * s * 0.04);
    ctx.lineTo(x + Math.cos(a) * s * 0.2, top + Math.sin(a) * s * 0.2);
  }
  ctx.stroke();
}

const KINDS = ['barn', 'barn', 'silo', 'bales', 'bales', 'cows', 'cows', 'windmill'];

export function drawFarmProp(ctx, x, y, s, env, haze, id, time) {
  const c = (color) => rgba(shade(color, env, haze));
  const kind = KINDS[Math.floor(hash(id, 501) * KINDS.length)];
  if (kind === 'barn') {
    drawBarn(ctx, x, y, s, c);
    if (hash(id, 502) > 0.4) drawSilo(ctx, x + s * 0.72, y, s, c);
  } else if (kind === 'silo') {
    drawSilo(ctx, x, y, s, c);
    drawSilo(ctx, x + s * 0.3, y, s * 0.85, c);
  } else if (kind === 'bales') {
    drawBales(ctx, x, y, s, c);
  } else if (kind === 'cows') {
    [0, 1, 2].forEach((k) => drawCow(ctx, x + (k - 1) * s * 0.35, y + k * s * 0.02, s, c, id * 3 + k));
  } else {
    drawWindmill(ctx, x, y, s, c, time * 2.5 + id);
  }
}

/** Wooden post-and-rail fence along the trackside layer where the biome is farmland. */
export function drawFence(ctx, layout, lf, groundAt, env) {
  const { win, u } = layout;
  const h = u * 3;
  ctx.fillStyle = rgba(shade(WOOD, env));
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = Math.max(1, u * 0.3);
  ctx.beginPath();
  forEachSegment(win, lf, u * 5, (i, wx0, x0, bm) => {
    if (num(bm, 'farm') < 0.35) return;
    const wx1 = wx0 + u * 5;
    const x1 = x0 + u * 5;
    const y0 = groundAt(wx0);
    const y1 = groundAt(wx1);
    ctx.fillRect(x0 - u * 0.25, y0 - h, u * 0.5, h);
    ctx.moveTo(x0, y0 - h * 0.8);
    ctx.lineTo(x1, y1 - h * 0.8);
    ctx.moveTo(x0, y0 - h * 0.4);
    ctx.lineTo(x1, y1 - h * 0.4);
  });
  ctx.stroke();
}
