import { biomeAt, num } from './biomes.js';
import { bridgeAt } from './rivers.js';
import { shade } from './sky.js';
import { tunnelsBetween } from './tunnel.js';
import { onViaduct } from './viaduct.js';
import { clamp, hash, hex, lerp, rgba, scale } from './utils.js';

// Bella: a German Shepherd who runs alongside the train now and then (in memory of a dear friend).

const PERIOD = 150; // seconds between chances to see her
const SECONDS = 26; // how long she runs alongside
const FIRST = 25; // the first run comes early in the trip
const GALLOP_HZ = 2.3;
const TAN = hex('#c98d4f');
const TAN_LIGHT = hex('#e3b37c');
const SADDLE = hex('#2b231d');
const MASK = hex('#1e1915');
const MUZZLE = hex('#4a3524');
const COLLAR = hex('#d23c5a');
const TONGUE = hex('#e2687a');
const HEART = hex('#ff5c8a');

const GREETINGS = ['Olha a Bella! Corre, Bella!', 'Bella! Você veio me acompanhar?', 'Vai, Bella! Mais rápido que o trem!', 'Minha Bella... sempre do meu lado.'];
export const PETS = ['Boa menina, Bella!', 'Te amo, Bella!', 'Quem é a cachorra mais linda? A Bella!'];

/** The run of this period, if any: { k, t } with t = seconds since she showed up. */
function episode(time, first = FIRST) {
  const k = Math.floor(time / PERIOD);
  if (k > 0 && hash(k, 4101) > 0.75) return null;
  const start = k === 0 ? first : k * PERIOD + hash(k, 4102) * (PERIOD - SECONDS);
  const t = time - start;
  return t >= 0 && t <= SECONDS ? { k, t } : null;
}

const LOOKAHEAD = 300; // meters checked ahead for tunnels, bridges and viaducts
const blocked = (m) => onViaduct(m) || bridgeAt(m) || tunnelsBetween(m, m).length > 0;

/** Meters to the next stretch she can't run on (tunnel, bridge, viaduct), up to LOOKAHEAD. */
function clearAhead(d) {
  for (let m = -25; m <= LOOKAHEAD; m += 25) if (blocked(d + m)) return Math.max(0, m);
  return LOOKAHEAD;
}

/**
 * How visible she is (0..1): she fades away, instead of vanishing, as the train slows to a
 * stop, nears a tunnel, bridge or viaduct, or enters a town.
 */
function visibility(state) {
  if (state.dwell > 0) return 0;
  const town = clamp((0.6 - num(biomeAt(state.distance), 'city')) / 0.2);
  return Math.min(clamp((state.speed - 1.5) / 3), clamp((clearAhead(state.distance) - 60) / 150), town);
}

/** Bella's run right now ({ k, t, alpha }), or null. Pure function of the state; `state.bellaFirst` (from ?bella) brings her first run forward. */
export function bellaAt(state) {
  const ep = episode(state.time, state.bellaFirst);
  if (!ep) return null;
  const alpha = visibility(state);
  return alpha > 0 ? { ...ep, alpha } : null;
}

const easeOut = (p) => 1 - (1 - p) ** 2;
const middle = (t) => 0.35 + 0.12 * Math.sin((t - 5) * 0.45);

/** Fraction across the window: catches up from behind, keeps pace, then falls back. */
function across(t) {
  if (t < 5) return lerp(-0.2, middle(5), easeOut(t / 5));
  if (t > SECONDS - 5) return lerp(middle(SECONDS - 5), -0.25, ((t - SECONDS + 5) / 5) ** 2);
  return middle(t);
}

/** Where she is in the outside view: ground point and size, or null. */
export function bellaPlace(layout, state) {
  const run = bellaAt(state);
  if (!run) return null;
  const { win } = layout;
  return { x: win.x + across(run.t) * win.w, y: win.y + win.h * 0.97, s: win.h * 0.17, run };
}

/** Click box around her (outside-view coordinates). */
export function bellaBox(layout, state) {
  const p = bellaPlace(layout, state);
  return p && p.run.alpha > 0.5 && { x: p.x - p.s * 0.8, y: p.y - p.s * 0.95, w: p.s * 1.55, h: p.s * 0.95 };
}

/** She greets Bella a moment after she shows up (unless asleep or already talking). */
export function bellaGreeting(prev, next) {
  const before = bellaAt(prev)?.t ?? -1;
  const run = bellaAt(next);
  if (!run || run.alpha < 0.8 || before >= 3 || run.t < 3 || next.speech || (next.pose?.sleep ?? 0) > 0.5) return {};
  return { speech: { text: GREETINGS[run.k % GREETINGS.length], until: next.time + 3.5 }, bellaRuns: (next.bellaRuns ?? 0) + 1 };
}

/** One leg from the hip/shoulder: two segments with angles measured from straight down (+ = forward). */
function leg(ctx, x, y, a1, a2, len) {
  const kx = x + Math.sin(a1) * len;
  const ky = y + Math.cos(a1) * len;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(kx, ky);
  ctx.lineTo(kx + Math.sin(a2) * len, ky + Math.cos(a2) * len);
  ctx.stroke();
}

/** Rotary gallop: front legs reach and fold, hind legs push with the hock bent. */
function drawLegs(ctx, x, by, s, ph, far) {
  const off = far ? 0.55 : 0;
  const len = s * 0.25;
  const fa = 0.6 * Math.sin(ph + off);
  leg(ctx, x + s * 0.27, by + s * 0.05, fa, fa - 1.1 * Math.max(0, Math.cos(ph + off)), len);
  const ha = 0.55 * Math.sin(ph + Math.PI * 0.9 + off);
  leg(ctx, x - s * 0.3, by + s * 0.02, ha + 0.35, ha - 0.45 - 0.5 * Math.max(0, Math.cos(ph + Math.PI * 0.9 + off)), len);
}

function drawHead(ctx, hx, hy, s, ph, c) {
  ctx.fillStyle = c(SADDLE);
  [-0.09, -0.02].forEach((o) => {
    ctx.beginPath();
    ctx.moveTo(hx + o * s - s * 0.04, hy - s * 0.04);
    ctx.lineTo(hx + o * s, hy - s * 0.21);
    ctx.lineTo(hx + o * s + s * 0.05, hy - s * 0.05);
    ctx.fill();
  });
  ctx.fillStyle = c(TAN);
  ctx.beginPath();
  ctx.ellipse(hx, hy, s * 0.12, s * 0.09, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c(MUZZLE);
  ctx.beginPath();
  ctx.ellipse(hx + s * 0.13, hy + s * 0.035, s * 0.1, s * 0.042, 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c(MASK);
  ctx.beginPath();
  ctx.arc(hx + s * 0.225, hy + s * 0.05, s * 0.025, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c(TONGUE);
  ctx.beginPath();
  ctx.ellipse(hx + s * 0.12, hy + s * (0.09 + 0.012 * Math.sin(ph * 2)), s * 0.035, s * 0.022, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c(MASK);
  ctx.beginPath();
  ctx.arc(hx + s * 0.03, hy - s * 0.025, Math.max(1, s * 0.016), 0, Math.PI * 2);
  ctx.fill();
}

function drawTail(ctx, x, by, s, ph, c) {
  const sway = Math.sin(ph) * s * 0.05;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(x - s * 0.36, by - s * 0.05);
    ctx.quadraticCurveTo(x - s * 0.6, by, x - s * 0.72, by + s * 0.14 + sway);
  };
  ctx.lineCap = 'round';
  ctx.strokeStyle = c(TAN);
  ctx.lineWidth = s * 0.11;
  path();
  ctx.stroke();
  ctx.strokeStyle = c(SADDLE);
  ctx.lineWidth = s * 0.06;
  ctx.save();
  ctx.translate(0, -s * 0.02);
  path();
  ctx.stroke();
  ctx.restore();
}

/** A German Shepherd galloping to the right: tan with a black saddle, ears up, tongue out. */
export function drawShepherd(ctx, x, ground, s, time, env) {
  const c = (col) => rgba(shade(col, env, 0.04));
  const ph = time * Math.PI * 2 * GALLOP_HZ;
  const by = ground - s * 0.55 - s * 0.04 * Math.abs(Math.sin(ph));
  ctx.lineCap = 'round';
  ctx.lineWidth = s * 0.075;
  ctx.strokeStyle = rgba(shade(scale(TAN, 0.72), env, 0.04));
  drawLegs(ctx, x, by, s, ph, true);
  drawTail(ctx, x, by, s, ph, c);
  ctx.fillStyle = c(TAN);
  ctx.beginPath();
  ctx.ellipse(x, by, s * 0.37, s * 0.15, 0.06 * Math.sin(ph), 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + s * 0.24, by + s * 0.02, s * 0.17, s * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c(TAN_LIGHT);
  ctx.beginPath();
  ctx.ellipse(x - s * 0.02, by + s * 0.09, s * 0.26, s * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c(SADDLE);
  ctx.beginPath();
  ctx.ellipse(x - s * 0.07, by - s * 0.06, s * 0.31, s * 0.1, 0.04, 0, Math.PI * 2);
  ctx.fill();
  const hx = x + s * 0.5;
  const hy = by - s * 0.27 + s * 0.02 * Math.sin(ph);
  ctx.strokeStyle = c(TAN);
  ctx.lineWidth = s * 0.17;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.26, by - s * 0.04);
  ctx.lineTo(hx - s * 0.03, hy + s * 0.03);
  ctx.stroke();
  ctx.strokeStyle = c(COLLAR);
  ctx.lineWidth = s * 0.04;
  ctx.beginPath();
  ctx.moveTo(hx - s * 0.14, hy + s * 0.0);
  ctx.lineTo(hx - s * 0.06, hy + s * 0.12);
  ctx.stroke();
  drawHead(ctx, hx, hy, s, ph, c);
  ctx.lineWidth = s * 0.075;
  ctx.strokeStyle = c(TAN);
  drawLegs(ctx, x, by, s, ph, false);
}

function heart(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.4, x, y - r * 0.5);
  ctx.bezierCurveTo(x + r * 0.6, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r * 0.9);
  ctx.fill();
}

/** Hearts rising over her after she is petted (clicked). */
function drawHearts(ctx, p, state) {
  (state.effects ?? []).filter((e) => e.kind === 'bella').forEach((e) => {
    const age = state.time - e.born;
    if (age > 2) return;
    [-0.25, 0.05, 0.3].forEach((o, i) => {
      const a = clamp(age - i * 0.15, 0, 2);
      ctx.fillStyle = rgba(HEART, clamp(1 - a / 2));
      heart(ctx, p.x + p.s * o + Math.sin(a * 4 + i) * p.s * 0.05, p.y - p.s * (0.9 + a * 0.5), p.s * 0.1);
    });
  });
}

/** Bella running alongside, right by the track (drawn over the trackside layer and platforms). */
export function drawBella(ctx, layout, state, env) {
  const p = bellaPlace(layout, state);
  if (!p) return;
  ctx.save();
  ctx.globalAlpha = p.run.alpha;
  drawShepherd(ctx, p.x, p.y, p.s, state.time, env);
  drawHearts(ctx, p, state);
  ctx.restore();
}
