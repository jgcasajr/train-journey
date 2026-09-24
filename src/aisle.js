import { aisleEventAt } from './cabin.js';
import { lit } from './interior.js';
import { passengerOrigin } from './passenger.js';
import { circle, clamp, hex, lerp, rgba, smoothstep } from './utils.js';

const NAVY = hex('#1f2a44');
const GOLD = hex('#c9a227');
const SHIRT = hex('#f1ede4');
const SKIN = hex('#c98f6b');
const HAIR = hex('#2a211c');
const TROUSERS = hex('#20242c');
const VEST = hex('#a8322d');
const STEEL = hex('#9aa0a6');
const STEEL_DARK = hex('#6d7379');
const CUPS = ['#f4f1ea', '#e8c07a', '#7a4a2a'].map(hex);

const LINES = {
  conductor: ['Bilhete, por favor!', 'Obrigado, boa viagem!'],
  cart: ['Café? Pão de queijo?', 'Aqui está, bom apetite!'],
};

/** Screen x of the walker: in from the right, stop beside the passenger, out to the left. */
function walkerX(ev, layout) {
  const { W, u } = layout;
  const stopX = passengerOrigin(layout).x + (ev.kind === 'cart' ? 62 : 36) * u;
  if (ev.phase === 'in') return lerp(W + 40 * u, stopX, smoothstep(0, 1, ev.p));
  if (ev.phase === 'stop') return stopX;
  return lerp(stopX, -60 * u, smoothstep(0, 1, ev.p));
}

function drawLegs(ctx, c, swing) {
  ctx.fillStyle = c(TROUSERS);
  ctx.fillRect(-4.2 + swing, 0, 3.8, 40);
  ctx.fillRect(0.6 - swing, 0, 3.8, 40);
}

/** Person facing left (toward the passenger), origin at the waist, in body units. */
function drawPerson(ctx, c, { jacket, cap, arm, swing }) {
  drawLegs(ctx, c, swing);
  ctx.fillStyle = c(jacket);
  ctx.beginPath();
  ctx.roundRect(-6, -21, 12, 23, 3);
  ctx.fill();
  ctx.fillStyle = c(SHIRT);
  ctx.beginPath();
  ctx.moveTo(-2.2, -21);
  ctx.lineTo(0, -16);
  ctx.lineTo(2.2, -21);
  ctx.fill();
  ctx.fillStyle = c(GOLD);
  [-14, -9, -4].forEach((y) => ctx.fillRect(-0.5, y, 1, 1));
  ctx.strokeStyle = c(jacket);
  ctx.lineWidth = 3.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-4.5, -18);
  ctx.lineTo(arm[0], arm[1]);
  ctx.stroke();
  ctx.fillStyle = c(SKIN);
  ctx.beginPath();
  circle(ctx, arm[0], arm[1], 1.3);
  circle(ctx, 0, -27, 4.2);
  circle(ctx, -4, -27, 0.8);
  ctx.fill();
  ctx.fillStyle = c(HAIR);
  ctx.beginPath();
  circle(ctx, -2.3, -27.8, 0.45);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0.3, -27.4, 4.4, Math.PI * 1.05, Math.PI * 2.35);
  ctx.closePath();
  ctx.fill();
  if (!cap) return;
  ctx.fillStyle = c(NAVY);
  ctx.fillRect(-4.8, -33.5, 9.6, 3.8);
  ctx.fillRect(-7.6, -30.4, 4, 1);
  ctx.fillStyle = c(GOLD);
  ctx.fillRect(-4.8, -30.9, 9.6, 0.7);
}

function drawCart(ctx, c) {
  ctx.fillStyle = c(STEEL);
  ctx.beginPath();
  ctx.roundRect(-32, -9, 20, 40, 1.5);
  ctx.fill();
  ctx.fillStyle = c(STEEL_DARK);
  ctx.fillRect(-31, -4, 18, 0.6);
  ctx.fillRect(-22.4, -4, 0.6, 30);
  ctx.fillRect(-12, -7, 3, 1);
  CUPS.forEach((cup, k) => {
    ctx.fillStyle = c(cup);
    ctx.fillRect(-30 + k * 5.5, -13 - (k === 2 ? 3 : 0), 3.2, 4 + (k === 2 ? 3 : 0));
  });
}

function drawBubble(ctx, text, x, y, u, W) {
  ctx.font = `600 ${u * 2.1}px system-ui, sans-serif`;
  const w = ctx.measureText(text).width + u * 2.4;
  const h = u * 3.8;
  const bx = clamp(x - w / 2, u, W - w - u);
  ctx.fillStyle = 'rgba(250,247,240,0.95)';
  ctx.beginPath();
  ctx.roundRect(bx, y - h, w, h, u * 1.2);
  ctx.moveTo(x - u * 0.8, y - 1);
  ctx.lineTo(x, y + u * 1.2);
  ctx.lineTo(x + u * 0.8, y - 1);
  ctx.fill();
  ctx.fillStyle = '#2a2a2a';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + u * 1.2, y - h / 2);
}

/** Conductor or snack-cart attendant walking along the aisle in the foreground. */
export function drawAisle(ctx, layout, state, L) {
  const ev = aisleEventAt(state.time, state.dayTime);
  if (!ev) return;
  const { H, W, u } = layout;
  const v = u * 1.8;
  const x = walkerX(ev, layout);
  const walking = ev.phase !== 'stop';
  const stride = walking ? Math.sin(state.time * 7) : 0;
  const waist = H * 0.8 + (walking ? Math.abs(stride) * v * 0.4 : 0);
  const c = (color) => rgba(lit(color, L));
  const conductor = ev.kind === 'conductor';
  const reach = conductor && !walking ? [-12, -13] : [-6 + stride * 2, -4];
  ctx.save();
  ctx.translate(x, waist);
  ctx.scale(v, v);
  if (!conductor) drawCart(ctx, c);
  drawPerson(ctx, c, {
    jacket: conductor ? NAVY : VEST,
    cap: conductor,
    arm: conductor ? reach : [-12, -7],
    swing: stride * 2.5,
  });
  ctx.restore();
  if (walking) return;
  drawBubble(ctx, LINES[ev.kind][ev.p < 0.5 ? 0 : 1], x - 2 * v, waist - 36 * v, u, W);
}
