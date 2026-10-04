import { drawBubble } from './aisle.js';
import { drawNexusEmblem } from './brand.js';
import { shade } from './sky.js';
import { circle, clamp, hex, lerp, mix, radialGlow, rgba, smoothstep } from './utils.js';

/** Timeline of the transfer walk, in seconds. */
export const SCENE_SECONDS = 9.2;
const T = { stepOut: [1.1, 1.9], walk: [1.9, 6.7], stepIn: [6.7, 7.5], doors: [7.6, 8.3], talk: [0.6, 4.6] };

const TRAINS = {
  aurora: { body: hex('#7a2331'), stripe: hex('#efe3c8') },
  horizonte: { body: hex('#1f6f78'), stripe: hex('#f4f1ea') },
  estelar: { body: hex('#1d2452'), stripe: hex('#e8c96a') },
};
const GLASS = hex('#1d2630');
const LAMP = hex('#ffd28c');
const CONCRETE = hex('#a8a49c');
const SAFETY = hex('#e3c23a');
const CANOPY = hex('#3b2a6e');
const IRON = hex('#26302c');
const TREE = hex('#c8662e');
const SWEATER = hex('#c07a2c');
const PANTS = hex('#27344f');
const SKIN = hex('#e0b18f');
const HAIR = hex('#2a1d17');
const CASE = hex('#5b43a8');

const phase = (t, [a, b]) => clamp((t - a) / (b - a));

function geometry(layout, env) {
  const { W, H } = layout;
  const night = smoothstep(0.5, 0.15, env.light);
  const floor = H * 0.7; // platform level (train floors, door thresholds)
  const trainH = Math.min(H * 0.42, W * 0.42);
  return {
    W, H, env, night,
    u: trainH / 40, // everything is sized from the train, so portrait and landscape both work
    c: (color) => rgba(shade(color, env)),
    lit: (color) => rgba(mix(shade(color, env), color, night * 0.7)),
    top: floor - trainH, // train roofs
    floor,
    trainH,
    lane: H * 0.84, // where she walks, nearer to us
    doorA: W * 0.3,
    doorB: W * 0.72,
  };
}

function drawBackdrop(ctx, g) {
  const sky = ctx.createLinearGradient(0, 0, 0, g.floor);
  sky.addColorStop(0, rgba(g.env.top));
  sky.addColorStop(1, rgba(g.env.bottom));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, g.W, g.floor);
  ctx.fillStyle = g.c(TREE);
  for (let i = 0; i < 9; i++) {
    const x = (i + 0.5) * (g.W / 9);
    ctx.beginPath();
    circle(ctx, x, g.top + g.u * 2, g.u * (5 + (i % 3) * 2));
    ctx.fill();
  }
}

/** One train seen from the platform: body, window band, stripe and an open (or closing) door. */
function drawTrain(ctx, g, { x0, x1, nose, style, door, open }) {
  const { u } = g;
  const h = g.floor + u * 3 - g.top;
  ctx.fillStyle = g.c(style.body);
  ctx.beginPath();
  ctx.roundRect(x0, g.top, x1 - x0, h, nose === 'right' ? [0, u * 6, u * 2, 0] : [u * 6, 0, 0, u * 2]);
  ctx.fill();
  ctx.fillStyle = g.lit(mix(GLASS, LAMP, g.night * 0.8));
  for (let x = x0 + u * 3; x < x1 - u * 6; x += u * 9) {
    if (Math.abs(x + u * 3 - door) > u * 5) ctx.fillRect(x, g.top + u * 4, u * 6, u * 6);
  }
  ctx.fillStyle = g.c(style.stripe);
  ctx.fillRect(x0, g.top + u * 13, x1 - x0, u * 1.2);
  // Door: dark interior between two sliding leaves.
  const dw = u * 7;
  const dh = g.floor - g.top - u * 3;
  ctx.fillStyle = g.lit(mix(hex('#2a221c'), LAMP, g.night * 0.5));
  ctx.fillRect(door - dw / 2, g.top + u * 3, dw, dh);
  ctx.fillStyle = g.c(mix(style.body, hex('#ffffff'), 0.12));
  const leaf = (dw / 2) * (1 - open);
  ctx.fillRect(door - dw / 2, g.top + u * 3, leaf, dh);
  ctx.fillRect(door + dw / 2 - leaf, g.top + u * 3, leaf, dh);
}

/** The train shed: a wide iron-and-glass arch over the platforms (fills the sky on tall screens). */
function drawHall(ctx, g) {
  const { u } = g;
  const base = g.top - u * 14;
  const rise = Math.min(base - u * 2, g.W * 0.55);
  if (rise < u * 6) return;
  const rx = g.W * 0.75;
  ctx.fillStyle = rgba(mix(g.env.top, hex('#ffffff'), 0.25), 0.35);
  ctx.beginPath();
  ctx.ellipse(g.W / 2, base, rx, rise, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = g.c(CANOPY);
  ctx.lineWidth = u * 0.5;
  for (let i = 1; i < 12; i++) {
    const a = Math.PI + (i * Math.PI) / 12;
    ctx.beginPath();
    ctx.moveTo(g.W / 2, base);
    ctx.lineTo(g.W / 2 + Math.cos(a) * rx, base + Math.sin(a) * rise);
    ctx.stroke();
  }
  [1, 0.72].forEach((k) => {
    ctx.lineWidth = u * (k === 1 ? 1.4 : 0.6);
    ctx.beginPath();
    ctx.ellipse(g.W / 2, base, rx * k, rise * k, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  });
  ctx.fillStyle = g.c(CANOPY);
  ctx.fillRect(0, base, g.W, u * 1.2);
}

function drawLamps(ctx, g) {
  if (g.night < 0.05) return;
  const { u } = g;
  [0.08, 0.5, 0.92].forEach((f) => {
    radialGlow(ctx, g.W * f, g.top - u * 9, u * 14, LAMP, 0.5 * g.night);
    radialGlow(ctx, g.W * f, g.lane, u * 20, LAMP, 0.2 * g.night);
  });
}

function drawPlatform(ctx, g) {
  ctx.fillStyle = g.c(CONCRETE);
  ctx.fillRect(0, g.floor, g.W, g.H - g.floor);
  ctx.fillStyle = g.c(SAFETY);
  ctx.fillRect(0, g.floor + g.u * 1.2, g.W, g.u * 0.8);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(0, g.floor, g.W, g.u * 1.2);
}

function drawCanopy(ctx, g) {
  const { u } = g;
  const roof = g.top - u * 10;
  ctx.fillStyle = g.c(CANOPY);
  ctx.fillRect(0, roof - u * 4, g.W, u * 4);
  ctx.fillStyle = g.c(IRON);
  [0.08, 0.5, 0.92].forEach((f) => ctx.fillRect(g.W * f - u * 0.6, roof, u * 1.2, g.lane - roof));
  // The Nexus sign hangs between the two trains.
  const sw = u * 22;
  const sh = u * 5;
  const sx = g.W / 2 - sw / 2;
  const sy = g.top - u * 5;
  ctx.fillRect(g.W / 2 - sw * 0.3, roof, u * 0.4, sy - roof);
  ctx.fillRect(g.W / 2 + sw * 0.3, roof, u * 0.4, sy - roof);
  ctx.fillStyle = g.lit(hex('#3b2a6e'));
  ctx.fillRect(sx, sy, sw, sh);
  drawNexusEmblem(ctx, sx + u * 3, sy + sh / 2, sh * 0.34, g.lit(hex('#b99bff')), 1);
  ctx.fillStyle = g.lit(hex('#f4f1ea'));
  ctx.font = `600 ${u * 2.6}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Nexus', g.W / 2 + u * 2, sy + sh / 2);
}

/** Her path: out of the Aurora door, across the platform, into the Horizonte door. */
function walker(g, t) {
  const out = phase(t, T.stepOut);
  const walk = phase(t, T.walk);
  const into = phase(t, T.stepIn);
  const laneX = (p) => lerp(g.doorA + g.u * 6, g.doorB - g.u * 6, p);
  if (t < T.stepOut[1]) return { x: lerp(g.doorA, g.doorA + g.u * 6, out), feet: lerp(g.floor, g.lane, out), size: lerp(0.9, 1, out), stride: t * 5, alpha: smoothstep(0, 0.3, out) };
  if (t < T.walk[1]) return { x: laneX(walk), feet: g.lane, size: 1, stride: t * 5, alpha: 1 };
  return { x: lerp(g.doorB - g.u * 6, g.doorB, into), feet: lerp(g.lane, g.floor, into), size: lerp(1, 0.9, into), stride: t * 5, alpha: 1 - smoothstep(0.6, 1, into) };
}

function limb(ctx, x, y, angle, len, width, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-width / 2, 0, width, len, width / 2);
  ctx.fill();
  ctx.restore();
}

/** Her, walking to the right with the suitcase rolling behind (side view, 100 units tall). */
function drawTraveler(ctx, g, w) {
  const s = g.trainH * 0.0062 * w.size;
  const swing = Math.sin(w.stride) * 0.45;
  ctx.save();
  ctx.globalAlpha = w.alpha;
  ctx.translate(w.x, w.feet);
  ctx.scale(s, s);
  ctx.fillStyle = g.c(CASE);
  ctx.beginPath();
  ctx.roundRect(-34, -30, 20, 28, 3);
  ctx.fill();
  ctx.fillStyle = g.c(IRON);
  [-30, -18].forEach((x) => { ctx.beginPath(); circle(ctx, x, -1.5, 2); ctx.fill(); });
  ctx.strokeStyle = g.c(IRON);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-16, -30);
  ctx.lineTo(-7, -47);
  ctx.stroke();
  limb(ctx, 0, -48, -swing, 46, 9, g.c(PANTS));
  limb(ctx, 0, -48, swing, 46, 9, g.c(mix(PANTS, hex('#000000'), 0.15)));
  ctx.fillStyle = g.c(SWEATER);
  ctx.beginPath();
  ctx.roundRect(-9, -84, 19, 40, 7);
  ctx.fill();
  limb(ctx, 2, -80, 0.55, 34, 7, g.c(mix(SWEATER, hex('#000000'), 0.12))); // arm back to the suitcase
  limb(ctx, 2, -80, -swing * 0.8, 30, 7, g.c(SWEATER));
  ctx.fillStyle = g.c(SKIN);
  ctx.beginPath();
  circle(ctx, 3, -93, 9);
  ctx.fill();
  ctx.fillStyle = g.c(HAIR);
  ctx.beginPath();
  ctx.arc(1, -95, 9.5, Math.PI * 0.95, Math.PI * 2.05);
  ctx.fill();
  ctx.beginPath();
  circle(ctx, -8, -97, 4.5);
  ctx.fill();
  ctx.restore();
}

/**
 * The change of trains at Nexus, seen from the platform: she steps off the Aurora train,
 * crosses under the Nexus sign while the next train is announced, and boards the Horizonte one.
 * `from`/`to` are line ids; `t` is seconds into the scene.
 */
export function drawPlatformScene(ctx, layout, env, { t, from, to, announcement }) {
  const g = geometry(layout, env);
  const doorsClose = phase(t, T.doors);
  drawBackdrop(ctx, g);
  drawHall(ctx, g);
  drawTrain(ctx, g, { x0: -g.W * 0.1, x1: g.W * 0.42, nose: 'right', style: TRAINS[from], door: g.doorA, open: 1 });
  drawTrain(ctx, g, { x0: g.W * 0.58, x1: g.W * 1.1, nose: 'left', style: TRAINS[to], door: g.doorB, open: 1 - doorsClose });
  drawPlatform(ctx, g);
  drawCanopy(ctx, g);
  drawLamps(ctx, g);
  drawTraveler(ctx, g, walker(g, t));
  if (t > T.talk[0] && t < T.talk[1]) drawBubble(ctx, announcement, { x: g.W * 0.08 + g.u * 10, y: g.top - g.u * 1.5 }, g.u, g.W, 'staff');
  const fade = Math.max(1 - smoothstep(0, 0.6, t), smoothstep(SCENE_SECONDS - 0.7, SCENE_SECONDS, t));
  if (fade > 0) {
    ctx.fillStyle = `rgba(11,8,6,${fade})`;
    ctx.fillRect(0, 0, g.W, g.H);
  }
}
