import { BELLA, PRINCESS } from './bella.js';
import { lit } from './interior.js';
import { passengerOrigin } from './passenger.js';
import { clamp, hash, hex, rgba, smoothstep } from './utils.js';

// Bella and Princess travelling inside: they sit on the floor beside the passenger, in front
// of the seat. Shapes are in passenger units (origin at the passenger's hip, 1 unit = layout.u).

const HEART = hex('#ff5c8a');
const PET_SECONDS = 3;
const GLANCE_PERIOD = 13;
const FLOOR = { x: 40, y: 34 }; // each dog is scaled around her paws on the floor

/**
 * Where each one sits: Bella by the passenger's knee (and her head reaches the knee when she
 * sleeps); Princess a little farther along, nearer the window, slightly smaller.
 */
const SEATS = {
  bella: { coat: BELLA, size: 0.78, shift: -6, reach: 20, seed: 6301 },
  princess: { coat: PRINCESS, size: 0.7, shift: 12, reach: 0, seed: 6311 },
};

/** Seated cars where they can come along. */
export const bellaCanBoard = (car) => !car || car === 'passenger' || car === 'dining';

/** What a dog is doing now, from the state alone: 0..1 weights for each mood. */
export function bellaMood(state, kind = 'bella') {
  const pet = (state.effects ?? []).filter((e) => e.kind === kind).map((e) => state.time - e.born).find((age) => age < PET_SECONDS);
  const sleep = clamp(((state.pose?.sleep ?? 0) - 0.4) / 0.4);
  const station = state.dwell > 0 ? 1 : 0;
  const local = state.time % GLANCE_PERIOD;
  const glance = hash(Math.floor(state.time / GLANCE_PERIOD), SEATS[kind].seed) < 0.6 ? smoothstep(0, 0.6, local) * smoothstep(3.2, 2.4, local) : 0;
  return { happy: pet === undefined ? 0 : 1 - pet / PET_SECONDS, sleep, station: station * (1 - sleep), glance: glance * (1 - sleep) };
}

/** Click box of a dog (screen coordinates, before the head-look shift); `kind` 'bella' or 'princess'. */
export function bellaAboardBox(layout, kind = 'bella') {
  const { size, shift } = SEATS[kind];
  const o = passengerOrigin(layout);
  const { u } = layout;
  const at = (x, y) => ({ x: o.x + (FLOOR.x + shift + (x - FLOOR.x) * size) * u, y: o.y + (FLOOR.y + (y - FLOOR.y) * size) * u });
  const a = at(22, -26);
  const b = at(56, 34);
  return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
}

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
}

function drawBody(ctx, c, coat, wag) {
  ctx.strokeStyle = c(coat.body); // tail sweeping the floor
  ctx.lineCap = 'round';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(22, 28);
  ctx.quadraticCurveTo(14 + wag * 0.4, 33, 8 + wag, 31);
  ctx.stroke();
  if (coat.tailTip) {
    ctx.fillStyle = c(coat.tailTip);
    ellipse(ctx, 8.5 + wag, 31, 2.6, 2.2);
  }
  ctx.fillStyle = c(coat.body);
  ellipse(ctx, 29, 22, 11, 10); // haunch
  ctx.fillStyle = c(coat.chest);
  ellipse(ctx, 38, 8, 8, 15, 0.25); // chest
  ctx.fillStyle = c(coat.back);
  ellipse(ctx, 30, 13.5, 8, 5.5, -0.5); // saddle over the back
  ctx.fillStyle = c(coat.belly);
  ellipse(ctx, 41, 10, 3.5, 9, 0.2);
  ctx.strokeStyle = c(coat.legs);
  ctx.lineWidth = 3.6;
  [[40, 44], [44, 47]].forEach(([x0, x1]) => {
    ctx.beginPath();
    ctx.moveTo(x0, 14);
    ctx.lineTo(x1, 33);
    ctx.stroke();
  });
}

function drawEars(ctx, c, coat, hx, hy, dir, mood) {
  const lift = mood.station * -1.5 + mood.sleep * 3;
  ctx.fillStyle = c(coat.ears);
  [-2.2, 1].forEach((o) => {
    const tip = hy - (coat.tippedEars ? 7.5 : 9.5) + lift;
    ctx.beginPath();
    ctx.moveTo(hx + o * dir - 1.6 * dir, hy - 2.5);
    ctx.lineTo(hx + o * dir - 0.4 * dir, tip);
    ctx.lineTo(hx + o * dir + 1.6 * dir, hy - 2.8);
    ctx.fill();
    if (!coat.tippedEars) return;
    ctx.beginPath(); // the tip folds forward
    ctx.moveTo(hx + o * dir - 0.5 * dir, tip);
    ctx.lineTo(hx + o * dir + 2 * dir, tip + 1.6);
    ctx.lineTo(hx + o * dir + 0.6 * dir, tip + 2.2);
    ctx.fill();
  });
}

/** Head at (hx, hy) facing `dir` (1 = toward the window, -1 = toward her). */
function drawHead(ctx, c, coat, hx, hy, dir, mood, time) {
  drawEars(ctx, c, coat, hx, hy, dir, mood);
  ctx.fillStyle = c(coat.body);
  ellipse(ctx, hx, hy, 5.2, 4.2, 0.1 * dir);
  if (coat.blaze) {
    ctx.fillStyle = c(coat.blaze);
    ellipse(ctx, hx + 2.4 * dir, hy - 1.4, 3, 0.9, -0.35 * dir);
  }
  ctx.fillStyle = c(coat.muzzle);
  ellipse(ctx, hx + 5 * dir, hy + 1.4, 4, 2.1, 0.2 * dir);
  ctx.fillStyle = c(coat.mask);
  ellipse(ctx, hx + 8.6 * dir, hy + 1.6, 1.2, 1);
  if (mood.sleep > 0.5) {
    ctx.strokeStyle = c(coat.mask);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(hx + 0.6 * dir, hy - 0.6);
    ctx.lineTo(hx + 2.2 * dir, hy - 0.3);
    ctx.stroke();
  } else {
    ellipse(ctx, hx + 1.4 * dir, hy - 0.9, 0.75, 0.75);
  }
  const panting = Math.max(mood.happy, 0.4 * (1 - mood.sleep));
  if (panting > 0.2) {
    ctx.fillStyle = c(coat.tongue);
    ellipse(ctx, hx + 6 * dir, hy + 3.6 + Math.sin(time * 12) * 0.4 * panting, 1.3, 1.6 * panting);
  }
}

function drawHearts(ctx, mood, hx, hy) {
  if (mood.happy <= 0) return;
  const age = 1 - mood.happy;
  [-3, 1.5, 5].forEach((o, i) => {
    const k = clamp(age * 3 - i * 0.25);
    ctx.fillStyle = rgba(HEART, clamp(1 - k));
    const x = hx + o;
    const y = hy - 8 - k * 14;
    ctx.beginPath();
    ctx.moveTo(x, y + 1.6);
    ctx.bezierCurveTo(x - 2.6, y - 0.4, x - 1, y - 2.4, x, y - 0.9);
    ctx.bezierCurveTo(x + 1, y - 2.4, x + 2.6, y - 0.4, x, y + 1.6);
    ctx.fill();
  });
}

/** One dog sitting on the floor: looks out at stations, glances at her, sleeps, wags when petted. */
function drawDog(ctx, layout, state, L, bob, kind) {
  const { coat, size, shift, reach } = SEATS[kind];
  const c = (col) => rgba(lit(col, L));
  const mood = bellaMood(state, kind);
  const o = passengerOrigin(layout);
  const wag = Math.sin(state.time * (4 + mood.happy * 12) + shift) * (2 + mood.happy * 4) * (1 - mood.sleep * 0.8);
  const dir = mood.glance > 0.5 || (mood.sleep > 0.5 && reach > 0) ? -1 : 1;
  // Head: up toward the window at stations; asleep, on her knee (Bella) or lowered where she sits.
  const hx = 45 - mood.sleep * reach - mood.glance * 1.5;
  const hy = -12 - mood.station * 3 + mood.sleep * (reach > 0 ? 2 : 9) + Math.sin(state.time * 1.6 + shift) * 0.3;
  ctx.save();
  ctx.translate(o.x, o.y + bob * 0.4);
  ctx.scale(layout.u, layout.u);
  ctx.translate(FLOOR.x + shift, FLOOR.y);
  ctx.scale(size, size);
  ctx.translate(-FLOOR.x, -FLOOR.y);
  drawBody(ctx, c, coat, wag);
  ctx.fillStyle = c(coat.body); // neck
  ctx.beginPath();
  ctx.moveTo(35, -2);
  ctx.quadraticCurveTo(hx - 3 * dir, hy + 2, hx, hy + 2);
  ctx.lineTo(hx + 1, hy + 5);
  ctx.quadraticCurveTo(42, 2, 42, 4);
  ctx.closePath();
  ctx.fill();
  if (coat.chest !== coat.body) { // a collie's white ruff
    ctx.fillStyle = c(coat.chest);
    ellipse(ctx, (38 + hx) / 2 + 1, (2 + hy) / 2 + 3, 3.4, 5.5, 0.3);
  }
  ctx.strokeStyle = c(coat.collar);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo((35 + hx) / 2 - 2, (hy + 2 - 2) / 2 + 1);
  ctx.lineTo((42 + hx) / 2 + 1, (hy + 5 + 4) / 2 + 1);
  ctx.stroke();
  drawHead(ctx, c, coat, hx, hy, dir, mood, state.time);
  drawHearts(ctx, mood, hx, hy);
  ctx.restore();
}

/** Bella and Princess beside her (Princess first: she sits a little farther back). */
export function drawBellaAboard(ctx, layout, state, L, bob) {
  drawDog(ctx, layout, state, L, bob, 'princess');
  drawDog(ctx, layout, state, L, bob, 'bella');
}
