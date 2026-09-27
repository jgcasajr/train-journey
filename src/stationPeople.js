import { t } from './i18n.js';
import { DWELL } from './stations.js';
import { circle, clamp, hash, hex, scale, smoothstep } from './utils.js';

const SKIN = ['#e0b18f', '#b9835f', '#8a5a3c', '#f1c9a5'].map(hex);
const COATS = ['#3a5a8a', '#8a3a3a', '#3f6b4a', '#6b5a8a', '#b07a36', '#444444', '#c9c1b0'].map(hex);
const HAIRS = ['#2a1c14', '#111111', '#6b4a2a', '#b8b0a4', '#8a3a1e'].map(hex);
const SHOE = hex('#1e1a18');
const WOOD = hex('#6b4a33');
const IRON = hex('#26302c');
const PIGEON = hex('#8a8f9a');
const STRIDE = 5.5; // walking steps' phase speed (radians per second)

/** Seconds into this station's stop: 0 while approaching, Infinity once the train has left. */
export function stopElapsed(state, st) {
  if (state.served?.id !== st.id) return 0;
  return state.dwell > 0 ? DWELL - state.dwell : Infinity;
}

const doorY = (g) => g.platformTop + g.win.h * 0.17; // where people meet the train doors

/** How "in motion" someone is while `walk` (0..1) eases along: 0 at the ends, 1 mid-way. */
const moving = (walk) => clamp(Math.sin(walk * Math.PI) * 2.2);

// ---------- One person, side view, with jointed legs and swinging arms ----------

function limb(ctx, x, y, a1, len1, a2, len2, width, color) {
  const kx = x + Math.sin(a1) * len1;
  const ky = y + Math.cos(a1) * len1;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(kx, ky);
  ctx.lineTo(kx + Math.sin(a2) * len2, ky + Math.cos(a2) * len2);
  ctx.stroke();
  return { x: kx + Math.sin(a2) * len2, y: ky + Math.cos(a2) * len2 };
}

/**
 * A person seen from the side. `p`: { x, feet, h, id, move (0..1 walking), phase, facing (±1),
 * hug (0..1 arms around someone), run (true for a sprint), time }.
 */
export function drawPerson(ctx, g, p) {
  const { h, id } = p;
  const f = p.facing ?? 1;
  const move = p.move ?? 0;
  const phase = p.phase ?? 0;
  const bounce = Math.abs(Math.sin(phase)) * h * 0.012 * move;
  const sway = move < 0.1 ? Math.sin((p.time ?? 0) * 0.8 + id) * h * 0.004 : 0; // idle weight shift
  const x = p.x + sway;
  const hip = { x, y: p.feet - h * 0.47 - bounce };
  const shoulder = { x: x + f * h * 0.015 * move, y: p.feet - h * 0.8 - bounce };
  const leg = h * 0.235;
  const coat = g.c(COATS[Math.floor(hash(id, 821) * COATS.length)]);
  const pants = g.c(scale(COATS[Math.floor(hash(id, 822) * COATS.length)], 0.5));
  const swing = (p.run ? 0.75 : 0.45) * move;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Legs: the back one first (darker); the knee bends as the leg swings forward.
  [1, 0].forEach((k) => {
    const s = Math.sin(phase + k * Math.PI);
    const thigh = f * s * swing;
    const bend = Math.max(0, Math.sin(phase + k * Math.PI + 1.3)) * 0.9 * move;
    const foot = limb(ctx, hip.x, hip.y, thigh, leg, thigh - f * bend, leg, h * 0.09, k ? g.c(scale(COATS[Math.floor(hash(id, 822) * COATS.length)], 0.4)) : pants);
    ctx.fillStyle = g.c(SHOE);
    ctx.beginPath();
    ctx.ellipse(foot.x + f * h * 0.02, foot.y, h * 0.04, h * 0.018, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  const armAngle = (k) => {
    if (p.hug) return f * 1.35 * p.hug + (1 - p.hug) * f * Math.sin(phase + k * Math.PI + Math.PI) * swing; // reaching forward, around the other
    return f * Math.sin(phase + k * Math.PI + Math.PI) * swing * 0.9;
  };
  const forearm = (k) => (p.hug ? f * 0.7 * p.hug : p.run ? f * 1.1 * move : f * 0.25 * move) + armAngle(k);
  // Back arm, torso, then front arm.
  limb(ctx, shoulder.x, shoulder.y + h * 0.02, armAngle(1), h * 0.16, forearm(1), h * 0.15, h * 0.06, g.c(scale(COATS[Math.floor(hash(id, 821) * COATS.length)], 0.8)));
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(shoulder.x - h * 0.1, shoulder.y + h * 0.02);
  ctx.quadraticCurveTo(shoulder.x, shoulder.y - h * 0.04, shoulder.x + h * 0.1, shoulder.y + h * 0.02);
  ctx.quadraticCurveTo(hip.x + h * 0.11, (shoulder.y + hip.y) / 2, hip.x + h * 0.09, hip.y + h * 0.05);
  ctx.lineTo(hip.x - h * 0.09, hip.y + h * 0.05);
  ctx.quadraticCurveTo(hip.x - h * 0.11, (shoulder.y + hip.y) / 2, shoulder.x - h * 0.1, shoulder.y + h * 0.02);
  ctx.fill();
  const hand = limb(ctx, shoulder.x, shoulder.y + h * 0.02, armAngle(0), h * 0.16, forearm(0), h * 0.15, h * 0.06, coat);
  const skin = g.c(SKIN[Math.floor(hash(id, 823) * SKIN.length)]);
  ctx.fillStyle = skin;
  ctx.beginPath();
  circle(ctx, hand.x, hand.y, h * 0.028);
  ctx.fill();
  if (hash(id, 824) < 0.35 && !p.hug) {
    ctx.fillStyle = g.c(scale(COATS[Math.floor(hash(id, 828) * COATS.length)], 0.8));
    ctx.fillRect(hand.x - h * 0.05, hand.y, h * 0.1, h * 0.12); // a bag in the hand
  }
  ctx.fillStyle = skin;
  ctx.fillRect(shoulder.x - h * 0.02, shoulder.y - h * 0.06, h * 0.04, h * 0.07);
  ctx.beginPath();
  circle(ctx, shoulder.x + f * h * 0.01, shoulder.y - h * 0.11, h * 0.07);
  ctx.fill();
  ctx.fillStyle = g.c(HAIRS[Math.floor(hash(id, 829) * HAIRS.length)]);
  ctx.beginPath();
  ctx.arc(shoulder.x + f * h * 0.005, shoulder.y - h * 0.12, h * 0.072, Math.PI * (f > 0 ? 0.85 : -0.15), Math.PI * (f > 0 ? 2.05 : 1.05));
  ctx.fill();
}

// ---------- Who is on the platform ----------

/** People waiting on the platform; some walk to the train and board during the stop. */
function waitingPeople(g, elapsed, time) {
  const { st, toX, win } = g;
  return Array.from({ length: 9 }, (_, k) => {
    const id = st.id * 17 + k;
    const x = toX(st.start + 10 + hash(id, 825) * (st.end - st.start - 20));
    const feet = g.platformTop + win.h * (0.05 + hash(id, 826) * 0.08);
    const h = win.h * (0.2 + hash(id, 827) * 0.05);
    const facing = hash(id, 830) < 0.5 ? -1 : 1;
    if (hash(id, 828) > 0.45) return { id, x, feet, h, alpha: 1, facing, time };
    const start = 2 + hash(id, 829) * 3;
    const walk = smoothstep(start, start + 4, elapsed);
    const vanish = smoothstep(start + 4, start + 4.6, elapsed);
    return {
      id, x, feet: feet + (doorY(g) - feet) * walk, h: h * (1 + walk * 0.12), alpha: 1 - vanish,
      move: moving(walk), phase: elapsed * STRIDE + id, facing, time,
    };
  });
}

/** Passengers stepping off the train and heading for the station building. */
function alightingPeople(g, elapsed, time) {
  const { st, toX, win } = g;
  const count = 1 + Math.floor(hash(st.id, 831) * 3);
  return Array.from({ length: count }, (_, k) => {
    const id = st.id * 17 + 20 + k;
    const start = 1 + k * 1.3;
    const walk = smoothstep(start + 0.5, start + 7, elapsed);
    const x0 = toX(st.stopAt + 12 + k * 22);
    const x1 = toX(st.start + 52 + k * 9); // toward the doors of the building
    const h = win.h * (0.21 + hash(id, 827) * 0.04);
    return {
      id,
      x: x0 + (x1 - x0) * walk,
      feet: doorY(g) + (g.platformTop + win.h * 0.04 - doorY(g)) * walk,
      h: h * (1.12 - walk * 0.12),
      alpha: smoothstep(start, start + 0.6, elapsed),
      move: moving(walk), phase: elapsed * STRIDE + id, facing: x1 < x0 ? -1 : 1, time,
    };
  });
}

/** Some stops bring a reunion: someone steps off and runs into the arms of who was waiting. */
export const reunionAt = (st) => hash(st.id, 841) < 0.5;
/** Some stops have someone late, sprinting for the doors before the train leaves. */
export const runnerAt = (st) => hash(st.id, 851) < 0.45;
/** Some stations have a pão de queijo seller on the platform. */
export const vendorAt = (st) => hash(st.id, 861) < 0.6;

function reunionPeople(g, elapsed, time) {
  const { st, toX, win } = g;
  const meet = toX(st.stopAt + 28);
  const feet = g.platformTop + win.h * 0.1;
  const h = win.h * 0.23;
  const walk = smoothstep(1.5, 5, elapsed);
  const hug = smoothstep(5, 5.8, elapsed) * (1 - smoothstep(DWELL - 2.5, DWELL - 1.5, elapsed));
  const gap = h * (0.16 - hug * 0.05);
  const traveller = {
    id: st.id * 17 + 40, x: meet - gap + (1 - walk) * h * 0.9, feet: feet + (doorY(g) - feet) * (1 - walk), h,
    alpha: smoothstep(1, 1.5, elapsed), move: moving(walk), phase: elapsed * STRIDE, facing: -1, hug, time,
  };
  const waiting = { id: st.id * 17 + 41, x: meet - gap * 2.6, feet, h: h * 0.95, alpha: 1, facing: 1, hug, time };
  return { people: [waiting, traveller], heart: hug > 0.5 ? { x: meet - gap * 1.8, y: feet - h * 1.02, t: elapsed } : null };
}

function runnerPerson(g, elapsed, time) {
  const { st, toX, win } = g;
  const t0 = DWELL - 6;
  const run = smoothstep(t0, t0 + 4, elapsed);
  if (elapsed < t0 || run >= 1) return null;
  const x0 = toX(st.start + 15);
  const x1 = toX(st.stopAt + 40);
  const feet = g.platformTop + win.h * 0.06;
  return {
    id: st.id * 17 + 50, x: x0 + (x1 - x0) * run, feet: feet + (doorY(g) - feet) * smoothstep(0.7, 1, run),
    h: win.h * 0.22, alpha: 1 - smoothstep(0.92, 1, run), move: 1, phase: elapsed * STRIDE * 1.9, facing: 1, run: true, time,
  };
}

// ---------- Little platform life: vendor, pigeons, a floating heart ----------

function drawVendor(ctx, g, time) {
  const { st, toX, win, u } = g;
  const x = toX(st.start + 36);
  const feet = g.platformTop + win.h * 0.07;
  const h = win.h * 0.22;
  ctx.fillStyle = g.c(WOOD);
  ctx.fillRect(x + h * 0.12, feet - h * 0.42, h * 0.34, h * 0.24);
  ctx.fillStyle = g.c(IRON);
  [0.15, 0.42].forEach((k) => {
    ctx.beginPath();
    circle(ctx, x + h * k, feet - h * 0.05, h * 0.05);
    ctx.fill();
  });
  ctx.fillRect(x + h * 0.14, feet - h * 0.2, h * 0.3, h * 0.03);
  ctx.fillStyle = g.c(hex('#f2c14e'));
  ctx.fillRect(x + h * 0.1, feet - h * 0.58, h * 0.38, h * 0.12);
  ctx.fillStyle = g.c(hex('#3a2a1e'));
  ctx.font = `600 ${Math.max(6, h * 0.07)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(t('Pão de queijo'), x + h * 0.29, feet - h * 0.52);
  ctx.fillStyle = g.c(hex('#e8c56a'));
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    circle(ctx, x + h * (0.18 + i * 0.06), feet - h * 0.44, h * 0.025);
    ctx.fill();
  }
  // Steam from the warm tray.
  ctx.strokeStyle = `rgba(255,255,255,${0.35 + 0.15 * Math.sin(time * 2)})`;
  ctx.lineWidth = Math.max(1, u * 0.2);
  ctx.beginPath();
  ctx.moveTo(x + h * 0.25, feet - h * 0.47);
  ctx.quadraticCurveTo(x + h * 0.22, feet - h * 0.55, x + h * 0.26, feet - h * 0.62);
  ctx.stroke();
  drawPerson(ctx, g, { id: st.id * 17 + 60, x, feet, h, facing: 1, time });
}

function drawPigeons(ctx, g, time) {
  const { st, toX, win } = g;
  const s = win.h * 0.028;
  for (let i = 0; i < 4; i++) {
    const x = toX(st.start + 60 + i * 7 + hash(st.id + i, 871) * 6);
    const y = g.platformTop + win.h * (0.03 + hash(st.id + i, 872) * 0.04);
    const peck = Math.max(0, Math.sin(time * 3 + i * 1.7)) ** 3;
    ctx.fillStyle = g.c(PIGEON);
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.5, s * 0.8, s * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    circle(ctx, x + s * 0.7, y - s * (0.9 - peck * 0.7), s * 0.28);
    ctx.fill();
    ctx.fillStyle = g.c(hex('#d98a3a'));
    ctx.fillRect(x - s * 0.1, y - s * 0.1, s * 0.08, s * 0.25);
    ctx.fillRect(x + s * 0.15, y - s * 0.1, s * 0.08, s * 0.25);
  }
}

function drawHeart(ctx, g, heart) {
  const k = (heart.t % 2) / 2;
  ctx.fillStyle = `rgba(230,70,90,${0.75 + 0.25 * Math.sin(heart.t * 4)})`;
  ctx.font = `${g.win.h * 0.09}px serif`;
  ctx.textAlign = 'center';
  ctx.fillText('♥', heart.x, heart.y - k * g.win.h * 0.06);
}

/** Everyone on the platform, drawn back to front. */
export function drawPlatformLife(ctx, g, state) {
  const { st } = g;
  const elapsed = stopElapsed(state, st);
  if (vendorAt(st)) drawVendor(ctx, g, state.time);
  drawPigeons(ctx, g, state.time);
  const reunion = reunionAt(st) && elapsed > 0 && elapsed < Infinity ? reunionPeople(g, elapsed, state.time) : { people: [], heart: null };
  const runner = runnerAt(st) && elapsed < Infinity ? runnerPerson(g, elapsed, state.time) : null;
  [...waitingPeople(g, elapsed, state.time), ...alightingPeople(g, elapsed, state.time), ...reunion.people, ...(runner ? [runner] : [])]
    .filter((p) => p.alpha > 0.01)
    .sort((a, b) => a.feet - b.feet)
    .forEach((p) => {
      ctx.globalAlpha = p.alpha;
      drawPerson(ctx, g, p);
      ctx.globalAlpha = 1;
    });
  if (reunion.heart) drawHeart(ctx, g, reunion.heart);
}
