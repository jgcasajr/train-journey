import { lit } from './interior.js';
import { passengerOrigin } from './passenger.js';
import { clamp, hash, hex, rgba, smoothstep } from './utils.js';

// Bella travelling inside: she sits on the floor beside the passenger, in front of the seat.
// Shapes are in passenger units (origin at the passenger's hip, 1 unit = layout.u).

const TAN = hex('#c98d4f');
const TAN_LIGHT = hex('#e3b37c');
const SADDLE = hex('#2b231d');
const MUZZLE = hex('#4a3524');
const NOSE = hex('#1e1915');
const COLLAR = hex('#d23c5a');
const TONGUE = hex('#e2687a');
const HEART = hex('#ff5c8a');
const PET_SECONDS = 3;
const GLANCE_PERIOD = 13;
const SIZE = 0.78; // she sits a little further back than the seat edge
const FLOOR = { x: 40, y: 34 }; // scaled around her paws on the floor
const SHIFT = -6; // closer to the passenger's knee

/** Seated cars where she can come along. */
export const bellaCanBoard = (car) => !car || car === 'passenger' || car === 'dining';

/** What she is doing now, from the state alone: 0..1 weights for each mood. */
export function bellaMood(state) {
  const pet = (state.effects ?? []).filter((e) => e.kind === 'bella').map((e) => state.time - e.born).find((age) => age < PET_SECONDS);
  const sleep = clamp(((state.pose?.sleep ?? 0) - 0.4) / 0.4);
  const station = state.dwell > 0 ? 1 : 0;
  const local = state.time % GLANCE_PERIOD;
  const glance = hash(Math.floor(state.time / GLANCE_PERIOD), 6301) < 0.6 ? smoothstep(0, 0.6, local) * smoothstep(3.2, 2.4, local) : 0;
  return { happy: pet === undefined ? 0 : 1 - pet / PET_SECONDS, sleep, station: station * (1 - sleep), glance: glance * (1 - sleep) };
}

/** Click box (screen coordinates, before the head-look shift). */
export function bellaAboardBox(layout) {
  const o = passengerOrigin(layout);
  const { u } = layout;
  const at = (x, y) => ({ x: o.x + (FLOOR.x + SHIFT + (x - FLOOR.x) * SIZE) * u, y: o.y + (FLOOR.y + (y - FLOOR.y) * SIZE) * u });
  const a = at(22, -26);
  const b = at(56, 34);
  return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
}

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
}

function drawBody(ctx, c, wag) {
  ctx.strokeStyle = c(TAN); // tail sweeping the floor
  ctx.lineCap = 'round';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(22, 28);
  ctx.quadraticCurveTo(14 + wag * 0.4, 33, 8 + wag, 31);
  ctx.stroke();
  ctx.fillStyle = c(TAN);
  ellipse(ctx, 29, 22, 11, 10); // haunch
  ellipse(ctx, 38, 8, 8, 15, 0.25); // chest
  ctx.fillStyle = c(SADDLE);
  ellipse(ctx, 30, 13.5, 8, 5.5, -0.5); // the black saddle over her back
  ctx.fillStyle = c(TAN_LIGHT);
  ellipse(ctx, 41, 10, 3.5, 9, 0.2);
  ctx.strokeStyle = c(TAN);
  ctx.lineWidth = 3.6;
  [[40, 44], [44, 47]].forEach(([x0, x1]) => {
    ctx.beginPath();
    ctx.moveTo(x0, 14);
    ctx.lineTo(x1, 33);
    ctx.stroke();
  });
}

/** Head at (hx, hy) facing `dir` (1 = toward the window, -1 = toward her). */
function drawHead(ctx, c, hx, hy, dir, mood, time) {
  const ears = mood.station * -1.5;
  ctx.fillStyle = c(SADDLE);
  [-2.2, 1].forEach((o) => {
    ctx.beginPath();
    ctx.moveTo(hx + o * dir - 1.6 * dir, hy - 2.5);
    ctx.lineTo(hx + o * dir - 0.4 * dir, hy - 9.5 + ears + mood.sleep * 3);
    ctx.lineTo(hx + o * dir + 1.6 * dir, hy - 2.8);
    ctx.fill();
  });
  ctx.fillStyle = c(TAN);
  ellipse(ctx, hx, hy, 5.2, 4.2, 0.1 * dir);
  ctx.fillStyle = c(MUZZLE);
  ellipse(ctx, hx + 5 * dir, hy + 1.4, 4, 2.1, 0.2 * dir);
  ctx.fillStyle = c(NOSE);
  ellipse(ctx, hx + 8.6 * dir, hy + 1.6, 1.2, 1);
  if (mood.sleep > 0.5) {
    ctx.strokeStyle = c(NOSE);
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
    ctx.fillStyle = c(TONGUE);
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

/**
 * Bella sitting beside her: looks out at stations with her ears up, glances at her now and
 * then, rests her head on her knee when she sleeps, and wags hard when petted.
 */
export function drawBellaAboard(ctx, layout, state, L, bob) {
  const c = (col) => rgba(lit(col, L));
  const mood = bellaMood(state);
  const o = passengerOrigin(layout);
  const wag = Math.sin(state.time * (4 + mood.happy * 12)) * (2 + mood.happy * 4) * (1 - mood.sleep * 0.8);
  const dir = mood.glance > 0.5 || mood.sleep > 0.5 ? -1 : 1;
  // Head: up toward the window at stations, down on her knee when she sleeps.
  const hx = 45 - mood.sleep * 20 - mood.glance * 1.5;
  const hy = -12 - mood.station * 3 + mood.sleep * 2 + Math.sin(state.time * 1.6) * 0.3;
  ctx.save();
  ctx.translate(o.x, o.y + bob * 0.4);
  ctx.scale(layout.u, layout.u);
  ctx.translate(FLOOR.x + SHIFT, FLOOR.y);
  ctx.scale(SIZE, SIZE);
  ctx.translate(-FLOOR.x, -FLOOR.y);
  drawBody(ctx, c, wag);
  ctx.fillStyle = c(TAN); // neck
  ctx.beginPath();
  ctx.moveTo(35, -2);
  ctx.quadraticCurveTo(hx - 3 * dir, hy + 2, hx, hy + 2);
  ctx.lineTo(hx + 1, hy + 5);
  ctx.quadraticCurveTo(42, 2, 42, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = c(COLLAR);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo((35 + hx) / 2 - 2, (hy + 2 - 2) / 2 + 1);
  ctx.lineTo((42 + hx) / 2 + 1, (hy + 5 + 4) / 2 + 1);
  ctx.stroke();
  drawHead(ctx, c, hx, hy, dir, mood, state.time);
  drawHearts(ctx, mood, hx, hy);
  ctx.restore();
}
