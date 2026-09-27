import { circle } from './utils.js';

const BRANCHES = [[0, -0.5, -0.28, -0.85], [0, -0.45, 0.3, -0.8], [0, -0.6, 0.05, -1.0], [-0.14, -0.7, -0.3, -0.72], [0.16, -0.66, 0.34, -0.62]];
const BLOSSOM_SPOTS = [[-0.12, -0.8], [0.14, -0.74], [-0.24, -0.58], [0.26, -0.56], [0.02, -0.62], [-0.05, -0.92], [0.18, -0.9]];

/** Winter: a bare trunk with forked branches, dusted with snow. */
function drawBare(ctx, x, y, s, { trunk, snow }) {
  ctx.fillStyle = trunk;
  ctx.fillRect(x - s * 0.05, y - s * 0.5, s * 0.1, s * 0.5);
  ctx.strokeStyle = trunk;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, s * 0.04);
  ctx.beginPath();
  BRANCHES.forEach(([x0, y0, x1, y1]) => {
    ctx.moveTo(x + x0 * s, y + y0 * s);
    ctx.lineTo(x + x1 * s, y + y1 * s);
  });
  ctx.stroke();
  if (!snow) return;
  ctx.fillStyle = snow;
  BRANCHES.forEach(([, , x1, y1]) => ctx.fillRect(x + x1 * s - s * 0.04, y + y1 * s - s * 0.02, s * 0.08, s * 0.03));
}

function drawRound(ctx, x, y, s, style) {
  if (style.bare) return drawBare(ctx, x, y, s, style);
  ctx.fillStyle = style.trunk;
  ctx.fillRect(x - s * 0.05, y - s * 0.5, s * 0.1, s * 0.5);
  ctx.fillStyle = style.leaf;
  ctx.beginPath();
  circle(ctx, x, y - s * 0.72, s * 0.3);
  circle(ctx, x - s * 0.2, y - s * 0.55, s * 0.22);
  circle(ctx, x + s * 0.2, y - s * 0.58, s * 0.24);
  ctx.fill();
  if (!style.blossom) return;
  ctx.fillStyle = style.blossom;
  ctx.beginPath();
  BLOSSOM_SPOTS.forEach(([dx, dy]) => circle(ctx, x + dx * s, y + dy * s, Math.max(0.8, s * 0.05)));
  ctx.fill();
}

function drawPine(ctx, x, y, s, { leaf, trunk, snow }) {
  ctx.fillStyle = trunk;
  ctx.fillRect(x - s * 0.04, y - s * 0.2, s * 0.08, s * 0.2);
  ctx.fillStyle = leaf;
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const base = y - s * (0.12 + k * 0.26);
    const half = s * (0.26 - k * 0.06);
    ctx.moveTo(x - half, base);
    ctx.lineTo(x + half, base);
    ctx.lineTo(x, base - s * 0.42);
  }
  ctx.fill();
  if (!snow) return;
  ctx.fillStyle = snow;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 1.06);
  ctx.lineTo(x - s * 0.06, y - s * 0.88);
  ctx.lineTo(x + s * 0.06, y - s * 0.88);
  ctx.fill();
}

const FROND_ANGLES = [-2.9, -2.3, -1.75, -1.3, -0.8, -0.25];

function drawPalm(ctx, x, y, s, { leaf, trunk }) {
  const tx = x + s * 0.18;
  const ty = y - s;
  ctx.lineCap = 'round';
  ctx.strokeStyle = trunk;
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.02, y - s * 0.6, tx, ty);
  ctx.stroke();
  ctx.strokeStyle = leaf;
  ctx.lineWidth = Math.max(1, s * 0.07);
  ctx.beginPath();
  FROND_ANGLES.forEach((a) => {
    const len = s * 0.45;
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(
      tx + Math.cos(a) * len * 0.5, ty + Math.sin(a) * len * 0.5 - s * 0.1,
      tx + Math.cos(a) * len, ty + Math.sin(a) * len + s * 0.18,
    );
  });
  ctx.stroke();
}

/** Saguaro cactus: a ribbed column with two raised arms. */
function drawCactus(ctx, x, y, s, { leaf }) {
  ctx.strokeStyle = leaf;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.5, s * 0.14);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - s * 0.85);
  ctx.moveTo(x, y - s * 0.4);
  ctx.quadraticCurveTo(x - s * 0.28, y - s * 0.42, x - s * 0.28, y - s * 0.65);
  ctx.moveTo(x, y - s * 0.3);
  ctx.quadraticCurveTo(x + s * 0.26, y - s * 0.32, x + s * 0.26, y - s * 0.55);
  ctx.stroke();
}

export function drawTree(ctx, type, x, y, s, style) {
  if (type === 'pine') return drawPine(ctx, x, y, s, style);
  if (type === 'cactus') return drawCactus(ctx, x, y, s, style);
  if (type === 'palm') return drawPalm(ctx, x, y, s, style);
  return drawRound(ctx, x, y, s, style);
}

export function drawHouse(ctx, x, y, s, { wall, roof, window }) {
  const h = s * 0.6;
  ctx.fillStyle = wall;
  ctx.fillRect(x - s / 2, y - h, s, h);
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.6, y - h);
  ctx.lineTo(x, y - h - s * 0.45);
  ctx.lineTo(x + s * 0.6, y - h);
  ctx.fill();
  ctx.fillStyle = window;
  ctx.fillRect(x - s * 0.28, y - h * 0.7, s * 0.18, h * 0.3);
  ctx.fillRect(x + s * 0.1, y - h * 0.7, s * 0.18, h * 0.3);
}

export function drawBush(ctx, x, y, s, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  circle(ctx, x - s * 0.35, y - s * 0.25, s * 0.35);
  circle(ctx, x, y - s * 0.4, s * 0.45);
  circle(ctx, x + s * 0.4, y - s * 0.25, s * 0.32);
  ctx.fill();
}
