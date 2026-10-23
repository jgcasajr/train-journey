import { biomeAt, num } from './biomes.js';
import { bridgeAt } from './rivers.js';
import { shade } from './sky.js';
import { tunnelsBetween } from './tunnel.js';
import { onViaduct } from './viaduct.js';
import { stationsBetween } from './stations.js';
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
/** Her coat, shared by every drawing of her. */
export const COAT = { TAN, TAN_LIGHT, SADDLE, MASK, MUZZLE, COLLAR, TONGUE, HEART };

const COLLIE_BLACK = hex('#1a181c');
const COLLIE_WHITE = hex('#f1eee8');

/**
 * The two dogs, as coats every drawing of them takes: Bella, a German Shepherd, and Princess,
 * a black-and-white Border Collie (white chest, muzzle, blaze, paws and tail tip; tipped ears).
 */
export const BELLA = {
  name: 'Bella', body: TAN, chest: TAN, belly: TAN_LIGHT, back: SADDLE, ears: SADDLE, mask: MASK, muzzle: MUZZLE,
  collar: COLLAR, tongue: TONGUE, legs: TAN, tailTip: null, blaze: null, tippedEars: false,
};
export const PRINCESS = {
  name: 'Princess', body: COLLIE_BLACK, chest: COLLIE_WHITE, belly: COLLIE_WHITE, back: COLLIE_BLACK, ears: COLLIE_BLACK,
  mask: hex('#0c0b0d'), muzzle: COLLIE_WHITE, collar: hex('#8a4fd8'), tongue: TONGUE, legs: COLLIE_WHITE,
  tailTip: COLLIE_WHITE, blaze: COLLIE_WHITE, tippedEars: true,
};

const GREETINGS = ['Olha a Bella e a Princess! Corre, meninas!', 'Bella! Princess! Vieram me acompanhar?', 'Vão, meninas! Mais rápido que o trem!', 'Minha Bella e minha Princess... sempre do meu lado.'];
export const PETS = ['Boa menina, Bella!', 'Te amo, Bella!', 'Quem é a cachorra mais linda? A Bella!'];
export const PRINCESS_PETS = ['Boa menina, Princess!', 'Te amo, Princess!', 'Quem é a border collie mais linda? A Princess!'];

/**
 * The run of this period, if any: { k, t } with t = seconds since she showed up.
 * `first` (from ?bella) is an extra run at that trip time, also in a resumed trip.
 */
function episode(time, first = null) {
  if (first !== null && time >= first && time <= first + SECONDS) return { k: 0, t: time - first };
  const k = Math.floor(time / PERIOD);
  if (k > 0 && hash(k, 4101) > 0.75) return null;
  const start = k === 0 ? FIRST : k * PERIOD + hash(k, 4102) * (PERIOD - SECONDS);
  // A regular run right after the forced one would make them jump back to the start of the run.
  if (first !== null && Math.abs(start - first) < SECONDS + 10) return null;
  const t = time - start;
  return t >= 0 && t <= SECONDS ? { k, t } : null;
}

/** Whether they wait at this station today (never while they travel aboard). See bellaPlatform.js. */
export function bellaWaitsAt(st, state) {
  if (state.bellaAboard) return false;
  return hash(st.id * 13 + (state.dayCount ?? 0), 871) < (st.nexus ? 0.4 : 0.2);
}

const PLATFORM_CLEARANCE = { behind: 250, ahead: 450 }; // meters around a platform where they wait

/** Meters from the train to the nearest platform where they are waiting today (Infinity if none near). */
function waitingPlatformGap(state) {
  const d = state.distance;
  return stationsBetween(d - PLATFORM_CLEARANCE.behind, d + PLATFORM_CLEARANCE.ahead)
    .filter((st) => bellaWaitsAt(st, state))
    .reduce((gap, st) => Math.min(gap, d < st.start ? st.start - d : Math.max(0, d - st.end)), Infinity);
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
 * stop, nears a tunnel, bridge or viaduct, enters a town, or comes to a platform where she is
 * already waiting (so the pair never shows up twice).
 */
function visibility(state) {
  if (state.dwell > 0) return 0;
  const town = clamp((0.6 - num(biomeAt(state.distance), 'city')) / 0.2);
  const waiting = clamp((waitingPlatformGap(state) - 60) / 150);
  return Math.min(clamp((state.speed - 1.5) / 3), clamp((clearAhead(state.distance) - 60) / 150), town, waiting);
}

/** Bella's run right now ({ k, t, alpha }), or null. Pure function of the state; `state.bellaFirst` (from ?bella) brings her first run forward. */
export function bellaAt(state) {
  if (state.bellaAboard) return null; // she is inside, by the passenger's side
  const ep = episode(state.time, state.bellaFirst ?? null);
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

/** Princess runs with Bella, a little behind and farther from the track, keeping pace. */
export function princessPlace(layout, state) {
  const p = bellaPlace(layout, state);
  if (!p) return null;
  return { ...p, x: p.x - p.s * (1.25 + 0.15 * Math.sin(state.time * 0.6)), y: p.y - p.s * 0.07, s: p.s * 0.88 };
}

export function princessBox(layout, state) {
  const p = princessPlace(layout, state);
  return p && p.run.alpha > 0.5 && { x: p.x - p.s * 0.8, y: p.y - p.s * 0.95, w: p.s * 1.4, h: p.s * 0.95 };
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

/** Ears: pricked (Bella) or with the tips folded forward (Princess). */
function drawEars(ctx, hx, hy, s, coat, c) {
  ctx.fillStyle = c(coat.ears);
  [-0.09, -0.02].forEach((o) => {
    const tip = coat.tippedEars ? 0.15 : 0.21;
    ctx.beginPath();
    ctx.moveTo(hx + o * s - s * 0.04, hy - s * 0.04);
    ctx.lineTo(hx + o * s, hy - s * tip);
    ctx.lineTo(hx + o * s + s * 0.05, hy - s * 0.05);
    ctx.fill();
    if (!coat.tippedEars) return;
    ctx.beginPath(); // the folded tip
    ctx.moveTo(hx + o * s - s * 0.005, hy - s * 0.15);
    ctx.lineTo(hx + o * s + s * 0.06, hy - s * 0.12);
    ctx.lineTo(hx + o * s + s * 0.02, hy - s * 0.1);
    ctx.fill();
  });
}

function drawHead(ctx, hx, hy, s, ph, c, coat) {
  drawEars(ctx, hx, hy, s, coat, c);
  ctx.fillStyle = c(coat.body);
  ctx.beginPath();
  ctx.ellipse(hx, hy, s * 0.12, s * 0.09, 0.1, 0, Math.PI * 2);
  ctx.fill();
  if (coat.blaze) {
    ctx.fillStyle = c(coat.blaze);
    ctx.beginPath();
    ctx.ellipse(hx + s * 0.05, hy - s * 0.035, s * 0.07, s * 0.022, -0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = c(coat.muzzle);
  ctx.beginPath();
  ctx.ellipse(hx + s * 0.13, hy + s * 0.035, s * 0.1, s * 0.042, 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c(coat.mask);
  ctx.beginPath();
  ctx.arc(hx + s * 0.225, hy + s * 0.05, s * 0.025, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c(coat.tongue);
  ctx.beginPath();
  ctx.ellipse(hx + s * 0.12, hy + s * (0.09 + 0.012 * Math.sin(ph * 2)), s * 0.035, s * 0.022, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c(coat.mask);
  ctx.beginPath();
  ctx.arc(hx + s * 0.03, hy - s * 0.025, Math.max(1, s * 0.016), 0, Math.PI * 2);
  ctx.fill();
}

function drawTail(ctx, x, by, s, ph, c, coat) {
  const sway = Math.sin(ph) * s * 0.05;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(x - s * 0.36, by - s * 0.05);
    ctx.quadraticCurveTo(x - s * 0.6, by, x - s * 0.72, by + s * 0.14 + sway);
  };
  ctx.lineCap = 'round';
  ctx.strokeStyle = c(coat.body);
  ctx.lineWidth = s * 0.11;
  path();
  ctx.stroke();
  ctx.strokeStyle = c(coat.back);
  ctx.lineWidth = s * 0.06;
  ctx.save();
  ctx.translate(0, -s * 0.02);
  path();
  ctx.stroke();
  ctx.restore();
  if (!coat.tailTip) return;
  ctx.strokeStyle = c(coat.tailTip); // the white tip of a collie's tail
  ctx.lineWidth = s * 0.1;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.69, by + s * 0.09 + sway * 0.8);
  ctx.lineTo(x - s * 0.72, by + s * 0.14 + sway);
  ctx.stroke();
}

/** A dog galloping to the right, in its coat (Bella by default): ears up, tongue out. */
export function drawShepherd(ctx, x, ground, s, time, env, coat = BELLA) {
  const c = (col) => rgba(shade(col, env, 0.04));
  const ph = time * Math.PI * 2 * GALLOP_HZ;
  const by = ground - s * 0.55 - s * 0.04 * Math.abs(Math.sin(ph));
  ctx.lineCap = 'round';
  ctx.lineWidth = s * 0.075;
  ctx.strokeStyle = rgba(shade(scale(coat.legs, 0.72), env, 0.04));
  drawLegs(ctx, x, by, s, ph, true);
  drawTail(ctx, x, by, s, ph, c, coat);
  ctx.fillStyle = c(coat.body);
  ctx.beginPath();
  ctx.ellipse(x, by, s * 0.37, s * 0.15, 0.06 * Math.sin(ph), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c(coat.chest);
  ctx.beginPath();
  ctx.ellipse(x + s * 0.24, by + s * 0.02, s * 0.17, s * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c(coat.belly);
  ctx.beginPath();
  ctx.ellipse(x - s * 0.02, by + s * 0.09, s * 0.26, s * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c(coat.back);
  ctx.beginPath();
  ctx.ellipse(x - s * 0.07, by - s * 0.06, s * 0.31, s * 0.1, 0.04, 0, Math.PI * 2);
  ctx.fill();
  const hx = x + s * 0.5;
  const hy = by - s * 0.27 + s * 0.02 * Math.sin(ph);
  ctx.strokeStyle = c(coat.body);
  ctx.lineWidth = s * 0.17;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.26, by - s * 0.04);
  ctx.lineTo(hx - s * 0.03, hy + s * 0.03);
  ctx.stroke();
  if (coat.chest !== coat.body) { // a collie's white ruff under the neck
    ctx.strokeStyle = c(coat.chest);
    ctx.lineWidth = s * 0.08;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.3, by + s * 0.02);
    ctx.lineTo(hx - s * 0.05, hy + s * 0.08);
    ctx.stroke();
  }
  ctx.strokeStyle = c(coat.collar);
  ctx.lineWidth = s * 0.04;
  ctx.beginPath();
  ctx.moveTo(hx - s * 0.14, hy + s * 0.0);
  ctx.lineTo(hx - s * 0.06, hy + s * 0.12);
  ctx.stroke();
  drawHead(ctx, hx, hy, s, ph, c, coat);
  ctx.lineWidth = s * 0.075;
  ctx.strokeStyle = c(coat.legs);
  drawLegs(ctx, x, by, s, ph, false);
}

function heart(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.4, x, y - r * 0.5);
  ctx.bezierCurveTo(x + r * 0.6, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r * 0.9);
  ctx.fill();
}

/** Hearts rising over a dog after she is petted (clicked); `kind` is 'bella' or 'princess'. */
function drawHearts(ctx, p, state, kind) {
  (state.effects ?? []).filter((e) => e.kind === kind).forEach((e) => {
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
  const q = princessPlace(layout, state);
  ctx.save();
  ctx.globalAlpha = p.run.alpha;
  drawShepherd(ctx, q.x, q.y, q.s, state.time + 0.17, env, PRINCESS); // out of step with Bella
  drawHearts(ctx, q, state, 'princess');
  drawShepherd(ctx, p.x, p.y, p.s, state.time, env);
  drawHearts(ctx, p, state, 'bella');
  ctx.restore();
}
