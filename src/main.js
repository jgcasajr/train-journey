import { drawAisle } from './aisle.js';
import { createAudio } from './audio.js';
import { coffeeHot } from './cabin.js';
import { biomeAt, biomeName, num } from './biomes.js';
import { createControls } from './controls.js';
import { createFog } from './fog.js';
import { LOOK_FAR } from './frame.js';
import { drawDrops, drawGlass } from './glass.js';
import {
  drawCurtains, drawFrame, drawLamp, drawLedge, drawVignette, drawWall, interiorLighting,
} from './interior.js';
import { initialState, stationInfo, step, trainBob } from './journey.js';
import { drawLandscape } from './landscape.js';
import { createModes } from './modes.js';
import { drawPassenger, drawReflection, passengerOrigin } from './passenger.js';
import { drawPassingTrain, passDuration, passingCoverage } from './passingTrain.js';
import { createPointer } from './pointer.js';
import { crossingNear } from './roads.js';
import { SEASON_NAMES, dominantSeason } from './seasons.js';
import { drawSky, environment } from './sky.js';
import { drawSkyLife } from './skylife.js';
import { tunnelCoverage } from './tunnel.js';
import { flashLevel, thunderDelay, weatherTargets } from './weather.js';
import { drawLightning, drawRainbow, precipitationKind } from './weatherView.js';

const WEATHER_NAMES = { clear: 'Limpo', rain: 'Chuva', storm: 'Tempestade' };

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
const sceneEnvironment = (state) => environment(state.dayTime, {
  rain: state.rain,
  storm: state.storm,
  wetness: state.wetness,
  flash: flashLevel(state.lightning),
  seasonPhase: state.seasonPhase,
});

function render(ctx, layout, state, { fog, dt }) {
  const env = sceneEnvironment(state);
  const blocked = Math.max(tunnelCoverage(layout, state), passingCoverage(layout, state));
  const L = interiorLighting(env, blocked);
  const bob = trainBob(state, layout.u);
  const { win, u, lookX, lookY } = layout;
  const falling = precipitationKind(env, num(biomeAt(state.distance), 'snow'));

  drawWall(ctx, layout, L);

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(win.x, win.y, win.w, win.h, win.r);
  ctx.clip();
  ctx.save();
  ctx.translate(lookX * u * LOOK_FAR, bob + lookY * u * 3);
  drawSky(ctx, layout, state, env);
  drawRainbow(ctx, layout, env);
  drawLightning(ctx, layout, state.lightning);
  drawSkyLife(ctx, layout, state, env);
  drawLandscape(ctx, layout, state, env);
  drawPassingTrain(ctx, layout, state, env);
  ctx.restore();
  if (env.flash > 0.01) {
    ctx.fillStyle = `rgba(235,240,255,${env.flash * 0.35 * (1 - blocked)})`;
    ctx.fillRect(win.x, win.y, win.w, win.h);
  }
  drawReflection(ctx, layout, state, L);
  drawGlass(ctx, layout, L);
  fog.draw(ctx, layout, state.fog, dt);
  drawDrops(ctx, layout, state, falling === 'rain' ? state.rain : 0);
  ctx.restore();

  drawFrame(ctx, layout, L);
  drawCurtains(ctx, layout, L, Math.sin(state.time * 0.9) * u * 0.4 + bob * 0.5);
  drawLedge(ctx, layout, L, state.time, bob, {
    x: passengerOrigin(layout).x + u * 22,
    level: state.coffee,
    hot: coffeeHot(state),
    inHand: state.pose.sip > 0.3,
  });
  drawLamp(ctx, layout, L);
  ctx.save();
  ctx.translate(-lookX * u * 4, -lookY * u * 2);
  drawPassenger(ctx, layout, state, L, env, bob);
  ctx.restore();
  ctx.save();
  ctx.translate(-lookX * u * 7, -lookY * u * 3);
  drawAisle(ctx, layout, state, L);
  ctx.restore();
  drawVignette(ctx, layout);
  if (env.flash > 0.01) {
    ctx.fillStyle = `rgba(225,232,255,${env.flash * 0.12 * (1 - blocked)})`;
    ctx.fillRect(0, 0, layout.W, layout.H);
  }
}

function playSounds(audio, state) {
  if (state.crossedJoint) audio.clack(state.speed);
  if (state.arrived) audio.chime();
  if (state.departed) audio.whistle();
  if (state.passStarted) audio.passBy(passDuration(state.passing, state.speed));
  if (state.lightningStarted) audio.thunder(thunderDelay(state.lightning), 1 - state.lightning.far);
  audio.update(state.speed, Math.min(1, state.rain + state.storm * 0.5), crossingNear(state.distance, 250));
}

function updatePanel(controls, state, input) {
  controls.showHud({
    km: state.distance / 1000,
    biome: biomeName(state.distance),
    kmh: state.speed * 3.6,
    station: stationInfo(state, input.stops),
  });
  const weather = WEATHER_NAMES[weatherTargets(input, state.time).mode];
  const season = SEASON_NAMES[dominantSeason(sceneEnvironment(state).season)];
  controls.showConditions(input.weather === 'auto' ? weather : '', input.season === 'auto' ? season : '');
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
  const modes = createModes(document, {
    canvas,
    panel: document.getElementById('panel'),
    params,
    chime: () => audio.chime(),
  });
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
    playSounds(audio, state);
    modes.tick(state.distance);
    if (input.autoDay) controls.showDayTime(state.dayTime);
    hudTimer += dt;
    if (hudTimer > HUD_INTERVAL) {
      hudTimer = 0;
      updatePanel(controls, state, input);
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
