import { lit } from './interior.js';
import { circle, hex, mix, rgba } from './utils.js';

const SKIN = hex('#d8a07c');
const HAIR = hex('#2e1d14');
const SWEATER = hex('#c07a36');
const PANTS = hex('#2c3750');
const SEAT = hex('#6e1f2c');
const SEAT_BASE = hex('#4a121b');
const COVER = hex('#e9e2d2');
const WHITE = hex('#ffffff');

// All shapes below are in passenger units (1 unit = layout.u), origin at the hip on the seat.

function drawSeat(ctx, L) {
  ctx.fillStyle = rgba(lit(SEAT, L));
  ctx.beginPath();
  ctx.roundRect(-15, -52, 9, 56, 3);
  ctx.roundRect(-16, -60, 11, 11, 3);
  ctx.roundRect(-15, 0, 32, 8, 2.5);
  ctx.fill();
  ctx.fillStyle = rgba(lit(SEAT_BASE, L));
  ctx.fillRect(-15, 6, 32, 60);
  ctx.fillStyle = rgba(lit(COVER, L));
  ctx.beginPath();
  ctx.roundRect(-15.5, -59, 10, 6, 2);
  ctx.fill();
}

function drawLegs(ctx, L) {
  ctx.strokeStyle = rgba(lit(PANTS, L));
  ctx.lineCap = 'round';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(-2, -3);
  ctx.lineTo(17, -2);
  ctx.stroke();
  ctx.lineWidth = 7.5;
  ctx.beginPath();
  ctx.moveTo(17, -2);
  ctx.lineTo(19, 30);
  ctx.stroke();
}

function torsoPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.bezierCurveTo(-8, -12, -8, -24, -4, -31);
  ctx.bezierCurveTo(-2, -35, 3, -35, 5, -32);
  ctx.bezierCurveTo(8, -26, 9, -14, 8, -6);
  ctx.bezierCurveTo(7, -2, 5, 0, 2, 1);
  ctx.closePath();
}

function drawTorso(ctx, L, rim) {
  torsoPath(ctx);
  ctx.fillStyle = rgba(lit(SWEATER, L));
  ctx.fill();
  ctx.strokeStyle = rim;
  ctx.lineWidth = 0.6;
  ctx.stroke();
}

/** Head turned toward the window: we mostly see hair, an ear and a sliver of cheek. */
function drawHead(ctx, L, nod, rim) {
  ctx.save();
  ctx.translate(1.4, -42 + nod * 0.2);
  ctx.rotate(nod * 0.02);
  ctx.fillStyle = rgba(lit(SKIN, L));
  ctx.fillRect(-1.8, 3, 3.6, 5);
  ctx.beginPath();
  ctx.arc(0, 0, 6.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(lit(HAIR, L));
  ctx.beginPath();
  ctx.arc(-0.2, -0.6, 6.7, Math.PI * 0.62, Math.PI * 1.95);
  ctx.closePath();
  circle(ctx, -5.2, -3.2, 2.4);
  ctx.fill();
  ctx.fillStyle = rgba(mix(lit(SKIN, L), lit(HAIR, L), 0.25));
  ctx.beginPath();
  ctx.ellipse(1.2, 0.8, 1, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rim;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(-0.2, -0.6, 6.8, Math.PI * 1.05, Math.PI * 2.1);
  ctx.stroke();
  ctx.restore();
}

function drawArm(ctx, L) {
  ctx.strokeStyle = rgba(mix(lit(SWEATER, L), [0, 0, 0], 0.15));
  ctx.lineWidth = 4.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-2, -29);
  ctx.quadraticCurveTo(-1.5, -16, 1, -13);
  ctx.lineTo(11, -8);
  ctx.stroke();
  ctx.fillStyle = rgba(lit(SKIN, L));
  ctx.beginPath();
  ctx.arc(12.6, -7.6, 1.7, 0, Math.PI * 2);
  ctx.fill();
}

export function drawPassenger(ctx, layout, state, L, env, bob) {
  const { win, u } = layout;
  const hipY = win.y + win.h * 0.62 + 42 * u;
  const breath = Math.sin(state.time * 1.3) * 0.3;
  const nod = Math.sin(state.time * 0.7) * 0.4 + bob / u;
  const rim = rgba(mix(env.bottom, WHITE, 0.3), 0.1 + 0.35 * L.daylight);
  ctx.save();
  ctx.translate(win.x + win.w * 0.12, hipY + bob * 0.4);
  ctx.scale(u, u);
  drawSeat(ctx, L);
  drawLegs(ctx, L);
  ctx.translate(0, -breath);
  drawTorso(ctx, L, rim);
  drawHead(ctx, L, nod, rim);
  drawArm(ctx, L);
  ctx.restore();
}
