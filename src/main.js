import { drawAisle } from './aisle.js';
import { createAudio } from './audio.js';
import { aisleEventAt, coffeeHot, cupWithPassenger } from './cabin.js';
import { biomeAt, biomeName, num } from './biomes.js';
import { drawCompanion } from './companionView.js';
import { createArrival } from './arrival.js';
import { createControls } from './controls.js';
import { createFog } from './fog.js';
import { LOOK_FAR } from './frame.js';
import { drawDrops, drawGlass } from './glass.js';
import { hitTest } from './interactions.js';
import { drawFloats, drawSpeech } from './interactionsView.js';
import {
  drawCord, drawCurtains, drawRadio, drawFrame, drawLamp, drawLedge, drawVignette, drawWall, interiorLighting,
} from './interior.js';
import { createJournal } from './journal.js';
import { initialState, stationInfo, step, trainBob } from './journey.js';
import { drawLandscape } from './landscape.js';
import { createModes } from './modes.js';
import { createRadio } from './radio.js';
import { drawPassenger, drawReflection, passengerOrigin } from './passenger.js';
import { drawPassingTrain, passDuration, passingCoverage } from './passingTrain.js';
import { createPointer } from './pointer.js';
import { crossingNear } from './roads.js';
import { SEASON_NAMES, dominantSeason } from './seasons.js';
import { burstsExploded, drawFireworks, drawShootingStar } from './rareSky.js';
import { drawSky, environment } from './sky.js';
import { drawSkyLife } from './skylife.js';
import { tunnelCoverage } from './tunnel.js';
import { flashLevel, thunderDelay, weatherTargets } from './weather.js';
import { clamp } from './utils.js';
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

function render(ctx, layout, state, { fog, dt, station }) {
  const env = sceneEnvironment(state);
  const blocked = Math.max(tunnelCoverage(layout, state), passingCoverage(layout, state));
  const L = interiorLighting(env, blocked, { lampMode: state.lampMode, curtains: state.curtains });
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
  drawShootingStar(ctx, layout, state, env);
  drawFireworks(ctx, layout, state, env);
  drawLandscape(ctx, layout, state, env);
  drawPassingTrain(ctx, layout, state, env);
  drawFloats(ctx, layout, state);
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
  drawCurtains(ctx, layout, L, Math.sin(state.time * 0.9) * u * 0.4 + bob * 0.5, state.curtains);
  drawCord(ctx, layout, L, state.time < state.brakeUntil ? clamp((state.brakeUntil - state.time - 5) / 2) : 0);
  drawLedge(ctx, layout, L, state.time, bob, {
    x: passengerOrigin(layout).x + u * 22,
    level: state.coffee,
    hot: coffeeHot(state),
    inHand: state.pose.sip > 0.3 || cupWithPassenger(aisleEventAt(state.time, state.dayTime)),
  });
  drawRadio(ctx, layout, L, station, state.time);
  drawLamp(ctx, layout, L);
  ctx.save();
  ctx.translate(-lookX * u * 4, -lookY * u * 2);
  drawPassenger(ctx, layout, state, L, env, bob);
  drawCompanion(ctx, layout, state, L);
  ctx.restore();
  ctx.save();
  ctx.translate(-lookX * u * 7, -lookY * u * 3);
  drawAisle(ctx, layout, state, L);
  ctx.restore();
  drawSpeech(ctx, layout, state);
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

function updatePanel(controls, state, input, destinationText) {
  controls.showHud({
    km: state.distance / 1000,
    biome: biomeName(state.distance),
    kmh: state.speed * 3.6,
    station: destinationText ?? stationInfo(state, input.stops),
  });
  const weather = WEATHER_NAMES[weatherTargets(input, state.time).mode];
  const season = SEASON_NAMES[dominantSeason(sceneEnvironment(state).season)];
  controls.showConditions(input.weather === 'auto' ? weather : '', input.season === 'auto' ? season : '');
}

/**
 * Turns clicks into simulation events: hit-tests against the last rendered frame, plays the
 * matching sound, and queues the event for the next step. Empty space toggles the panel.
 */
function createClicks({ canvas, audio, radio, controls, getScene }) {
  let pending = [];
  const targetAt = (p) => {
    const { view, state } = getScene();
    if (!view || view.W <= 0) return null;
    return hitTest(view, state, sceneEnvironment(state), trainBob(state, view.u), p);
  };
  const pointer = createPointer(canvas, {
    onTap: (p) => {
      const event = targetAt(p);
      if (!event) {
        controls.togglePanel();
        return;
      }
      if (event.type === 'radio') {
        radio.next();
        return;
      }
      audio.sfx(event.sound);
      pending = [...pending, event];
    },
    onHover: (p) => { canvas.style.cursor = targetAt(p) ? 'pointer' : ''; },
  });
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || e.repeat || e.target.closest?.('input, select, button')) return;
    e.preventDefault();
    audio.whistle();
  });
  return {
    pointer,
    /** Queue an event that doesn't come from a canvas click (e.g. the arrival card buttons). */
    queue(event) { pending = [...pending, event]; },
    takeEvents() {
      const taken = pending;
      pending = [];
      return taken;
    },
  };
}

/** The radio plus its panel controls (station select and volume), kept in sync both ways. */
function createRadioControls(doc) {
  const select = doc.getElementById('radio-station');
  const volume = doc.getElementById('radio-volume');
  const radio = createRadio({ onChange: (station) => { select.value = station; } });
  const report = (err) => console.error('Radio unavailable:', err);
  select.addEventListener('change', () => radio.tune(select.value).catch(report));
  volume.addEventListener('input', () => radio.setVolume(Number(volume.value)));
  return { ...radio, get station() { return radio.station; }, next: () => radio.next().catch(report) };
}

function start() {
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');
  const controls = createControls(document);
  const audio = createAudio();
  const fog = createFog();
  let scene = { view: null, state: null };
  const radio = createRadioControls(document);
  const clicks = createClicks({ canvas, audio, radio, controls, getScene: () => scene });
  const { pointer } = clicks;
  const journal = createJournal(document, { onDiscover: () => audio.sfx('discover') });
  const arrival = createArrival(document, {
    panel: document.getElementById('panel'),
    onContinue: () => clicks.queue({ type: 'continue' }),
    foundCount: journal.foundCount,
  });

  let layout = resizeCanvas(canvas, ctx);
  const params = new URLSearchParams(window.location.search);
  const modes = createModes(document, {
    canvas,
    panel: document.getElementById('panel'),
    params,
    chime: () => audio.chime(),
    radio,
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
    state = step(state, dt, { ...input, destination: arrival.destination(), events: clicks.takeEvents() });
    arrival.update(state);
    playSounds(audio, state);
    modes.tick(state.distance, state.destination);
    if (input.autoDay) controls.showDayTime(state.dayTime);
    hudTimer += dt;
    if (hudTimer > HUD_INTERVAL) {
      hudTimer = 0;
      updatePanel(controls, state, input, arrival.boardText(state, input.targetKmh));
    }
    const look = pointer.updateLook(dt);
    const strokes = pointer.takeStrokes();
    if (layout.W > 0 && layout.H > 0) {
      if (state.fog > 0.1 && strokes.length > 0) fog.wipe(strokes, layout);
      const view = { ...layout, lookX: look.x, lookY: look.y };
      render(ctx, view, state, { fog, dt, station: radio.station });
      scene = { view, state };
      const env = sceneEnvironment(state);
      journal.observe(state, env, view);
      const booms = burstsExploded(state.time - dt, state, env, view);
      if (booms > 0) audio.sfx('boom');
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

start();
