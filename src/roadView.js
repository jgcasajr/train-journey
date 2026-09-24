import { biomeAt } from './biomes.js';
import { trackX } from './frame.js';
import { forEachSegment, layerFrame } from './layers.js';
import { CROSSING_WIDTH, carsBetween, crossingsBetween, roadAt } from './roads.js';
import { shade } from './sky.js';
import { circle, hash, hex, mix, radialGlow, rgba, scale, smoothstep } from './utils.js';

export const ROAD_DEPTH = 0.45;
const ROAD_SEGMENT = 20; // meters per drawn road piece
const ASPHALT = hex('#4a4b4d');
const LINE = hex('#e8e2cf');
const CAR_COLORS = ['#c0392b', '#2e86c1', '#f4f1ea', '#1c1f24', '#27ae60', '#f1c40f', '#8e8e93'].map(hex);
const GLASS = hex('#2b3440');
const TIRE = hex('#141414');
const HEADLIGHT = hex('#fff1c4');
const TAIL = hex('#ff3b30');
const RED = hex('#d62d20');
const WHITE = hex('#f4f1ea');
const POST = hex('#3a3d42');

const nightness = (env) => smoothstep(0.5, 0.15, env.light);
const roadY = ({ win, horizon }) => ({ top: horizon + win.h * 0.265, bottom: horizon + win.h * 0.3 });

function drawSideCar(ctx, x, y, u, car, env, night) {
  const truck = hash(car.id, 1101) < 0.2;
  const len = u * (truck ? 7.5 : 4.2);
  const h = u * (truck ? 2.4 : 1.4);
  const body = rgba(shade(CAR_COLORS[Math.floor(hash(car.id, 1102) * CAR_COLORS.length)], env));
  const front = car.dir > 0 ? x + len / 2 : x - len / 2;
  const back = car.dir > 0 ? x - len / 2 : x + len / 2;
  ctx.fillStyle = body;
  if (truck) {
    const cab = u * 1.8;
    const gap = u * 0.2;
    ctx.fillRect(car.dir > 0 ? front - cab : front, y - h * 0.75, cab, h * 0.75);
    ctx.fillStyle = rgba(shade(WHITE, env));
    ctx.fillRect(car.dir > 0 ? back : front + cab + gap, y - h, len - cab - gap, h);
  } else {
    ctx.beginPath();
    ctx.roundRect(x - len / 2, y - h * 0.55, len, h * 0.45, u * 0.3);
    ctx.roundRect(x - len * 0.28 - car.dir * len * 0.05, y - h, len * 0.5, h * 0.5, u * 0.35);
    ctx.fill();
    ctx.fillStyle = rgba(shade(GLASS, env));
    ctx.fillRect(x - len * 0.22 - car.dir * len * 0.05, y - h * 0.9, len * 0.38, h * 0.32);
  }
  ctx.fillStyle = rgba(shade(TIRE, env));
  ctx.beginPath();
  [-0.3, 0.3].forEach((f) => circle(ctx, x + len * f, y - u * 0.1, u * 0.45));
  ctx.fill();
  if (night < 0.05) return;
  radialGlow(ctx, front + car.dir * u * 2, y - h * 0.35, u * 3.5, HEADLIGHT, 0.55 * night);
  ctx.fillStyle = rgba(TAIL, night);
  ctx.fillRect(back - u * 0.2, y - h * 0.45, u * 0.4, u * 0.3);
}

/** Road parallel to the track (between the fields and the trackside bushes) with traffic. */
export function drawParallelRoad(ctx, layout, state, env) {
  const { win, u } = layout;
  const lf = layerFrame(layout, state, ROAD_DEPTH);
  const { top, bottom } = roadY(layout);
  const seg = ROAD_SEGMENT * lf.px;
  const asphalt = rgba(shade(ASPHALT, env));
  const line = rgba(shade(LINE, env), 0.8);
  forEachSegment(win, lf, seg, (i, wx0, x0) => {
    if (!roadAt((wx0 + seg / 2) / lf.px)) return;
    ctx.fillStyle = asphalt;
    ctx.fillRect(x0 - 0.5, top, seg + 1, bottom - top);
    ctx.fillStyle = line;
    ctx.fillRect(x0 - 0.5, top + 1, seg + 1, Math.max(1, u * 0.12));
    ctx.fillRect(x0 + seg * 0.2, (top + bottom) / 2, seg * 0.35, Math.max(1, u * 0.14));
  });
  const m0 = (lf.offset - lf.margin) / lf.px;
  const m1 = (lf.offset + win.w + lf.margin) / lf.px;
  const night = nightness(env);
  carsBetween(m0, m1, state.time).forEach((car) => {
    const x = win.x + car.m * lf.px - lf.offset;
    const y = car.lane === 0 ? bottom - u * 0.2 : (top + bottom) / 2 - u * 0.1;
    drawSideCar(ctx, x, y, u, car, env, night);
  });
}

function drawFrontCar(ctx, x, y, w, id, env, night) {
  const h = w * 0.55;
  ctx.fillStyle = rgba(shade(CAR_COLORS[Math.floor(hash(id, 1111) * CAR_COLORS.length)], env));
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h * 0.6, w, h * 0.6, w * 0.08);
  ctx.roundRect(x - w * 0.36, y - h, w * 0.72, h * 0.45, w * 0.1);
  ctx.fill();
  ctx.fillStyle = rgba(shade(GLASS, env));
  ctx.fillRect(x - w * 0.3, y - h * 0.92, w * 0.6, h * 0.32);
  const lights = [x - w * 0.34, x + w * 0.34];
  if (night > 0.05) lights.forEach((lx) => radialGlow(ctx, lx, y - h * 0.35, w * 0.45, HEADLIGHT, 0.6 * night));
  ctx.fillStyle = night > 0.05 ? rgba(HEADLIGHT) : rgba(shade(scale(WHITE, 0.85), env));
  ctx.beginPath();
  lights.forEach((lx) => circle(ctx, lx, y - h * 0.35, w * 0.07));
  ctx.fill();
}

/**
 * The crossing road runs away from the track, so on each terrain layer it shows up as a
 * strip at the crossing's track position (like the rivers). Cars wait on the nearest strip.
 */
export function drawCrossingBand(ctx, layout, state, lf, heightAt, env, { haze, waitingCars }) {
  const { win } = layout;
  const bottom = win.y + win.h + 40;
  const m1 = (lf.offset + win.w + lf.margin) / lf.px;
  crossingsBetween((lf.offset - lf.margin) / lf.px - 20, m1 + 20).forEach((c) => {
    const x0 = win.x + c.at * lf.px - lf.offset;
    const x1 = win.x + c.end * lf.px - lf.offset;
    const mid = (c.at + c.end) / 2;
    const surface = heightAt(mid * lf.px, biomeAt(mid));
    ctx.fillStyle = rgba(shade(ASPHALT, env, haze));
    ctx.fillRect(x0, surface, x1 - x0, bottom - surface);
    ctx.fillStyle = rgba(shade(LINE, env, haze), 0.7);
    ctx.fillRect((x0 + x1) / 2 - 0.5, surface, 1, bottom - surface);
    if (!waitingCars) return;
    // Queue facing the track, stopped just before the parallel road; farther cars sit higher.
    const { top } = roadY(layout);
    const count = 1 + Math.floor(hash(c.id, 1112) * 3);
    for (let k = count - 1; k >= 0; k--) {
      const cw = layout.u * 3.2 * (1 - k * 0.15);
      const y = top - layout.u * 0.3 - k * cw * 0.5;
      if (y < surface + cw * 0.3) continue;
      drawFrontCar(ctx, x0 + (x1 - x0) * 0.7, y, cw, c.id * 5 + k, env, nightness(env));
    }
  });
}

function drawCrossbuck(ctx, x, y, u, env) {
  ctx.strokeStyle = rgba(shade(WHITE, env));
  ctx.lineWidth = u * 0.7;
  ctx.beginPath();
  ctx.moveTo(x - u * 2.2, y - u * 1.2);
  ctx.lineTo(x + u * 2.2, y + u * 1.2);
  ctx.moveTo(x + u * 2.2, y - u * 1.2);
  ctx.lineTo(x - u * 2.2, y + u * 1.2);
  ctx.stroke();
  ctx.strokeStyle = rgba(shade(RED, env));
  ctx.lineWidth = u * 0.25;
  ctx.stroke();
}

/** Trackside view of a level crossing: road under the track, lowered barrier, flashing lights. */
export function drawCrossingGates(ctx, layout, state, env) {
  const { win, u, px } = layout;
  const toX = trackX(layout, state);
  const deckTop = win.y + win.h * 0.86;
  const bottom = win.y + win.h + 40;
  crossingsBetween(state.distance - 30, state.distance + win.w / px + 30).forEach((c) => {
    const x0 = toX(c.at);
    const x1 = toX(c.end);
    ctx.fillStyle = rgba(shade(ASPHALT, env));
    ctx.fillRect(x0, deckTop, x1 - x0, bottom - deckTop);
    const postX = x1 + u * 3;
    const armY = win.y + win.h * 0.72;
    ctx.fillStyle = rgba(shade(POST, env));
    ctx.fillRect(postX - u * 0.5, win.y + win.h * 0.4, u, bottom - win.y - win.h * 0.4);
    const armLen = x1 - x0 + u * 4;
    const stripe = armLen / 8;
    // Reflective stripes stay readable at night, lit by the crossing's own lamps.
    const reflective = (c) => rgba(mix(shade(c, env), scale(c, 0.6), nightness(env) * 0.7));
    for (let k = 0; k < 8; k++) {
      ctx.fillStyle = reflective(k % 2 ? WHITE : RED);
      ctx.fillRect(postX - (k + 1) * stripe, armY - u * 0.45, stripe, u * 0.9);
    }
    drawCrossbuck(ctx, postX, win.y + win.h * 0.44, u, env);
    const phase = Math.floor(state.time * 2) % 2;
    [-1, 1].forEach((side, k) => {
      const lx = postX + side * u * 1.6;
      const ly = win.y + win.h * 0.53;
      ctx.fillStyle = rgba(shade(POST, env));
      ctx.beginPath();
      ctx.arc(lx, ly, u * 1.1, 0, Math.PI * 2);
      ctx.fill();
      if (k !== phase) return;
      radialGlow(ctx, lx, ly, u * 4, RED, 0.6);
      ctx.fillStyle = rgba(RED);
      ctx.beginPath();
      ctx.arc(lx, ly, u * 0.8, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}
