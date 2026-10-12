import { COAT } from './bella.js';
import { stopElapsed } from './stationPeople.js';
import { DWELL } from './stations.js';
import { hash, smoothstep } from './utils.js';

// Bella waiting on the platform: some days she sits at a station watching the train come in,
// gets up wagging when it stops, trots to the window, and watches it go.

const GREETINGS = ['Bella! Você veio me esperar!', 'Olha quem está na plataforma... a Bella!', 'Bella, minha linda! Sabia que você vinha.'];

/** Whether she waits at this station today (never while she travels aboard). */
export function bellaWaitsAt(st, state) {
  if (state.bellaAboard) return false;
  return hash(st.id * 13 + (state.dayCount ?? 0), 871) < (st.nexus ? 0.4 : 0.2);
}

/** Speech when the train stops where she is waiting. */
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

function head(ctx, c, x, y, s, open) {
  ctx.fillStyle = c(COAT.SADDLE);
  [-0.06, 0.01].forEach((o) => {
    ctx.beginPath();
    ctx.moveTo(x + (o - 0.04) * s, y - 0.04 * s);
    ctx.lineTo(x + o * s, y - 0.21 * s);
    ctx.lineTo(x + (o + 0.05) * s, y - 0.05 * s);
    ctx.fill();
  });
  ctx.fillStyle = c(COAT.TAN);
  ellipse(ctx, x, y, 0.12 * s, 0.09 * s);
  ctx.fillStyle = c(COAT.MUZZLE);
  ellipse(ctx, x + 0.13 * s, y + 0.035 * s, 0.1 * s, 0.042 * s, 0.18);
  ctx.fillStyle = c(COAT.MASK);
  ellipse(ctx, x + 0.225 * s, y + 0.05 * s, 0.025 * s, 0.025 * s);
  ellipse(ctx, x + 0.03 * s, y - 0.025 * s, 0.016 * s, 0.016 * s);
  if (!open) return;
  ctx.fillStyle = c(COAT.TONGUE);
  ellipse(ctx, x + 0.12 * s, y + 0.09 * s, 0.035 * s, 0.025 * s, 0.3);
}

/** Sitting, side view, facing +x: haunch on the ground, chest up, head high. */
function drawSitting(ctx, c, s, time) {
  ctx.strokeStyle = c(COAT.TAN);
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.08 * s;
  ctx.beginPath();
  ctx.moveTo(-0.22 * s, -0.08 * s);
  ctx.quadraticCurveTo(-0.42 * s, -0.02 * s, -0.5 * s + Math.sin(time * 3) * 0.03 * s, -0.03 * s);
  ctx.stroke();
  ctx.fillStyle = c(COAT.TAN);
  ellipse(ctx, -0.12 * s, -0.18 * s, 0.2 * s, 0.17 * s);
  ellipse(ctx, 0.08 * s, -0.42 * s, 0.13 * s, 0.24 * s, 0.3);
  ctx.fillStyle = c(COAT.SADDLE);
  ellipse(ctx, -0.03 * s, -0.36 * s, 0.17 * s, 0.07 * s, -1.0);
  ctx.strokeStyle = c(COAT.TAN);
  ctx.lineWidth = 0.065 * s;
  [0.1, 0.17].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x * s, -0.35 * s);
    ctx.lineTo((x + 0.02) * s, 0);
    ctx.stroke();
  });
  ctx.strokeStyle = c(COAT.COLLAR);
  ctx.lineWidth = 0.035 * s;
  ctx.beginPath();
  ctx.moveTo(0.06 * s, -0.6 * s);
  ctx.lineTo(0.2 * s, -0.55 * s);
  ctx.stroke();
  head(ctx, c, 0.2 * s, -0.72 * s, s, true);
}

/** Standing, side view, facing +x, prancing a little, tail up and wagging. */
function drawStanding(ctx, c, s, time, walking) {
  const wag = Math.sin(time * 14) * 0.08 * s;
  const step = walking ? Math.sin(time * 9) : 0;
  ctx.strokeStyle = c(COAT.TAN);
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.08 * s;
  ctx.beginPath();
  ctx.moveTo(-0.34 * s, -0.5 * s);
  ctx.quadraticCurveTo(-0.5 * s, -0.62 * s, -0.56 * s + wag, -0.76 * s);
  ctx.stroke();
  ctx.lineWidth = 0.065 * s;
  [[-0.27, step], [-0.2, -step], [0.2, -step], [0.27, step]].forEach(([x, k]) => {
    ctx.beginPath();
    ctx.moveTo(x * s, -0.42 * s);
    ctx.lineTo((x + k * 0.05) * s, -0.02 * s + Math.max(0, k) * -0.04 * s);
    ctx.stroke();
  });
  ctx.fillStyle = c(COAT.TAN);
  ellipse(ctx, 0, -0.5 * s, 0.36 * s, 0.13 * s);
  ellipse(ctx, 0.24 * s, -0.5 * s, 0.14 * s, 0.14 * s);
  ctx.fillStyle = c(COAT.SADDLE);
  ellipse(ctx, -0.06 * s, -0.56 * s, 0.28 * s, 0.08 * s);
  ctx.strokeStyle = c(COAT.TAN);
  ctx.lineWidth = 0.15 * s;
  ctx.beginPath();
  ctx.moveTo(0.26 * s, -0.55 * s);
  ctx.lineTo(0.42 * s, -0.75 * s);
  ctx.stroke();
  head(ctx, c, 0.46 * s, -0.8 * s, s, true);
}

/**
 * Drawn with the platform life (station geometry `g`). Sits facing the incoming train; once it
 * stops she gets up and trots to the window; after it leaves she sits and watches it go.
 */
export function drawBellaPlatform(ctx, g, state) {
  const { st, toX, win } = g;
  if (!bellaWaitsAt(st, state)) return;
  const elapsed = stopElapsed(state, st);
  const s = win.h * 0.17;
  const feet = g.platformTop + win.h * 0.12;
  const trot = Number.isFinite(elapsed) ? smoothstep(1.5, 5, elapsed) : 1;
  const x = toX(st.stopAt + 22 + trot * 10); // mid-window once the train has stopped
  const standing = elapsed > 1 && elapsed < DWELL - 0.5;
  ctx.save();
  ctx.translate(x, feet);
  if (!standing && elapsed === 0) ctx.scale(-1, 1); // watching the train come in
  if (standing) drawStanding(ctx, g.c, s, state.time, trot > 0 && trot < 1);
  else drawSitting(ctx, g.c, s, state.time);
  ctx.restore();
}
