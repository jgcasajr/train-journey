import { createAudio } from './audio.js';
import { biomeName } from './biomes.js';
import { createControls } from './controls.js';
import { createFog } from './fog.js';
import { LOOK_FAR } from './frame.js';
import { drawDrops, drawGlass } from './glass.js';
import {
  drawCurtains, drawFrame, drawLamp, drawLedge, drawVignette, drawWall, interiorLighting,
} from './interior.js';
import { initialState, stationInfo, step, trainBob } from './journey.js';
import { drawLandscape } from './landscape.js';
import { drawPassenger } from './passenger.js';
import { drawPassingTrain, passDuration, passingCoverage } from './passingTrain.js';
import { createPointer } from './pointer.js';
import { drawSky, environment } from './sky.js';
import { tunnelCoverage } from './tunnel.js';

const HUD_INTERVAL = 0.25;

function computeLayout(W, H) {
  const u = Math.min(H / 100, W / 70);
  const win = { x: W * 0.08, y: H * 0.1, w: W * 0.84, h: H * (W < H ? 0.5 : 0.58), r: u * 2.5 };
  return { W, H, u, px: u * 1.6, win, horizon: win.y + win.h * 0.55 };
}

function resizeCanvas(canvas, ctx) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return computeLayout(W, H);
}

/**
 * `layout.lookX/lookY` is the viewer's head offset: the view outside shifts with it
 * (far layers most, relative to the frame) and the passenger, nearer than the window, shifts against it.
 */
function render(ctx, layout, state, { fog, dt }) {
  const env = environment(state.dayTime, state.rain);
  const blocked = Math.max(tunnelCoverage(layout, state), passingCoverage(layout, state));
  const L = interiorLighting(env, blocked);
  const bob = trainBob(state, layout.u);
  const { win, u, lookX, lookY } = layout;

  drawWall(ctx, layout, L);

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(win.x, win.y, win.w, win.h, win.r);
  ctx.clip();
  ctx.save();
  ctx.translate(lookX * u * LOOK_FAR, bob + lookY * u * 3);
  drawSky(ctx, layout, state, env);
  drawLandscape(ctx, layout, state, env);
  drawPassingTrain(ctx, layout, state, env);
  ctx.restore();
  drawGlass(ctx, layout, L);
  fog.draw(ctx, layout, state.fog, dt);
  drawDrops(ctx, layout, state);
  ctx.restore();

  drawFrame(ctx, layout, L);
  drawCurtains(ctx, layout, L, Math.sin(state.time * 0.9) * u * 0.4 + bob * 0.5);
  drawLedge(ctx, layout, L, state.time, bob);
  drawLamp(ctx, layout, L);
  ctx.save();
  ctx.translate(-lookX * u * 4, -lookY * u * 2);
  drawPassenger(ctx, layout, state, L, env, bob);
  ctx.restore();
  drawVignette(ctx, layout);
}

function start() {
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');
  const controls = createControls(document);
  const audio = createAudio();
  const fog = createFog();
  const pointer = createPointer(canvas, { onTap: controls.togglePanel });

  let layout = resizeCanvas(canvas, ctx);
  const params = new URLSearchParams(window.location.search);
  const kmParam = params.get('km');
  const start = initialState(controls.read(), kmParam === null ? NaN : Number(kmParam));
  let state = params.has('pass') ? { ...start, nextPassing: 2 } : start;
  let last = performance.now();
  let hudTimer = 0;

  window.addEventListener('resize', () => { layout = resizeCanvas(canvas, ctx); });
  controls.onSoundClick(async (e) => {
    e.stopPropagation();
    try {
      controls.showSound(await audio.toggle());
    } catch (err) {
      console.error('Audio unavailable:', err);
      controls.showSound(false);
    }
  });

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const input = controls.read();
    state = step(state, dt, input);
    if (state.crossedJoint) audio.clack(state.speed);
    if (state.arrived) audio.chime();
    if (state.departed) audio.whistle();
    if (state.passStarted) audio.passBy(passDuration(state.passing, state.speed));
    audio.update(state.speed, state.rain);
    if (input.autoDay) controls.showDayTime(state.dayTime);
    hudTimer += dt;
    if (hudTimer > HUD_INTERVAL) {
      hudTimer = 0;
      controls.showHud({
        km: state.distance / 1000,
        biome: biomeName(state.distance),
        kmh: state.speed * 3.6,
        station: stationInfo(state, input.stops),
      });
    }
    const look = pointer.updateLook(dt);
    const strokes = pointer.takeStrokes();
    if (layout.W > 0 && layout.H > 0) {
      if (state.fog > 0.1 && strokes.length > 0) fog.wipe(strokes, layout);
      render(ctx, { ...layout, lookX: look.x, lookY: look.y }, state, { fog, dt });
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

start();
