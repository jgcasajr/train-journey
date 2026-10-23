import { BELLA, PRINCESS, bellaWaitsAt } from './bella.js';
import { stopElapsed } from './stationPeople.js';
import { DWELL } from './stations.js';
import { smoothstep } from './utils.js';

// Bella and Princess waiting on the platform: some days they sit at a station watching the
// train come in, get up wagging when it stops, trot to the window, and watch it go.

const GREETINGS = ['Bella! Princess! Vocês vieram me esperar!', 'Olha quem está na plataforma... a Bella e a Princess!', 'Minhas meninas! Sabia que vocês vinham.'];

export { bellaWaitsAt }; // decided in bella.js, where the run also needs it

/** Speech when the train stops where they are waiting. */
export function bellaPlatformGreeting(prev, next) {
  if (!next.arrived || !next.served || prev.arrived) return {};
  const st = { id: next.served.id, nexus: next.served.name === 'Nexus' };
  if (!bellaWaitsAt(st, next) || (next.pose?.sleep ?? 0) > 0.5) return {};
  return { speech: { text: GREETINGS[next.served.id % GREETINGS.length], until: next.time + 4 }, bellaWaits: (next.bellaWaits ?? 0) + 1 };
}

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
}

function head(ctx, c, coat, x, y, s, open) {
  ctx.fillStyle = c(coat.ears);
  [-0.06, 0.01].forEach((o) => {
    const tip = coat.tippedEars ? 0.15 : 0.21;
    ctx.beginPath();
    ctx.moveTo(x + (o - 0.04) * s, y - 0.04 * s);
    ctx.lineTo(x + o * s, y - tip * s);
    ctx.lineTo(x + (o + 0.05) * s, y - 0.05 * s);
    ctx.fill();
    if (!coat.tippedEars) return;
    ctx.beginPath(); // the tip folds forward
    ctx.moveTo(x + (o - 0.005) * s, y - 0.15 * s);
    ctx.lineTo(x + (o + 0.06) * s, y - 0.12 * s);
    ctx.lineTo(x + (o + 0.02) * s, y - 0.1 * s);
    ctx.fill();
  });
  ctx.fillStyle = c(coat.body);
  ellipse(ctx, x, y, 0.12 * s, 0.09 * s);
  if (coat.blaze) {
    ctx.fillStyle = c(coat.blaze);
    ellipse(ctx, x + 0.05 * s, y - 0.035 * s, 0.07 * s, 0.022 * s, -0.35);
  }
  ctx.fillStyle = c(coat.muzzle);
  ellipse(ctx, x + 0.13 * s, y + 0.035 * s, 0.1 * s, 0.042 * s, 0.18);
  ctx.fillStyle = c(coat.mask);
  ellipse(ctx, x + 0.225 * s, y + 0.05 * s, 0.025 * s, 0.025 * s);
  ellipse(ctx, x + 0.03 * s, y - 0.025 * s, 0.016 * s, 0.016 * s);
  if (!open) return;
  ctx.fillStyle = c(coat.tongue);
  ellipse(ctx, x + 0.12 * s, y + 0.09 * s, 0.035 * s, 0.025 * s, 0.3);
}

function tailTip(ctx, c, coat, x, y, s) {
  if (!coat.tailTip) return;
  ctx.fillStyle = c(coat.tailTip);
  ellipse(ctx, x, y, 0.05 * s, 0.045 * s);
}

/** Sitting, side view, facing +x: haunch on the ground, chest up, head high. */
function drawSitting(ctx, c, coat, s, time) {
  const swish = Math.sin(time * 3) * 0.03 * s;
  ctx.strokeStyle = c(coat.body);
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.08 * s;
  ctx.beginPath();
  ctx.moveTo(-0.22 * s, -0.08 * s);
  ctx.quadraticCurveTo(-0.42 * s, -0.02 * s, -0.5 * s + swish, -0.03 * s);
  ctx.stroke();
  tailTip(ctx, c, coat, -0.5 * s + swish, -0.03 * s, s);
  ctx.fillStyle = c(coat.body);
  ellipse(ctx, -0.12 * s, -0.18 * s, 0.2 * s, 0.17 * s);
  ctx.fillStyle = c(coat.chest);
  ellipse(ctx, 0.08 * s, -0.42 * s, 0.13 * s, 0.24 * s, 0.3);
  ctx.fillStyle = c(coat.back);
  ellipse(ctx, -0.03 * s, -0.36 * s, 0.17 * s, 0.07 * s, -1.0);
  ctx.strokeStyle = c(coat.legs);
  ctx.lineWidth = 0.065 * s;
  [0.1, 0.17].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x * s, -0.35 * s);
    ctx.lineTo((x + 0.02) * s, 0);
    ctx.stroke();
  });
  ctx.strokeStyle = c(coat.collar);
  ctx.lineWidth = 0.035 * s;
  ctx.beginPath();
  ctx.moveTo(0.06 * s, -0.6 * s);
  ctx.lineTo(0.2 * s, -0.55 * s);
  ctx.stroke();
  head(ctx, c, coat, 0.2 * s, -0.72 * s, s, true);
}

/** Standing, side view, facing +x, prancing a little, tail up and wagging. */
function drawStanding(ctx, c, coat, s, time, walking) {
  const wag = Math.sin(time * 14) * 0.08 * s;
  const step = walking ? Math.sin(time * 9) : 0;
  ctx.strokeStyle = c(coat.body);
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.08 * s;
  ctx.beginPath();
  ctx.moveTo(-0.34 * s, -0.5 * s);
  ctx.quadraticCurveTo(-0.5 * s, -0.62 * s, -0.56 * s + wag, -0.76 * s);
  ctx.stroke();
  tailTip(ctx, c, coat, -0.56 * s + wag, -0.76 * s, s);
  ctx.strokeStyle = c(coat.legs);
  ctx.lineWidth = 0.065 * s;
  [[-0.27, step], [-0.2, -step], [0.2, -step], [0.27, step]].forEach(([x, k]) => {
    ctx.beginPath();
    ctx.moveTo(x * s, -0.42 * s);
    ctx.lineTo((x + k * 0.05) * s, -0.02 * s + Math.max(0, k) * -0.04 * s);
    ctx.stroke();
  });
  ctx.fillStyle = c(coat.body);
  ellipse(ctx, 0, -0.5 * s, 0.36 * s, 0.13 * s);
  ctx.fillStyle = c(coat.chest);
  ellipse(ctx, 0.24 * s, -0.5 * s, 0.14 * s, 0.14 * s);
  ctx.fillStyle = c(coat.back);
  ellipse(ctx, -0.06 * s, -0.56 * s, 0.28 * s, 0.08 * s);
  ctx.strokeStyle = c(coat.body);
  ctx.lineWidth = 0.15 * s;
  ctx.beginPath();
  ctx.moveTo(0.26 * s, -0.55 * s);
  ctx.lineTo(0.42 * s, -0.75 * s);
  ctx.stroke();
  head(ctx, c, coat, 0.46 * s, -0.8 * s, s, true);
}

/** One dog on the platform: `offset` meters along it, `size` relative to Bella, `delay` seconds behind her. */
function drawDog(ctx, g, state, coat, { offset, size, delay }) {
  const { st, toX, win } = g;
  const elapsed = stopElapsed(state, st);
  const s = win.h * 0.17 * size;
  const feet = g.platformTop + win.h * (0.12 - (1 - size) * 0.1); // a step farther back on the platform
  const trot = Number.isFinite(elapsed) ? smoothstep(1.5 + delay, 5 + delay, elapsed) : 1;
  const x = toX(st.stopAt + 22 + offset + trot * 10); // mid-window once the train has stopped
  const standing = elapsed > 1 + delay && elapsed < DWELL - 0.5;
  ctx.save();
  ctx.translate(x, feet);
  if (!standing && elapsed === 0) ctx.scale(-1, 1); // watching the train come in
  if (standing) drawStanding(ctx, g.c, coat, s, state.time + delay, trot > 0 && trot < 1);
  else drawSitting(ctx, g.c, coat, s, state.time + delay);
  ctx.restore();
}

/**
 * Drawn with the platform life (station geometry `g`). They sit facing the incoming train; once
 * it stops they get up and trot to the window; after it leaves they sit and watch it go.
 */
export function drawBellaPlatform(ctx, g, state) {
  if (!bellaWaitsAt(g.st, state)) return;
  drawDog(ctx, g, state, PRINCESS, { offset: 7, size: 0.88, delay: 0.6 });
  drawDog(ctx, g, state, BELLA, { offset: 0, size: 1, delay: 0 });
}
