import { drawAisle } from './aisle.js';
import { drawBaggageFront, drawBaggageRoom } from './baggageView.js';
import { biomeAt, nightLine, num } from './biomes.js';
import { drawCabDash } from './cabDash.js';
import { drawCabOutside } from './cabView.js';
import { aisleEventAt, beatAt, coffeeHot, cupWithPassenger } from './cabin.js';
import { cabinTheme } from './cabinThemes.js';
import { carLayout } from './cars.js';
import { companionLine } from './companion.js';
import { drawCompanion } from './companionView.js';
import { drawDiningRoom, drawDiningTable } from './diningView.js';
import { LOOK_FAR } from './frame.js';
import { drawDrops, drawGlass } from './glass.js';
import { drawCityReflections } from './cityNight.js';
import { drawFloats, drawSpeech, drawThought } from './interactionsView.js';
import {
  drawCord, drawCurtains, drawRadio, drawFrame, drawLamp, drawLedge, drawVignette, drawWall, interiorLighting,
} from './interior.js';
import { trainBob } from './journey.js';
import { drawLandscape } from './landscape.js';
import { drawAurora } from './nightView.js';
import { drawStarSky } from './starSky.js';
import { drawPanoramaFrame } from './panoramaView.js';
import { drawSleeper } from './sleeperView.js';
import { isNight } from './clock.js';
import { drawPassenger, drawReflection, passengerOrigin } from './passenger.js';
import { drawPassingTrain, passingCoverage } from './passingTrain.js';
import { passerbyAt } from './passersby.js';
import { drawPasserby } from './passersbyView.js';
import { drawPlatformScene } from './platformScene.js';
import { drawFireworks, drawShootingStar } from './rareSky.js';
import { thoughtAt } from './thoughts.js';
import { drawSky } from './sky.js';
import { drawSkyLife } from './skylife.js';
import { tunnelCoverage } from './tunnel.js';
import { clamp } from './utils.js';
import { doubleRainbow, drawLightning, drawRainbow, precipitationKind } from './weatherView.js';
import { drawSkywriter } from './rareEvents.js';

/** Something is already going on around her, so she won't drift into her own thoughts. */
function isBusy(state) {
  return Boolean(state.speech || state.holding || state.pose.sleep > 0.5
    || companionLine(state, null) || beatAt(aisleEventAt(state.time, state.dayTime))
    || passerbyAt(state.time, state.dayTime));
}

/** The world through the window (`view.win`), with glass, fog and raindrops on top. */
function drawOutside(ctx, view, state, env, { L, blocked, bob, fog, dt, alone = false }) {
  const { win, u, lookX, lookY } = view;
  const falling = precipitationKind(env, num(biomeAt(state.distance), 'snow'));
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(win.x, win.y, win.w, win.h, win.r);
  ctx.clip();
  ctx.save();
  ctx.translate(lookX * u * LOOK_FAR, bob + lookY * u * 3);
  drawSky(ctx, view, state, env);
  drawStarSky(ctx, view, state, env, nightLine(state.distance));
  drawAurora(ctx, view, state, env);
  drawRainbow(ctx, view, env, doubleRainbow(state));
  drawLightning(ctx, view, state.lightning);
  drawSkyLife(ctx, view, state, env);
  drawSkywriter(ctx, view, state, env);
  drawShootingStar(ctx, view, state, env);
  drawFireworks(ctx, view, state, env);
  drawLandscape(ctx, view, state, env);
  drawPassingTrain(ctx, view, state, env);
  drawFloats(ctx, view, state);
  ctx.restore();
  if (env.flash > 0.01) {
    ctx.fillStyle = `rgba(235,240,255,${env.flash * 0.35 * (1 - blocked)})`;
    ctx.fillRect(win.x, win.y, win.w, win.h);
  }
  if (!alone) drawReflection(ctx, view, state, L); // no one sits by the baggage door
  drawCityReflections(ctx, view, state, env);
  drawGlass(ctx, view, L);
  fog.draw(ctx, view, state.fog, dt);
  drawDrops(ctx, view, state, falling === 'rain' ? state.rain : 0);
  ctx.restore();
}

function drawLedgeFor(ctx, layout, state, L, bob) {
  drawLedge(ctx, layout, L, state.time, bob, {
    x: passengerOrigin(layout).x + layout.u * 22,
    level: state.coffee,
    hot: coffeeHot(state),
    inHand: state.pose.sip > 0.3 || cupWithPassenger(aisleEventAt(state.time, state.dayTime)),
  }, { apple: state.time < state.appleUntil });
}

/** Her in her seat (and whoever sits across, in the seated cars). */
function drawHer(ctx, layout, state, env, L, bob, companion) {
  const { u, lookX, lookY } = layout;
  ctx.save();
  ctx.translate(-lookX * u * 4, -lookY * u * 2);
  drawPassenger(ctx, layout, state, L, env, bob);
  if (companion) drawCompanion(ctx, layout, state, L);
  ctx.restore();
}

/** Passenger compartment or dining car: her seat by the window with everything around it. */
function renderSeated(ctx, layout, state, env, ctxOpts) {
  const { L, bob, station, intention } = ctxOpts;
  const { u, lookX, lookY } = layout;
  const dining = state.car === 'dining';
  if (dining) drawDiningRoom(ctx, layout, L);
  else drawWall(ctx, layout, L);
  drawOutside(ctx, layout, state, env, ctxOpts);
  drawFrame(ctx, layout, L);
  drawCurtains(ctx, layout, L, Math.sin(state.time * 0.9) * u * 0.4 + bob * 0.5, state.curtains);
  drawCord(ctx, layout, L, state.time < state.brakeUntil ? clamp((state.brakeUntil - state.time - 5) / 2) : 0);
  drawLedgeFor(ctx, layout, state, L, bob);
  if (dining) drawDiningTable(ctx, layout, L, state);
  else drawRadio(ctx, layout, L, station, state.time);
  drawLamp(ctx, layout, L);
  drawHer(ctx, layout, state, env, L, bob, true);
  ctx.save();
  ctx.translate(-lookX * u * 7, -lookY * u * 3);
  drawAisle(ctx, layout, state, L);
  drawPasserby(ctx, layout, state, L);
  ctx.restore();
  drawSpeech(ctx, layout, state);
  const thought = thoughtAt(state, env, isBusy(state), intention);
  if (thought) drawThought(ctx, layout, thought);
}

/** Panorama car: the window runs into the glass roof; she sits alone, looking up. */
function renderPanorama(ctx, layout, state, env, ctxOpts) {
  const { L, bob, intention } = ctxOpts;
  const view = carLayout(layout, 'panorama');
  drawWall(ctx, layout, L);
  drawOutside(ctx, view, state, env, ctxOpts);
  drawPanoramaFrame(ctx, view, L);
  drawLedgeFor(ctx, layout, state, L, bob);
  drawHer(ctx, layout, state, env, L, bob, false);
  drawSpeech(ctx, layout, state);
  const thought = thoughtAt(state, env, isBusy(state), intention);
  if (thought) drawThought(ctx, layout, thought);
}

/** Sleeper car: the window above the lower berth where she lies under the quilt. */
function renderSleeper(ctx, layout, state, env, ctxOpts) {
  const { L, bob } = ctxOpts;
  drawWall(ctx, layout, L);
  drawOutside(ctx, layout, state, env, { ...ctxOpts, alone: true });
  drawFrame(ctx, layout, L);
  drawCurtains(ctx, layout, L, bob * 0.5, Math.max(state.curtains, 0.25));
  drawSleeper(ctx, layout, L, state, !isNight(state.dayTime));
  drawSpeech(ctx, layout, state);
}

/** Baggage car: crates and suitcases, the world through the half-open sliding door, a cat. */
function renderBaggage(ctx, layout, state, env, ctxOpts) {
  const view = carLayout(layout, 'baggage');
  drawBaggageRoom(ctx, layout, ctxOpts.L);
  drawOutside(ctx, view, state, env, { ...ctxOpts, alone: true });
  drawBaggageFront(ctx, layout, view, ctxOpts.L, state);
}

/** The whole frame for the car she is in (or the platform scene while she changes trains). */
export function render(ctx, layout, state, sceneEnv, { fog, dt, station, intention, platform, calm = false }) {
  // Reduced motion: no carriage sway and only a faint hint of lightning flashes.
  const env = calm ? { ...sceneEnv, flash: sceneEnv.flash * 0.15 } : sceneEnv;
  if (platform) {
    drawPlatformScene(ctx, layout, env, platform);
    return;
  }
  if (state.car === 'cab') {
    drawCabOutside(ctx, layout, state, env);
    drawCabDash(ctx, layout, state, env, state.hornUntil);
    drawVignette(ctx, layout);
    return;
  }
  const blocked = Math.max(tunnelCoverage(layout, state), passingCoverage(layout, state));
  const L = interiorLighting(env, blocked, { lampMode: state.lampMode, curtains: state.curtains, theme: cabinTheme(state.distance) });
  const opts = { L, blocked, bob: calm ? 0 : trainBob(state, layout.u), fog, dt, station, intention };
  if (state.car === 'panorama') renderPanorama(ctx, layout, state, env, opts);
  else if (state.car === 'baggage') renderBaggage(ctx, layout, state, env, opts);
  else if (state.car === 'sleeper') renderSleeper(ctx, layout, state, env, opts);
  else renderSeated(ctx, layout, state, env, opts);
  drawVignette(ctx, layout);
  if (env.flash > 0.01) {
    ctx.fillStyle = `rgba(225,232,255,${env.flash * 0.12 * (1 - blocked)})`;
    ctx.fillRect(0, 0, layout.W, layout.H);
  }
}
