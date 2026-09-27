import { biomeAt, num, pick } from './biomes.js';
import { drawDistantLights } from './nightView.js';
import { drawViaduct } from './viaduct.js';
import { drawBridges, drawRiverBand } from './bridge.js';
import { drawCityBlock, drawSkyline, drawStreetside } from './city.js';
import { drawBoats, drawLighthouses } from './coast.js';
import { drawCropPatches, drawFarmProp, drawFence, farmPropKind } from './farm.js';
import { acrossGradient, fillRidge, forEachSlot, layerFrame, traceRidge } from './layers.js';
import { drawBush, drawHouse, drawTree } from './props.js';
import { bridgeAt } from './rivers.js';
import { drawCrossingBand, drawCrossingGates, drawParallelRoad } from './roadView.js';
import { snowCover, tint } from './seasons.js';
import { shade } from './sky.js';
import { drawBalloons } from './skylife.js';
import { drawStations } from './stationView.js';
import { stationsBetween } from './stations.js';
import { drawTunnels } from './tunnel.js';
import { drawMist, drawPrecipitation, precipitationKind } from './weatherView.js';
import { drawWhale, drawWildlife } from './wildlife.js';
import { fbm, hash, hex, mix, noise1, rgba, scale } from './utils.js';

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
const BLOSSOM = hex('#f4b6c8');
const FLOWERS = ['#f4b6c8', '#fff3a8', '#ffffff', '#c9a0ff'].map(hex);

/** Winter strips broadleaf trees bare and snows on pines; spring puts blossoms on some trees. */
const treeStyle = (bm, env, haze) => ({
  leaf: rgba(shade(tint(bm, 'leaf', env), env, haze)),
  trunk: rgba(shade(TRUNK, env, haze)),
  snow: num(bm, 'snow') > 0.4 || env.season.winter > 0.5 ? rgba(shade(SNOW, env, haze)) : null,
  bare: env.season.winter > 0.5,
  blossom: env.season.spring > 0.5 ? rgba(shade(BLOSSOM, env, haze)) : null,
});

/** Snow on the peaks: mountain biomes always, everywhere in winter. */
const peakSnow = (bm, env) => Math.max(num(bm, 'snow'), env.season.winter * 0.8);

function houseStyle(id, env, haze) {
  const lit = env.light < 0.45 && hash(id, 301) > 0.25;
  return {
    wall: rgba(shade(WALLS[Math.floor(hash(id, 302) * WALLS.length)], env, haze)),
    roof: rgba(shade(snowCover(ROOFS[Math.floor(hash(id, 303) * ROOFS.length)], env, 0.85), env, haze)),
    window: lit ? rgba(LAMP) : rgba(shade(DARK_GLASS, env, haze)),
  };
}

const MOUNTAINS = [
  { key: 'far', depth: 0.02, freq: 0.0021, amp: 0.36, seed: 11, haze: 0.55, snowLine: 0.16, drop: 0 },
  { key: 'mid', depth: 0.05, freq: 0.0036, amp: 0.24, seed: 23, haze: 0.32, snowLine: 0.11, drop: 0.03 },
];

function drawSnowCaps(ctx, pts, snowLine, band, fill, env) {
  if (!pts.some((p) => p.y < snowLine && peakSnow(p.bm, env) > 0.01)) return;
  ctx.fillStyle = fill;
  ctx.beginPath();
  pts.forEach((p) => ctx.lineTo(p.x, p.y));
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    const cap = Math.max(0, Math.min(snowLine - p.y, band));
    ctx.lineTo(p.x, p.y + cap * peakSnow(p.bm, env) * (0.6 + 0.5 * noise1(p.wx * 0.05, 5)));
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
  const fill = acrossGradient(ctx, win, lf, (bm) => rgba(shade(tint(bm, cfg.key, env), env, cfg.haze)));
  fillRidge(ctx, pts, win.y + win.h + 40, fill);
  drawSnowCaps(ctx, pts, horizon - win.h * cfg.snowLine, win.h * 0.14, rgba(shade(SNOW, env, cfg.haze * 0.8)), env);
}

/** Mountains mirrored in still lake water (only where the biome has `mirror`). */
function drawReflection(ctx, layout, state, env, top) {
  const { win } = layout;
  const cfg = MOUNTAINS[1];
  const lf = layerFrame(layout, state, cfg.depth);
  const depthAt = (wx, bm) => (0.3 + 0.7 * fbm(wx * cfg.freq, cfg.seed, 5)) * win.h * cfg.amp * num(bm, 'mtn') * num(bm, 'mirror');
  const pts = traceRidge(win, lf, (wx, bm) => top + depthAt(wx, bm) * 0.55);
  const fill = acrossGradient(ctx, win, lf, (bm) => rgba(shade(tint(bm, cfg.key, env), env, cfg.haze + 0.15), 0.55 * num(bm, 'mirror')));
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, top);
  pts.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, top);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

/** Vineyard rows on the fields: posts with leafy vines (grapes from summer to autumn). */
function drawVines(ctx, layout, lf, heightAt, env, seasonPhase) {
  const { win } = layout;
  const s = win.h * 0.022;
  const grapes = env.season.summer + env.season.autumn;
  forEachSlot(win, lf, s * 1.6, s, 631, (i, x, wx, bm) => {
    const vines = num(bm, 'vines');
    if (vines < 0.1 || hash(i, 632) > vines) return;
    for (let row = 0; row < 3; row++) {
      const y = heightAt(wx, bm) + s * (0.6 + row * 1.4);
      const size = s * (0.8 + row * 0.35);
      ctx.fillStyle = rgba(shade(hex('#5a4030'), env, 0.05));
      ctx.fillRect(x - size * 0.05, y - size, size * 0.1, size);
      ctx.fillStyle = rgba(shade(tint(bm, 'leaf', env), env, 0.05));
      ctx.beginPath();
      ctx.ellipse(x, y - size * 0.9, size * 0.55, size * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      if (grapes > 0.3 && hash(i + row, 633) < 0.6) {
        ctx.fillStyle = rgba(shade(hex('#5b2a5e'), env, 0.05));
        ctx.beginPath();
        ctx.arc(x + size * 0.2, y - size * 0.7, size * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

function drawWater(ctx, layout, state, env) {
  const { win, horizon, u } = layout;
  const lf = layerFrame(layout, state, 0.08);
  const top = horizon + win.h * 0.02;
  const base = shade(mix(WATER, env.bottom, 0.3), env, 0.1);
  ctx.fillStyle = acrossGradient(ctx, win, lf, (bm) => rgba(base, num(bm, 'water')));
  ctx.fillRect(win.x - lf.margin, top, win.w + lf.margin * 2, win.y + win.h - top + 40);
  drawReflection(ctx, layout, state, env, top);
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
  drawWhale(ctx, layout, state, env, top);
}

function drawHills(ctx, layout, state, env) {
  const { win, horizon } = layout;
  const lf = layerFrame(layout, state, 0.12);
  const haze = 0.18;
  const heightAt = (wx, bm) =>
    horizon + win.h * (0.05 + num(bm, 'water') * 0.14) - fbm(wx * 0.005, 37, 3) * win.h * 0.1 * num(bm, 'hillAmp');
  fillRidge(ctx, traceRidge(win, lf, heightAt), win.y + win.h + 40,
    acrossGradient(ctx, win, lf, (bm) => rgba(shade(tint(bm, 'hills', env), env, haze))));
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
  drawMist(ctx, layout, state, env, horizon + win.h * 0.06, win.h * 0.06, 1601);
}

export const FIELDS_DEPTH = 0.3;
const fieldsHeight = ({ win, horizon }) => (wx, bm) =>
  horizon + win.h * (0.2 + num(bm, 'water') * 0.08) - fbm(wx * 0.006, 51, 2) * win.h * 0.05;

/** What stands in a fields-layer slot: shared by the drawing and by click hit-testing. */
function fieldSlotKind(i, bm) {
  const r = hash(i, 53);
  if (hash(i, 56) < num(bm, 'city') * 0.6) return 'city';
  if (hash(i, 57) < num(bm, 'farm') * 0.12) return 'farm';
  if (r < num(bm, 'trees') * 0.7) return 'tree';
  return r > 1 - num(bm, 'houses') * 0.35 ? 'house' : null;
}

/** Visits the objects of the fields layer with their screen position (outside-view coordinates). */
function forEachFieldObject(layout, state, fn) {
  const lf = layerFrame(layout, state, FIELDS_DEPTH);
  const heightAt = fieldsHeight(layout);
  const s = layout.win.h * 0.12;
  forEachSlot(layout.win, lf, s * 0.45, s * 1.2, 52, (i, x, wx, bm) => {
    const kind = fieldSlotKind(i, bm);
    if (kind) fn({ i, x, wx, y: heightAt(wx, bm) + s * 0.06, s, bm, kind });
  });
}

/** Farm props currently in view (for clicks on animals, barns, windmills...). */
export function farmPropsInView(layout, state) {
  const props = [];
  forEachFieldObject(layout, state, (o) => {
    if (o.kind === 'farm') props.push({ ...o, prop: farmPropKind(o.i) });
  });
  return props;
}

function drawFields(ctx, layout, state, env) {
  const { win, horizon } = layout;
  const lf = layerFrame(layout, state, FIELDS_DEPTH);
  const haze = 0.06;
  const heightAt = fieldsHeight(layout);
  fillRidge(ctx, traceRidge(win, lf, heightAt), win.y + win.h + 40,
    acrossGradient(ctx, win, lf, (bm) => rgba(shade(tint(bm, 'field', env), env, haze))));
  drawCropPatches(ctx, win, lf, heightAt, env, { spacing: win.h * 0.45, seed: 601, haze, rowGap: win.h * 0.006 });
  drawRiverBand(ctx, layout, state, lf, heightAt, env, haze);
  drawCrossingBand(ctx, layout, state, lf, heightAt, env, { haze, waitingCars: true });
  forEachFieldObject(layout, state, ({ i, x, y, s, bm, kind }) => {
    if (kind === 'city') drawCityBlock(ctx, x, y, s, env, haze, i, state.time, layout.u, num(bm, 'city'));
    else if (kind === 'farm') drawFarmProp(ctx, x, y, s, env, haze, i, state.time);
    else if (kind === 'tree') drawTree(ctx, pick(bm, hash(i, 54)).tree, x, y, s * (0.7 + hash(i, 55) * 0.6), treeStyle(bm, env, haze));
    else drawHouse(ctx, x, y, s * 0.7, houseStyle(i + 7000, env, haze));
  });
  drawVines(ctx, layout, lf, heightAt, env, state.seasonPhase);
  drawWildlife(ctx, layout, state, env, heightAt);
  drawMist(ctx, layout, state, env, horizon + win.h * 0.2, win.h * 0.07, 1611);
}

/** Spring meadow flowers scattered in the trackside grass. */
function drawFlowers(ctx, layout, lf, heightAt, env) {
  const spring = env.season.spring;
  if (spring < 0.1) return;
  const { win, u } = layout;
  forEachSlot(win, lf, u * 0.9, 0, 1621, (i, x, wx, bm) => {
    if (num(bm, 'city') > 0.5 || hash(i, 1622) > 0.6) return;
    ctx.fillStyle = rgba(shade(FLOWERS[Math.floor(hash(i, 1623) * FLOWERS.length)], env), spring);
    ctx.fillRect(x, heightAt(wx) + u * (0.3 + hash(i, 1624) * 1.5), Math.max(1.5, u * 0.3), Math.max(1.5, u * 0.3));
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
    acrossGradient(ctx, win, lf, (bm) => rgba(shade(tint(bm, 'near', env), env, 0))));
  drawRiverBand(ctx, layout, state, lf, heightAt, env, 0);
  drawCrossingBand(ctx, layout, state, lf, heightAt, env, { haze: 0, waitingCars: false });
  drawStreetside(ctx, layout, lf, heightAt, env);
  const s = win.h * 0.05;
  forEachSlot(win, lf, s * 0.9, s * 2, 68, (i, x, wx, bm) => {
    if (hash(i, 69) > (0.35 + num(bm, 'trees') * 0.4) * (1 - num(bm, 'city') * 0.8)) return;
    const fill = rgba(shade(scale(mix(tint(bm, 'near', env), tint(bm, 'leaf', env), 0.5), 0.85), env, 0));
    drawBush(ctx, x, heightAt(wx) + s * 0.3, s * (0.6 + hash(i, 74) * 0.8), fill);
  });
  drawFlowers(ctx, layout, lf, heightAt, env);
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
    acrossGradient(ctx, win, lf, (bm) => rgba(shade(scale(tint(bm, 'ground', env), 0.8), env))));
  const blur = Math.max(u * 0.3, Math.min(u * 14, (state.speed * lf.px) / 60));
  const light = rgba(shade(hex('#b8ad90'), env), 0.35);
  const dark = rgba(shade(hex('#1f1a14'), env), 0.4);
  forEachSlot(win, lf, u * 0.8, blur, 82, (i, x) => {
    ctx.fillStyle = hash(i, 84) > 0.5 ? light : dark;
    ctx.fillRect(x, win.y + win.h * (0.92 + hash(i, 83) * 0.08), blur, Math.max(1, u * 0.15));
  });
}

export function drawLandscape(ctx, layout, state, env) {
  drawMountains(ctx, layout, state, env, MOUNTAINS[0]);
  drawDistantLights(ctx, layout, state, env);
  drawMountains(ctx, layout, state, env, MOUNTAINS[1]);
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
  drawViaduct(ctx, layout, state, env);
  drawStations(ctx, layout, state, env);
  drawPrecipitation(ctx, layout, state, env, precipitationKind(env, num(biomeAt(state.distance), 'snow')));
  drawTunnels(ctx, layout, state, env);
}
