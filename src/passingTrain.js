import { trackX } from './frame.js';
import { shade } from './sky.js';
import { stationsBetween } from './stations.js';
import { clamp, hash, hex, rgba, scale, smoothstep } from './utils.js';

const CAR_LENGTH = 24; // meters
const CAR_GAP = 1.2;
const LOCO_LENGTH = 20;
const CLEARANCE = 150; // meters past the window before the train is gone
const FIRST_PASS = 25; // seconds
const GAP_MIN = 50;
const GAP_RANGE = 90;
const LIVERIES = [
  { body: '#c9372c', stripe: '#f1e7d0', roof: '#6b6f73' },
  { body: '#2d5b8a', stripe: '#e9c46a', roof: '#5a6068' },
  { body: '#e9e4d8', stripe: '#2a6f4a', roof: '#7a7f84' },
  { body: '#3b3f45', stripe: '#d9822b', roof: '#2a2d31' },
].map((l) => ({ body: hex(l.body), stripe: hex(l.stripe), roof: hex(l.roof) }));
const GLASS = hex('#2b3440');
const LIT = hex('#ffdc96');
const GAP = hex('#1a1c1f');
const HEAD = hex('#3a2c24');
const HEADLIGHT = hex('#fff3cf');

export const initialPassing = () => ({ passing: null, nextPassing: FIRST_PASS, passStarted: false });

function spawn() {
  const cars = 4 + Math.floor(Math.random() * 6);
  return {
    rel: 0,
    speed: 22 + Math.random() * 18,
    cars,
    length: LOCO_LENGTH + cars * (CAR_LENGTH + CAR_GAP),
    livery: Math.floor(Math.random() * LIVERIES.length),
    seed: Math.floor(Math.random() * 1e6),
  };
}

/**
 * Opposing train on the adjacent track. `rel` = meters the two trains have closed past each
 * other since the nose appeared at the right edge. Returns the passing-related state fields.
 */
export function updatePassing(state, dt, speed) {
  const nextPassing = state.nextPassing - dt;
  if (state.passing) {
    const rel = state.passing.rel + (state.passing.speed + speed) * dt;
    const done = rel - state.passing.length > CLEARANCE;
    return { passing: done ? null : { ...state.passing, rel }, nextPassing, passStarted: false };
  }
  const nearStation = stationsBetween(state.distance - 100, state.distance + 400).length > 0;
  if (nextPassing > 0 || speed < 3 || nearStation) {
    return { passing: null, nextPassing: Math.max(0, nextPassing), passStarted: false };
  }
  return { passing: spawn(), nextPassing: GAP_MIN + Math.random() * GAP_RANGE, passStarted: true };
}

/** Seconds the opposing train needs to fully pass the window (for the whoosh sound). */
export const passDuration = (passing, speed) => (passing.length + 100) / (passing.speed + speed);

function span(layout, state, passing) {
  const { win, px, u } = layout;
  const look = trackX(layout, state)(state.distance) - win.x;
  const nose = win.x + win.w + u * 4 - passing.rel * px + look;
  return { nose, tail: nose + passing.length * px };
}

/** Fraction of the window blocked by the passing train (dims the cabin daylight). */
export function passingCoverage(layout, state) {
  if (!state.passing) return 0;
  const { win } = layout;
  const { nose, tail } = span(layout, state, state.passing);
  const covered = Math.min(tail, win.x + win.w) - Math.max(nose, win.x);
  return clamp(covered / win.w) * 0.85;
}

const DOORS = [0.25, 0.75]; // door centers as a fraction of the car length

function drawWindows(ctx, g, x0, x1, carId) {
  const { u, px, top, h, night, env } = g;
  const y = top + h * 0.2;
  const wh = h * 0.17;
  const carLen = x1 - x0;
  // Window bays between the ends and the two doors.
  const bays = [[0.04, 0.2], [0.3, 0.7], [0.8, 0.96]];
  bays.forEach(([a, b], bay) => {
    const bx0 = x0 + carLen * a;
    const bw = carLen * (b - a);
    const count = Math.max(1, Math.round(bw / (4.2 * px)));
    const pitch = bw / count;
    for (let k = 0; k < count; k++) {
      const x = bx0 + k * pitch + u * 0.4;
      const w = pitch - u * 0.8;
      ctx.fillStyle = night > 0.05 ? rgba(LIT, 0.35 + 0.6 * night) : rgba(shade(GLASS, env));
      ctx.beginPath();
      ctx.roundRect(x, y, w, wh, u * 0.6);
      ctx.fill();
      if (hash(carId * 31 + bay * 7 + k, 901 + g.seed) > 0.5) continue;
      ctx.fillStyle = rgba(shade(HEAD, env), 0.85);
      ctx.beginPath();
      ctx.arc(x + w * (0.3 + hash(k, carId) * 0.4), y + wh * 0.75, u * 1.3, Math.PI, 0);
      ctx.fill();
    }
  });
}

function drawCar(ctx, g, x0, x1, carId) {
  const { top, bottom, h, u, env, livery } = g;
  ctx.fillStyle = rgba(shade(livery.body, env));
  ctx.beginPath();
  ctx.roundRect(x0, top, x1 - x0, bottom - top, [u * 2, u * 2, 0, 0]);
  ctx.fill();
  ctx.fillStyle = rgba(shade(livery.roof, env));
  ctx.fillRect(x0 + u, top, x1 - x0 - u * 2, h * 0.05);
  ctx.fillStyle = rgba(shade(livery.stripe, env));
  ctx.fillRect(x0, top + h * 0.48, x1 - x0, h * 0.05);
  ctx.fillStyle = rgba(shade(scale(livery.body, 0.75), env));
  DOORS.forEach((f) => ctx.fillRect(x0 + (x1 - x0) * f - u * 1.6, top + h * 0.17, u * 3.2, h * 0.6));
  drawWindows(ctx, g, x0, x1, carId);
}

function drawLoco(ctx, g, x0, x1) {
  const { top, bottom, h, u, env, livery, night } = g;
  const nose = (x1 - x0) * 0.25;
  ctx.fillStyle = rgba(shade(livery.body, env));
  ctx.beginPath();
  ctx.moveTo(x1, top);
  ctx.lineTo(x0 + nose, top);
  ctx.quadraticCurveTo(x0, top + h * 0.05, x0, top + h * 0.45);
  ctx.lineTo(x0, bottom);
  ctx.lineTo(x1, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(shade(GLASS, env));
  ctx.beginPath();
  ctx.moveTo(x0 + nose * 0.35, top + h * 0.12);
  ctx.lineTo(x0 + nose * 1.2, top + h * 0.12);
  ctx.lineTo(x0 + nose * 1.2, top + h * 0.34);
  ctx.lineTo(x0 + u * 0.8, top + h * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(shade(livery.stripe, env));
  ctx.fillRect(x0, top + h * 0.48, x1 - x0, h * 0.05);
  ctx.fillStyle = rgba(HEADLIGHT, 0.5 + 0.5 * night);
  ctx.beginPath();
  ctx.arc(x0 + u * 1.5, top + h * 0.62, u * 1.1, 0, Math.PI * 2);
  ctx.fill();
}

/** Opposing train rushing past on the adjacent track, filling most of the window. */
export function drawPassingTrain(ctx, layout, state, env) {
  const { passing } = state;
  if (!passing) return;
  const { win, px, u } = layout;
  const { nose, tail } = span(layout, state, passing);
  if (tail < win.x - u * 12 || nose > win.x + win.w + u * 12) return;
  const top = win.y + win.h * 0.1;
  const g = {
    u, px, env, top,
    bottom: win.y + win.h + 40,
    h: win.h * 0.95,
    seed: passing.seed % 1000,
    livery: LIVERIES[passing.livery],
    night: smoothstep(0.5, 0.15, env.light),
  };
  ctx.fillStyle = rgba(shade(GAP, env));
  ctx.fillRect(nose + LOCO_LENGTH * px, top + u, tail - nose - LOCO_LENGTH * px, g.bottom - top);
  drawLoco(ctx, g, nose, nose + LOCO_LENGTH * px);
  for (let k = 0; k < passing.cars; k++) {
    const x0 = nose + (LOCO_LENGTH + CAR_GAP + k * (CAR_LENGTH + CAR_GAP)) * px;
    const x1 = x0 + CAR_LENGTH * px;
    if (x1 < win.x - u * 12 || x0 > win.x + win.w + u * 12) continue;
    drawCar(ctx, g, x0, x1, passing.seed + k);
  }
}
