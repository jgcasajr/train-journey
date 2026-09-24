import { lit } from './interior.js';
import { circle, clamp, hex, mix, rgba } from './utils.js';

const SKIN = hex('#d8a07c');
const HAIR = hex('#2e1d14');
const SWEATER = hex('#c07a36');
const PANTS = hex('#2c3750');
const SEAT = hex('#6e1f2c');
const SEAT_BASE = hex('#4a121b');
const COVER = hex('#e9e2d2');
const WHITE = hex('#ffffff');
const BOOK = hex('#2f4f6f');
const PAGE = hex('#f3ecd8');
const CHINA = hex('#efe8dc');
const TICKET = hex('#f6e7b0');

// Hand/elbow positions (passenger units) for each pose; "lap" is the resting pose.
const HANDS = {
  lap: { hand: [12.6, -7.6], elbow: [1, -13] },
  read: { hand: [10, -23], elbow: [4, -14] },
  sip: { hand: [7.4, -37.5], elbow: [10, -24] },
  ticket: { hand: [17, -33], elbow: [9, -26] },
};

/** Screen position of the passenger's hip (origin of the passenger's unit space). */
export const passengerOrigin = ({ win, u }) => ({ x: win.x + win.w * 0.12, y: win.y + win.h * 0.62 + 42 * u });

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

function drawTorso(ctx, L, rim) {
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.bezierCurveTo(-8, -12, -8, -24, -4, -31);
  ctx.bezierCurveTo(-2, -35, 3, -35, 5, -32);
  ctx.bezierCurveTo(8, -26, 9, -14, 8, -6);
  ctx.bezierCurveTo(7, -2, 5, 0, 2, 1);
  ctx.closePath();
  ctx.fillStyle = rgba(lit(SWEATER, L));
  ctx.fill();
  ctx.strokeStyle = rim;
  ctx.lineWidth = 0.6;
  ctx.stroke();
}

/** Head turned toward the window: we mostly see hair, an ear and a sliver of cheek. */
function drawHead(ctx, L, head, rim) {
  ctx.save();
  ctx.translate(1.4 + head.dx, -42 + head.dy);
  ctx.rotate(head.tilt);
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

/** Blends the resting arm toward each active pose by its weight. */
function armPose(pose) {
  const active = ['read', 'sip', 'ticket'];
  const sum = active.reduce((s, k) => s + pose[k], 0);
  const weight = (k) => (sum > 1 ? pose[k] / sum : pose[k]);
  const blend = (part, axis) => active.reduce(
    (v, k) => v + (HANDS[k][part][axis] - HANDS.lap[part][axis]) * weight(k),
    HANDS.lap[part][axis],
  );
  return { hand: [blend('hand', 0), blend('hand', 1)], elbow: [blend('elbow', 0), blend('elbow', 1)] };
}

function drawBook(ctx, L, [x, y], amount) {
  ctx.save();
  ctx.globalAlpha = clamp(amount * 1.5);
  ctx.translate(x + 1.5, y - 1);
  ctx.rotate(-0.5);
  ctx.fillStyle = rgba(lit(BOOK, L));
  ctx.fillRect(-0.5, -4.5, 1.2, 9);
  ctx.fillStyle = rgba(lit(PAGE, L));
  ctx.beginPath();
  ctx.moveTo(0.6, -4.2);
  ctx.lineTo(3.6, -3.6);
  ctx.lineTo(3.6, 4.4);
  ctx.lineTo(0.6, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHeldCup(ctx, L, [x, y], amount) {
  ctx.save();
  ctx.globalAlpha = clamp((amount - 0.3) * 2);
  ctx.fillStyle = rgba(lit(CHINA, L));
  ctx.beginPath();
  ctx.moveTo(x - 0.4, y - 2.6);
  ctx.lineTo(x + 3, y - 2.2);
  ctx.lineTo(x + 2.6, y + 1.2);
  ctx.lineTo(x, y + 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawTicket(ctx, L, [x, y], amount) {
  ctx.save();
  ctx.globalAlpha = clamp((amount - 0.3) * 2);
  ctx.translate(x + 1.5, y - 1.5);
  ctx.rotate(-0.25);
  ctx.fillStyle = rgba(lit(TICKET, L));
  ctx.fillRect(-1, -1.6, 4.4, 2.8);
  ctx.restore();
}

function drawArm(ctx, L, pose) {
  const { hand, elbow } = armPose(pose);
  if (pose.read > 0.2) drawBook(ctx, L, hand, pose.read);
  ctx.strokeStyle = rgba(mix(lit(SWEATER, L), [0, 0, 0], 0.15));
  ctx.lineWidth = 4.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-2, -29);
  ctx.quadraticCurveTo(-1.5, (elbow[1] - 29) / 2, elbow[0], elbow[1]);
  ctx.lineTo(hand[0] - 1.6, hand[1] + 0.4);
  ctx.stroke();
  if (pose.sip > 0.3) drawHeldCup(ctx, L, hand, pose.sip);
  if (pose.ticket > 0.3) drawTicket(ctx, L, hand, pose.ticket);
  ctx.fillStyle = rgba(lit(SKIN, L));
  ctx.beginPath();
  ctx.arc(hand[0], hand[1], 1.7, 0, Math.PI * 2);
  ctx.fill();
}

function drawZzz(ctx, time, amount) {
  if (amount < 0.6) return;
  ctx.fillStyle = `rgba(240,240,255,${(amount - 0.6) * 2})`;
  ctx.textAlign = 'center';
  [0, 1, 2].forEach((k) => {
    const t = (time * 0.4 + k / 3) % 1;
    ctx.globalAlpha = 1 - t;
    ctx.font = `600 ${2 + t * 2.5}px system-ui, sans-serif`;
    ctx.fillText('z', -4 + t * 6, -52 - t * 10);
  });
  ctx.globalAlpha = 1;
}

export function drawPassenger(ctx, layout, state, L, env, bob) {
  const { u } = layout;
  const { pose } = state;
  const origin = passengerOrigin(layout);
  const breath = Math.sin(state.time * (pose.sleep > 0.5 ? 0.8 : 1.3)) * 0.3;
  const nod = (Math.sin(state.time * 0.7) * 0.4 + bob / u) * (1 - pose.sleep);
  const head = {
    tilt: nod * 0.02 + pose.read * 0.22 - pose.sleep * 0.32 - pose.sip * 0.12,
    dx: -pose.sleep * 1.4,
    dy: nod * 0.2 + pose.read * 0.8 + pose.sleep * 0.6,
  };
  const rim = rgba(mix(env.bottom, WHITE, 0.3), 0.1 + 0.35 * L.daylight);
  ctx.save();
  ctx.translate(origin.x, origin.y + bob * 0.4);
  ctx.scale(u, u);
  drawSeat(ctx, L);
  drawLegs(ctx, L);
  ctx.translate(0, -breath);
  drawTorso(ctx, L, rim);
  drawHead(ctx, L, head, rim);
  drawArm(ctx, L, pose);
  drawZzz(ctx, state.time, pose.sleep);
  ctx.restore();
}

/**
 * Her face reflected in the glass when it is dark outside (night or tunnel):
 * a soft front view, eyes closed when she is asleep, eyes down when reading.
 */
export function drawReflection(ctx, layout, state, L) {
  const strength = (1 - L.daylight) * 0.22;
  if (strength < 0.01) return;
  const { u } = layout;
  const { pose } = state;
  const origin = passengerOrigin(layout);
  ctx.save();
  ctx.globalAlpha = strength;
  ctx.translate(origin.x + 16 * u, origin.y - 40 * u);
  ctx.scale(u * 0.9, u * 0.9);
  ctx.rotate(pose.sleep * 0.25);
  ctx.fillStyle = rgba(lit(SWEATER, L));
  ctx.beginPath();
  ctx.moveTo(-9, 16);
  ctx.quadraticCurveTo(-8, 7, 0, 7);
  ctx.quadraticCurveTo(8, 7, 9, 16);
  ctx.fill();
  ctx.fillStyle = rgba(lit(SKIN, L));
  ctx.beginPath();
  ctx.ellipse(0, 0, 5.4, 6.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(lit(HAIR, L));
  ctx.beginPath();
  ctx.arc(0, -0.8, 6.3, Math.PI * 1.02, Math.PI * 1.98);
  ctx.quadraticCurveTo(6.2, 3, 5, 5);
  ctx.lineTo(5.6, -1);
  ctx.moveTo(-5.6, -1);
  ctx.lineTo(-5, 5);
  ctx.quadraticCurveTo(-6.2, 3, -6.3, -0.8);
  ctx.fill();
  circle(ctx, 5.8, -4.5, 2.2);
  ctx.fill();
  const eyesY = 0.4 + pose.read * 0.8;
  ctx.strokeStyle = rgba(lit(HAIR, L));
  ctx.fillStyle = rgba(lit(HAIR, L));
  ctx.lineWidth = 0.5;
  [-2, 2].forEach((ex) => {
    ctx.beginPath();
    if (pose.sleep > 0.5 || pose.read > 0.5) {
      ctx.arc(ex, eyesY, 0.9, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else {
      ctx.arc(ex, eyesY, 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.restore();
}
