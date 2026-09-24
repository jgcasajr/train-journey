import { color, num, pick } from './biomes.js';
import { drawBridges, drawRiverBand } from './bridge.js';
import { drawCityBlock, drawSkyline, drawStreetside } from './city.js';
import { drawBoats, drawLighthouses } from './coast.js';
import { drawCropPatches, drawFarmProp, drawFence } from './farm.js';
import { acrossGradient, fillRidge, forEachSlot, layerFrame, traceRidge } from './layers.js';
import { drawBush, drawHouse, drawTree } from './props.js';
import { bridgeAt } from './rivers.js';
import { drawCrossingBand, drawCrossingGates, drawParallelRoad } from './roadView.js';
import { shade } from './sky.js';
import { drawBalloons } from './skylife.js';
import { drawStations } from './stationView.js';
import { stationsBetween } from './stations.js';
import { drawTunnels } from './tunnel.js';
import { fbm, hash, hex, mix, mod, noise1, rgba, scale } from './utils.js';

const TRUNK = hex('#4a3526');
const SNOW = hex('#eef3fa');
const WATER = hex('#2e6c9c');
const WHITE = hex('#ffffff');
const POLE = hex('#3b3029');
const WIRE = hex('#1e1b1a');
const LAMP = hex('#ffd27a');
const DARK_GLASS = hex('#2a2f38');
const WALLS = ['#d9cbb0', '#c46a4a', '#ece6d6', '#9fb0c0'].map(hex);
const ROOFS = ['#7a3b2e', '#4a4a55', '#8a5a3a'].map(hex);

const treeStyle = (bm, env, haze) => ({
  leaf: rgba(shade(color(bm, 'leaf'), env, haze)),
  trunk: rgba(shade(TRUNK, env, haze)),
  snow: num(bm, 'snow') > 0.4 ? rgba(shade(SNOW, env, haze)) : null,
});

function houseStyle(id, env, haze) {
  const lit = env.light < 0.45 && hash(id, 301) > 0.25;
  return {
    wall: rgba(shade(WALLS[Math.floor(hash(id, 302) * WALLS.length)], env, haze)),
    roof: rgba(shade(ROOFS[Math.floor(hash(id, 303) * ROOFS.length)], env, haze)),
    window: lit ? rgba(LAMP) : rgba(shade(DARK_GLASS, env, haze)),
  };
}

const MOUNTAINS = [
  { key: 'far', depth: 0.02, freq: 0.0021, amp: 0.36, seed: 11, haze: 0.55, snowLine: 0.16, drop: 0 },
  { key: 'mid', depth: 0.05, freq: 0.0036, amp: 0.24, seed: 23, haze: 0.32, snowLine: 0.11, drop: 0.03 },
];

function drawSnowCaps(ctx, pts, snowLine, band, fill) {
  if (!pts.some((p) => p.y < snowLine && num(p.bm, 'snow') > 0.01)) return;
  ctx.fillStyle = fill;
  ctx.beginPath();
  pts.forEach((p) => ctx.lineTo(p.x, p.y));
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    const cap = Math.max(0, Math.min(snowLine - p.y, band));
    ctx.lineTo(p.x, p.y + cap * num(p.bm, 'snow') * (0.6 + 0.5 * noise1(p.wx * 0.05, 5)));
  }
  ctx.closePath();
  ctx.fill();
}

function drawMountains(ctx, layout, state, env, cfg) {
  const { win, horizon } = layout;
  const lf = layerFrame(layout, state, cfg.depth);
  const base = horizon + 2 + win.h * cfg.drop;
  const heightAt = (wx, bm) =>
    base - (0.3 + 0.7 * fbm(wx * cfg.freq, cfg.seed, 5)) * win.h * cfg.amp * num(bm, 'mtn');
  const pts = traceRidge(win, lf, heightAt);
  const fill = acrossGradient(ctx, win, lf, (bm) => rgba(shade(color(bm, cfg.key), env, cfg.haze)));
  fillRidge(ctx, pts, win.y + win.h + 40, fill);
  drawSnowCaps(ctx, pts, horizon - win.h * cfg.snowLine, win.h * 0.14, rgba(shade(SNOW, env, cfg.haze * 0.8)));
}

function drawWater(ctx, layout, state, env) {
  const { win, horizon, u } = layout;
  const lf = layerFrame(layout, state, 0.08);
  const top = horizon + win.h * 0.02;
  const base = shade(mix(WATER, env.bottom, 0.3), env, 0.1);
  ctx.fillStyle = acrossGradient(ctx, win, lf, (bm) => rgba(base, num(bm, 'water')));
  ctx.fillRect(win.x - lf.margin, top, win.w + lf.margin * 2, win.y + win.h - top + 40);
  const glint = mix(env.bottom, WHITE, 0.6);
  forEachSlot(win, lf, u * 2.5, 0, 131, (i, x, wx, bm) => {
    const water = num(bm, 'water');
    if (water < 0.05) return;
    const depthT = hash(i, 132) ** 2;
    const len = u * (0.6 + hash(i, 133) * 2.5) * (0.4 + depthT);
    ctx.fillStyle = rgba(glint, water * 0.35 * (0.5 + 0.5 * Math.sin(state.time * 2 + i)));
    ctx.fillRect(x, top + depthT * win.h * 0.2, len, Math.max(1, u * 0.12));
  });
  drawBoats(ctx, layout, state, env, lf, top);
}

function drawHills(ctx, layout, state, env) {
  const { win, horizon } = layout;
  const lf = layerFrame(layout, state, 0.12);
  const haze = 0.18;
  const heightAt = (wx, bm) =>
    horizon + win.h * (0.05 + num(bm, 'water') * 0.14) - fbm(wx * 0.005, 37, 3) * win.h * 0.1 * num(bm, 'hillAmp');
  fillRidge(ctx, traceRidge(win, lf, heightAt), win.y + win.h + 40,
    acrossGradient(ctx, win, lf, (bm) => rgba(shade(color(bm, 'hills'), env, haze))));
  drawCropPatches(ctx, win, lf, heightAt, env, { spacing: win.h * 0.25, seed: 611, haze, rowGap: win.h * 0.003 });
  drawRiverBand(ctx, layout, state, lf, heightAt, env, haze);
  const s = win.h * 0.03;
  forEachSlot(win, lf, s * 0.7, s, 41, (i, x, wx, bm) => {
    if (hash(i, 42) > num(bm, 'trees') * 0.7) return;
    const type = pick(bm, hash(i, 43)).tree;
    drawTree(ctx, type, x, heightAt(wx, bm) + s * 0.25, s * (0.7 + hash(i, 44) * 0.6), treeStyle(bm, env, haze));
  });
  forEachSlot(win, lf, s * 6, s * 2, 45, (i, x, wx, bm) => {
    if (hash(i, 46) > num(bm, 'houses')) return;
    drawHouse(ctx, x, heightAt(wx, bm) + s * 0.3, s * 0.9, houseStyle(i, env, haze));
  });
  drawLighthouses(ctx, layout, state, env, lf, heightAt);
}

function drawFields(ctx, layout, state, env) {
  const { win, horizon } = layout;
  const lf = layerFrame(layout, state, 0.3);
  const haze = 0.06;
  const heightAt = (wx, bm) =>
    horizon + win.h * (0.2 + num(bm, 'water') * 0.08) - fbm(wx * 0.006, 51, 2) * win.h * 0.05;
  fillRidge(ctx, traceRidge(win, lf, heightAt), win.y + win.h + 40,
    acrossGradient(ctx, win, lf, (bm) => rgba(shade(color(bm, 'field'), env, haze))));
  drawCropPatches(ctx, win, lf, heightAt, env, { spacing: win.h * 0.45, seed: 601, haze, rowGap: win.h * 0.006 });
  drawRiverBand(ctx, layout, state, lf, heightAt, env, haze);
  drawCrossingBand(ctx, layout, state, lf, heightAt, env, { haze, waitingCars: true });
  const s = win.h * 0.12;
  forEachSlot(win, lf, s * 0.45, s * 1.2, 52, (i, x, wx, bm) => {
    const r = hash(i, 53);
    const y = heightAt(wx, bm) + s * 0.06;
    const city = num(bm, 'city');
    if (hash(i, 56) < city * 0.6) {
      drawCityBlock(ctx, x, y, s, env, haze, i, state.time, layout.u, city);
    } else if (hash(i, 57) < num(bm, 'farm') * 0.12) {
      drawFarmProp(ctx, x, y, s, env, haze, i, state.time);
    } else if (r < num(bm, 'trees') * 0.7) {
      const type = pick(bm, hash(i, 54)).tree;
      drawTree(ctx, type, x, y, s * (0.7 + hash(i, 55) * 0.6), treeStyle(bm, env, haze));
    } else if (r > 1 - num(bm, 'houses') * 0.35) {
      drawHouse(ctx, x, y, s * 0.7, houseStyle(i + 7000, env, haze));
    }
  });
}

function drawNear(ctx, layout, state, env) {
  const { win, horizon } = layout;
  const lf = layerFrame(layout, state, 0.65);
  const heightAt = (wx) => horizon + win.h * 0.36 - fbm(wx * 0.012, 67, 2) * win.h * 0.04;
  const big = win.h * 0.45;
  forEachSlot(win, lf, win.h * 0.5, big, 70, (i, x, wx, bm) => {
    if (hash(i, 71) > (0.2 + num(bm, 'trees') * 0.4) * (1 - num(bm, 'city') * 0.7)) return;
    const type = pick(bm, hash(i, 72)).tree;
    drawTree(ctx, type, x, heightAt(wx) + big * 0.05, big * (0.8 + hash(i, 73) * 0.5), treeStyle(bm, env, 0));
  });
  fillRidge(ctx, traceRidge(win, lf, heightAt), win.y + win.h + 40,
    acrossGradient(ctx, win, lf, (bm) => rgba(shade(color(bm, 'near'), env, 0))));
  drawRiverBand(ctx, layout, state, lf, heightAt, env, 0);
  drawCrossingBand(ctx, layout, state, lf, heightAt, env, { haze: 0, waitingCars: false });
  drawStreetside(ctx, layout, lf, heightAt, env);
  const s = win.h * 0.05;
  forEachSlot(win, lf, s * 0.9, s * 2, 68, (i, x, wx, bm) => {
    if (hash(i, 69) > (0.35 + num(bm, 'trees') * 0.4) * (1 - num(bm, 'city') * 0.8)) return;
    const fill = rgba(shade(scale(mix(color(bm, 'near'), color(bm, 'leaf'), 0.5), 0.85), env, 0));
    drawBush(ctx, x, heightAt(wx) + s * 0.3, s * (0.6 + hash(i, 74) * 0.8), fill);
  });
  drawFence(ctx, layout, lf, heightAt, env);
}

function drawPoles(ctx, layout, state, env) {
  const { win, u } = layout;
  const lf = layerFrame(layout, state, 1);
  const spacing = 50 * lf.px;
  const top = win.y + win.h * 0.06;
  const armY = top + u * 1.2;
  const first = Math.floor(lf.offset / spacing) - 1;
  const last = Math.floor((lf.offset + win.w) / spacing) + 1;
  const xAt = (k) => win.x + k * spacing - lf.offset;
  // No trackside poles on bridges or along platforms.
  const standing = (k) => !bridgeAt(k * 50) && stationsBetween(k * 50, k * 50).length === 0;
  ctx.strokeStyle = rgba(shade(WIRE, env), 0.85);
  ctx.lineWidth = Math.max(1, u * 0.12);
  ctx.beginPath();
  for (let k = first; k < last; k++) {
    if (!standing(k) || !standing(k + 1)) continue;
    [-2.2, 2.2].forEach((dx, j) => {
      const y = armY - u * 0.3;
      const sag = win.h * (0.06 + j * 0.012);
      ctx.moveTo(xAt(k) + dx * u, y);
      ctx.quadraticCurveTo(xAt(k) + spacing / 2, y + sag * 2, xAt(k + 1) + dx * u, y);
    });
  }
  ctx.stroke();
  ctx.fillStyle = rgba(shade(POLE, env));
  for (let k = first; k <= last; k++) {
    if (!standing(k)) continue;
    const x = xAt(k);
    ctx.fillRect(x - u * 0.45, top, u * 0.9, win.h * 1.1);
    ctx.fillRect(x - u * 3, armY, u * 6, u * 0.6);
    ctx.fillRect(x - u * 2.35, armY - u * 0.6, u * 0.3, u * 0.6);
    ctx.fillRect(x + u * 2.05, armY - u * 0.6, u * 0.3, u * 0.6);
  }
}

function drawRush(ctx, layout, state, env) {
  const { win, u } = layout;
  const lf = layerFrame(layout, state, 1.6);
  const heightAt = (wx) => win.y + win.h * 0.9 - fbm(wx * 0.02, 81, 2) * win.h * 0.05;
  fillRidge(ctx, traceRidge(win, lf, heightAt), win.y + win.h + 40,
    acrossGradient(ctx, win, lf, (bm) => rgba(shade(scale(color(bm, 'ground'), 0.8), env))));
  const blur = Math.max(u * 0.3, Math.min(u * 14, (state.speed * lf.px) / 60));
  const light = rgba(shade(hex('#b8ad90'), env), 0.35);
  const dark = rgba(shade(hex('#1f1a14'), env), 0.4);
  forEachSlot(win, lf, u * 0.8, blur, 82, (i, x) => {
    ctx.fillStyle = hash(i, 84) > 0.5 ? light : dark;
    ctx.fillRect(x, win.y + win.h * (0.92 + hash(i, 83) * 0.08), blur, Math.max(1, u * 0.15));
  });
}

function drawRainStreaks(ctx, layout, state) {
  if (state.rain < 0.02) return;
  const { win, u, px } = layout;
  const drift = state.distance * px * 0.9 + state.time * u * 3;
  const dx = -(u * 0.5 + state.speed * 0.08 * u);
  ctx.strokeStyle = `rgba(210,220,235,${0.28 * state.rain})`;
  ctx.lineWidth = Math.max(1, u * 0.08);
  ctx.beginPath();
  for (let i = 0; i < Math.round(state.rain * 90); i++) {
    const x = win.x + mod(hash(i, 1) * win.w - drift * (0.6 + hash(i, 3) * 0.4), win.w);
    const y = win.y + mod(hash(i, 2) * win.h + state.time * win.h * 1.6, win.h);
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y + u * 2.2);
  }
  ctx.stroke();
}

export function drawLandscape(ctx, layout, state, env) {
  MOUNTAINS.forEach((cfg) => drawMountains(ctx, layout, state, env, cfg));
  drawBalloons(ctx, layout, state, env);
  drawSkyline(ctx, layout, state, env);
  drawWater(ctx, layout, state, env);
  drawHills(ctx, layout, state, env);
  drawFields(ctx, layout, state, env);
  drawParallelRoad(ctx, layout, state, env);
  drawNear(ctx, layout, state, env);
  drawPoles(ctx, layout, state, env);
  drawRush(ctx, layout, state, env);
  drawCrossingGates(ctx, layout, state, env);
  drawBridges(ctx, layout, state, env);
  drawStations(ctx, layout, state, env);
  drawRainStreaks(ctx, layout, state);
  drawTunnels(ctx, layout, state, env);
}
