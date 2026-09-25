import { aisleEventAt, beatAt, cupWithStaff } from './cabin.js';
import { lit } from './interior.js';
import { passengerHand, passengerHead, passengerOrigin } from './passenger.js';
import { nextStation } from './stations.js';
import { circle, clamp, hex, lerp, rgba } from './utils.js';

const NAVY = hex('#1f2a44');
const GOLD = hex('#c9a227');
const SHIRT = hex('#f1ede4');
const SKIN = hex('#c98f6b');
const HAIR = hex('#2a211c');
const TROUSERS = hex('#20242c');
const VEST = hex('#a8322d');
const STEEL = hex('#9aa0a6');
const STEEL_DARK = hex('#6d7379');
const CHINA = hex('#efe8dc');
const CUPS = ['#f4f1ea', '#e8c07a', '#7a4a2a'].map(hex);

// Horizontal extent of each walker in body units (the cart trails to the right).
const EXTENT = { conductor: { left: 9, right: 7 }, cart: { left: 9, right: 34 } };
const SHOULDER = [-4.5, -18];
const ARM_REACH = 15; // body units

function greeting(dayTime) {
  if (dayTime >= 0.2 && dayTime < 0.5) return 'Bom dia';
  if (dayTime >= 0.5 && dayTime < 0.75) return 'Boa tarde';
  return 'Boa noite';
}

/** Resolves a script line key into the text actually spoken. */
function lineText(beat, state) {
  if (beat.line === 'offer') return `${greeting(state.dayTime)}! Café? Pão de queijo?`;
  if (beat.line === 'ticket') return `${greeting(state.dayTime)}! Bilhete, por favor.`;
  if (beat.line === 'nextStop') {
    const next = nextStation(state.distance, state.served?.id);
    return next ? `Próxima parada: ${next.name}.` : 'Boa viagem!';
  }
  return beat.line;
}

/**
 * Screen x of the walker: enters from fully off-screen right, eases to a stop beside the
 * passenger, then accelerates gently and leaves fully off-screen left (cart included).
 */
function walkerX(ev, layout, v) {
  const { W, u } = layout;
  const ext = EXTENT[ev.kind];
  const stopX = passengerOrigin(layout).x + (ev.kind === 'cart' ? 40 : 36) * u;
  const startX = W + ext.left * v + u * 4;
  const endX = -ext.right * v - u * 4;
  if (ev.phase === 'in') return lerp(startX, stopX, 1 - (1 - ev.p) ** 2);
  if (ev.phase === 'stop') return stopX;
  return lerp(stopX, endX, ev.p ** 2);
}

/** Converts a screen point into the walker's body units, clamped to arm's reach. */
function reachTo(target, x, waist, v) {
  const local = [(target.x - x) / v, (target.y - waist) / v];
  const dx = local[0] - SHOULDER[0];
  const dy = local[1] - SHOULDER[1];
  const len = Math.hypot(dx, dy);
  const k = len > ARM_REACH ? ARM_REACH / len : 1;
  return [SHOULDER[0] + dx * k, SHOULDER[1] + dy * k];
}

function drawLegs(ctx, c, swing) {
  ctx.fillStyle = c(TROUSERS);
  ctx.fillRect(-4.2 + swing, 0, 3.8, 40);
  ctx.fillRect(0.6 - swing, 0, 3.8, 40);
}

/** Person facing left (toward the passenger), origin at the waist, in body units. */
function drawPerson(ctx, c, { jacket, cap, arm, swing, talking, time }) {
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
  ctx.moveTo(SHOULDER[0], SHOULDER[1]);
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
  ctx.arc(0.6, -28.2, 4.4, Math.PI * 1.2, Math.PI * 2.3);
  ctx.closePath();
  ctx.fill();
  const open = talking ? Math.abs(Math.sin(time * 11)) : 0;
  ctx.fillStyle = c(hex('#5a2a22'));
  ctx.beginPath();
  ctx.ellipse(-2.9, -24.7, 0.6, 0.12 + open * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!cap) return;
  ctx.fillStyle = c(NAVY);
  ctx.fillRect(-4.8, -33.5, 9.6, 3.8);
  ctx.fillRect(-7.6, -30.4, 4, 1);
  ctx.fillStyle = c(GOLD);
  ctx.fillRect(-4.8, -30.9, 9.6, 0.7);
}

/** Trolley pulled behind the attendant (to his right), with cups and a coffee pot on top. */
function drawCart(ctx, c) {
  ctx.fillStyle = c(STEEL);
  ctx.beginPath();
  ctx.roundRect(12, -9, 20, 40, 1.5);
  ctx.fill();
  ctx.fillStyle = c(STEEL_DARK);
  ctx.fillRect(13, -4, 18, 0.6);
  ctx.fillRect(21.7, -4, 0.6, 30);
  ctx.fillRect(9, -8, 3.2, 1);
  CUPS.forEach((cup, k) => {
    ctx.fillStyle = c(cup);
    ctx.fillRect(14 + k * 5.5, -13 - (k === 2 ? 3 : 0), 3.2, 4 + (k === 2 ? 3 : 0));
  });
}

function drawHandCup(ctx, c, [x, y]) {
  ctx.fillStyle = c(CHINA);
  ctx.beginPath();
  ctx.moveTo(x - 1.3, y - 2.6);
  ctx.lineTo(x + 1.3, y - 2.6);
  ctx.lineTo(x + 1, y);
  ctx.lineTo(x - 1, y);
  ctx.closePath();
  ctx.fill();
}

function drawBubble(ctx, text, anchor, u, W, tone) {
  ctx.font = `600 ${u * 2.1}px system-ui, sans-serif`;
  const w = ctx.measureText(text).width + u * 2.4;
  const h = u * 3.8;
  const bx = clamp(anchor.x - w / 2, u, W - w - u);
  const by = Math.max(u, anchor.y - h);
  const tailX = clamp(anchor.x, bx + u * 1.5, bx + w - u * 1.5);
  ctx.fillStyle = tone === 'passenger' ? 'rgba(255,244,222,0.96)' : 'rgba(250,247,240,0.96)';
  ctx.beginPath();
  ctx.roundRect(bx, by, w, h, u * 1.2);
  ctx.moveTo(tailX - u * 0.8, by + h - 1);
  ctx.lineTo(tailX, by + h + u * 1.2);
  ctx.lineTo(tailX + u * 0.8, by + h - 1);
  ctx.fill();
  ctx.fillStyle = '#2a2a2a';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + u * 1.2, by + h / 2);
}

/** Arm target for the current beat: offering, handing over the cup, punching the ticket, waving. */
function staffArm(ev, beat, layout, x, waist, v, time) {
  const conductor = ev.kind === 'conductor';
  if (ev.phase !== 'stop') {
    return conductor ? [-6 + Math.sin(time * 7) * 2, -4] : [10, -8]; // swing, or hold the trolley
  }
  if (beat?.action === 'serve' && cupWithStaff(ev)) return reachTo(passengerHand(layout, 'receive'), x, waist, v);
  if (beat?.action === 'serve') return [-9, -12]; // cup handed over: hand back, palm open
  if (beat?.action === 'punch') return reachTo(passengerHand(layout, 'ticket'), x, waist, v);
  if (beat?.action === 'wave' && beat.who === 'staff') return [-7 + Math.sin(time * 9) * 1.5, -33];
  if (beat?.line === 'offer') return [-11, -16]; // open-hand gesture toward her
  return conductor ? [-7, -6] : [10, -8];
}

/** Conductor or snack-cart attendant visiting the passenger, with a short dialogue. */
export function drawAisle(ctx, layout, state, L) {
  const ev = aisleEventAt(state.time, state.dayTime);
  if (!ev) return;
  const { H, W, u } = layout;
  const v = u * 1.8;
  const x = walkerX(ev, layout, v);
  const walking = ev.phase !== 'stop';
  const stride = walking ? Math.sin(state.time * 7) : 0;
  const waist = H * 0.8 + (walking ? Math.abs(stride) * v * 0.4 : 0);
  const c = (color) => rgba(lit(color, L));
  const beat = beatAt(ev);
  const arm = staffArm(ev, beat, layout, x, waist, v, state.time);
  ctx.save();
  ctx.translate(x, waist);
  ctx.scale(v, v);
  if (ev.kind === 'cart') drawCart(ctx, c);
  drawPerson(ctx, c, {
    jacket: ev.kind === 'conductor' ? NAVY : VEST,
    cap: ev.kind === 'conductor',
    arm,
    swing: stride * 2.5,
    talking: beat?.who === 'staff',
    time: state.time,
  });
  if (cupWithStaff(ev)) drawHandCup(ctx, c, arm);
  ctx.restore();
  if (!beat) return;
  const text = lineText(beat, state);
  if (beat.who === 'staff') drawBubble(ctx, text, { x: x - 2 * v, y: waist - 35 * v }, u, W, 'staff');
  else drawBubble(ctx, text, passengerHead(layout), u, W, 'passenger');
}
