import { biomeAt, color, num } from './biomes.js';
import { shade } from './sky.js';
import { stationsBetween } from './stations.js';
import { tunnelsBetween } from './tunnel.js';
import { hash, hex, mix, rgba, smoothstep } from './utils.js';

const CAM_H = 2.2; // meters above the rails
const NEAR = 4; // closest distance drawn (the bottom of the windshield)
const FAR = 420;
const GAUGE = 0.72; // half the distance between the rails
const RAIL = hex('#9a9a9a');
const SLEEPER = hex('#5a4634');
const BALLAST = hex('#77716a');
const POLE = hex('#3b3b3b');
const PLATFORM = hex('#b3aea4');
const PORTAL = hex('#5d5a55');
const HEADLIGHT = hex('#fff1c8');

/** Perspective for the forward view: world (lateral meters, height meters, z meters ahead) → screen. */
function camera(layout) {
  const { W, H } = layout;
  const horizon = H * 0.4;
  const bottom = H * 0.74; // where the dashboard starts
  const F = ((bottom - horizon) * NEAR) / CAM_H;
  return {
    W, H, horizon, bottom, F,
    x: (lat, z) => W / 2 + (lat * F) / z,
    y: (height, z) => horizon + ((CAM_H - height) * F) / z,
    s: (meters, z) => (meters * F) / z,
  };
}

function drawSkyAndGround(ctx, cam, env, state) {
  const sky = ctx.createLinearGradient(0, 0, 0, cam.horizon);
  sky.addColorStop(0, rgba(env.top));
  sky.addColorStop(1, rgba(env.bottom));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, cam.W, cam.horizon);
  if (env.light < 0.3) {
    ctx.fillStyle = `rgba(255,255,255,${(0.3 - env.light) * 2.5})`;
    for (let i = 0; i < 60; i++) ctx.fillRect(hash(i, 3101) * cam.W, hash(i, 3102) * cam.horizon * 0.9, 1.5, 1.5);
  }
  const bm = biomeAt(state.distance + 300);
  const hills = rgba(shade(color(bm, 'hills'), env, 0.4));
  ctx.fillStyle = hills;
  ctx.beginPath();
  ctx.moveTo(0, cam.horizon);
  const amp = cam.H * 0.05 * (0.5 + num(bm, 'mtn'));
  for (let x = 0; x <= cam.W; x += cam.W / 40) {
    const k = x / cam.W;
    const ridge = Math.sin(k * 7 + state.distance * 0.0004) * 0.5 + Math.sin(k * 17 + 1.3) * 0.25 + 0.6;
    ctx.lineTo(x, cam.horizon - ridge * amp);
  }
  ctx.lineTo(cam.W, cam.horizon);
  ctx.fill();
  const ground = ctx.createLinearGradient(0, cam.horizon, 0, cam.bottom);
  ground.addColorStop(0, rgba(shade(color(bm, 'field'), env, 0.3)));
  ground.addColorStop(1, rgba(shade(color(biomeAt(state.distance), 'ground'), env)));
  ctx.fillStyle = ground;
  ctx.fillRect(0, cam.horizon, cam.W, cam.bottom - cam.horizon);
  if (num(bm, 'water') > 0.5) drawSea(ctx, cam, env);
}

function drawSea(ctx, cam, env) {
  ctx.fillStyle = rgba(shade(hex('#3f7fa8'), env, 0.2));
  ctx.beginPath();
  ctx.moveTo(0, cam.horizon);
  ctx.lineTo(cam.x(-14, FAR), cam.horizon);
  ctx.lineTo(cam.x(-14, NEAR * 2), cam.bottom);
  ctx.lineTo(0, cam.bottom);
  ctx.fill();
}

/** Ballast bed, sleepers rushing toward us and the two rails meeting at the horizon. */
function drawTrack(ctx, cam, env, state, far) {
  ctx.fillStyle = rgba(shade(BALLAST, env));
  ctx.beginPath();
  ctx.moveTo(cam.x(-1.8, far), cam.y(0, far));
  ctx.lineTo(cam.x(1.8, far), cam.y(0, far));
  ctx.lineTo(cam.x(1.8, NEAR), cam.y(0, NEAR));
  ctx.lineTo(cam.x(-1.8, NEAR), cam.y(0, NEAR));
  ctx.fill();
  ctx.fillStyle = rgba(shade(SLEEPER, env));
  const step = 0.65;
  const first = Math.ceil((state.distance + NEAR) / step) * step;
  for (let m = first; m < state.distance + Math.min(90, far); m += step) {
    const z = m - state.distance;
    const h = Math.max(0.6, cam.s(0.22, z));
    ctx.fillRect(cam.x(-1.25, z), cam.y(0, z) - h / 2, cam.s(2.5, z), h);
  }
  ctx.fillStyle = rgba(shade(RAIL, env));
  [-GAUGE, GAUGE].forEach((lat) => {
    ctx.beginPath();
    ctx.moveTo(cam.x(lat - 0.04, far), cam.y(0.1, far));
    ctx.lineTo(cam.x(lat + 0.04, far), cam.y(0.1, far));
    ctx.lineTo(cam.x(lat + 0.04, NEAR), cam.y(0.1, NEAR));
    ctx.lineTo(cam.x(lat - 0.04, NEAR), cam.y(0.1, NEAR));
    ctx.fill();
  });
}

/** Trees, catenary poles and houses beside the line, far to near. */
function drawSides(ctx, cam, env, state, far) {
  const bm = biomeAt(state.distance + 100);
  const trees = num(bm, 'trees');
  const houses = Math.max(num(bm, 'houses'), num(bm, 'city'));
  const leaf = rgba(shade(color(bm, 'leaf'), env, 0.15));
  const slot = 12;
  const last = Math.floor((state.distance + Math.min(FAR * 0.6, far)) / slot);
  const first = Math.ceil((state.distance + NEAR) / slot);
  for (let k = last; k >= first; k--) {
    const z = k * slot - state.distance;
    [-1, 1].forEach((side) => {
      const r = hash(k, side > 0 ? 3111 : 3112);
      const lat = side * (4.5 + hash(k, side > 0 ? 3113 : 3114) * 28);
      if (r < houses * 0.35) drawHouse(ctx, cam, env, lat, z, k, num(bm, 'city'));
      else if (r < houses * 0.35 + trees * 0.6) drawTree(ctx, cam, lat, z, leaf, 5 + hash(k, 3115) * 7);
    });
    if (k % 4 === 0) drawPole(ctx, cam, env, z);
  }
}

function drawTree(ctx, cam, lat, z, leaf, height) {
  const x = cam.x(lat, z);
  const base = cam.y(0, z);
  const h = cam.s(height, z);
  ctx.fillStyle = '#4a3526';
  ctx.fillRect(x - h * 0.04, base - h * 0.35, h * 0.08, h * 0.35);
  ctx.fillStyle = leaf;
  ctx.beginPath();
  ctx.ellipse(x, base - h * 0.6, h * 0.32, h * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHouse(ctx, cam, env, lat, z, k, city) {
  const tall = 5 + hash(k, 3116) * (city > 0.5 ? 35 : 4);
  const w = cam.s(7, z);
  const x = cam.x(lat, z) - w / 2;
  const base = cam.y(0, z);
  const h = cam.s(tall, z);
  const wall = mix(hex('#c9b79a'), hex('#8f9aa8'), city);
  ctx.fillStyle = rgba(shade(wall, env, 0.15));
  ctx.fillRect(x, base - h, w, h);
  if (city < 0.5) {
    ctx.fillStyle = rgba(shade(hex('#8a3b2e'), env, 0.15));
    ctx.beginPath();
    ctx.moveTo(x - w * 0.08, base - h);
    ctx.lineTo(x + w / 2, base - h - w * 0.45);
    ctx.lineTo(x + w * 1.08, base - h);
    ctx.fill();
  }
  ctx.fillStyle = rgba(mix(shade(hex('#2f3a44'), env), hex('#ffd28c'), smoothstep(0.5, 0.15, env.light) * 0.8));
  for (let row = 1; row < tall / 3; row++) ctx.fillRect(x + w * 0.2, base - cam.s(row * 3, z), w * 0.6, Math.max(1, cam.s(1, z)));
}

function drawPole(ctx, cam, env, z) {
  ctx.fillStyle = rgba(shade(POLE, env));
  const x = cam.x(3.2, z);
  const w = Math.max(1, cam.s(0.25, z));
  ctx.fillRect(x - w / 2, cam.y(7, z), w, cam.s(7, z));
  ctx.fillRect(x - cam.s(3, z), cam.y(7, z), cam.s(3, z), w);
}

/** A station platform on the right, with canopy posts, when one is coming up. */
function drawPlatforms(ctx, cam, env, state) {
  stationsBetween(state.distance, state.distance + FAR * 0.8).forEach((st) => {
    const z0 = Math.max(NEAR, st.start - state.distance);
    const z1 = st.end - state.distance;
    if (z1 <= NEAR) return;
    ctx.fillStyle = rgba(shade(PLATFORM, env));
    ctx.beginPath();
    ctx.moveTo(cam.x(1.7, z1), cam.y(1, z1));
    ctx.lineTo(cam.x(6, z1), cam.y(1, z1));
    ctx.lineTo(cam.x(6, z0), cam.y(1, z0));
    ctx.lineTo(cam.x(1.7, z0), cam.y(1, z0));
    ctx.fill();
    for (let m = st.end - 10; m > st.start; m -= 20) {
      const z = m - state.distance;
      if (z > NEAR) drawPole(ctx, cam, env, z);
    }
  });
}

/** The next tunnel: whether we are inside it and how far its portal (or its exit) is. */
function tunnelAhead(state) {
  const tunnel = tunnelsBetween(state.distance - 1, state.distance + FAR)[0];
  if (!tunnel) return null;
  const inside = tunnel.start <= state.distance && state.distance < tunnel.end;
  return { inside, z: Math.max(NEAR, inside ? tunnel.end - state.distance : tunnel.start - state.distance) };
}

/** A portal in the hillside; inside, darkness with the exit glowing far away. */
function drawTunnel(ctx, cam, env, { inside, z }) {
  if (inside) {
    ctx.fillStyle = '#0d0b0a';
    ctx.fillRect(0, 0, cam.W, cam.bottom);
  } else {
    // The hill the tunnel goes into, rising around the portal.
    ctx.fillStyle = rgba(shade(PORTAL, env));
    ctx.beginPath();
    ctx.ellipse(cam.x(0, z), cam.y(0, z), cam.s(70, z), cam.s(18, z), 0, Math.PI, Math.PI * 2);
    ctx.fill();
  }
  const w = cam.s(4, z);
  const h = cam.s(6, z);
  ctx.fillStyle = inside ? rgba(shade(hex('#d8e2e8'), env)) : '#0d0b0a';
  ctx.beginPath();
  ctx.roundRect(cam.x(0, z) - w / 2, cam.y(0, z) - h, w, h, [w / 2, w / 2, 0, 0]);
  ctx.fill();
}

/** At night the headlight lights the rails ahead. */
function drawHeadlight(ctx, cam, env, dark) {
  const night = Math.max(smoothstep(0.5, 0.15, env.light), dark ? 1 : 0);
  if (night < 0.05) return;
  const g = ctx.createRadialGradient(cam.W / 2, cam.bottom, 0, cam.W / 2, cam.bottom, cam.H * 0.4);
  g.addColorStop(0, rgba(HEADLIGHT, 0.35 * night));
  g.addColorStop(1, rgba(HEADLIGHT, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, cam.horizon, cam.W, cam.bottom - cam.horizon);
}

/** The view through the driver's windshield (everything above the dashboard). */
export function drawCabOutside(ctx, layout, state, env) {
  const cam = camera(layout);
  const tunnel = tunnelAhead(state);
  drawSkyAndGround(ctx, cam, env, state);
  if (tunnel?.inside) {
    drawTunnel(ctx, cam, env, tunnel);
    drawTrack(ctx, cam, env, state, tunnel.z);
  } else {
    const far = tunnel ? tunnel.z : FAR;
    if (tunnel) drawTunnel(ctx, cam, env, tunnel);
    drawSides(ctx, cam, env, state, far);
    drawTrack(ctx, cam, env, state, far);
    drawPlatforms(ctx, cam, env, state);
  }
  drawHeadlight(ctx, cam, env, Boolean(tunnel?.inside));
  return cam;
}
