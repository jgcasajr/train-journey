import { createAudio } from './audio.js';
import { companionLine } from './companion.js';
import { biomeName, lineKm, nightLine, LINES, lineAt } from './biomes.js';
import { createArrival } from './arrival.js';
import { createControls } from './controls.js';
import { createFog } from './fog.js';
import { hitTest } from './interactions.js';
import { createJournal } from './journal.js';
import { initialState, stationInfo, step, trainBob } from './journey.js';
import { createModes } from './modes.js';
import { moonPhase } from './moon.js';
import { currentLang, t } from './i18n.js';
import { showSplash } from './brand.js';
import { createIntention } from './intention.js';
import { setupInstall } from './install.js';
import { applySharedView, createShare } from './share.js';
import { createLetters } from './letters.js';
import { restoreSettings } from './settings.js';
import { createA11y } from './a11y.js';
import { createAnnouncer } from './announcer.js';
import { createNotebook } from './notebook.js';
import { createSchedule } from './schedule.js';
import { createFocus } from './focus.js';
import { hailAt, windAt } from './weatherFx.js';
import { createTravelers } from './travelers.js';
import { createBreathing } from './breathing.js';
import { createTransfer } from './transfer.js';
import { createRadio } from './radio.js';
import { passDuration } from './passingTrain.js';
import { passerbyAt, passerbyCues } from './passersby.js';
import { createPointer } from './pointer.js';
import { render } from './render.js';
import { crossingNear } from './roads.js';
import { SEASON_NAMES, dominantSeason } from './seasons.js';
import { burstsExploded } from './rareSky.js';
import { environment } from './sky.js';
import { flashLevel, thunderDelay, weatherTargets } from './weather.js';

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
/** The Star Line keeps the sky between 22h and 1h, whatever the clock says. */
const skyTime = (state) => (nightLine(state.distance) ? (0.92 + (state.dayTime % 1) * 0.12) % 1 : state.dayTime);

const sceneEnvironment = (state) => environment(skyTime(state), {
  rain: state.rain,
  storm: state.storm,
  wetness: state.wetness,
  flash: flashLevel(state.lightning),
  seasonPhase: state.seasonPhase,
  moonPhase: moonPhase(state.dayCount, state.dayTime),
  wind: windAt(state),
  hail: hailAt(state),
});

/** Where the aisle character is, left (-1) to right (1), for their sounds. */
function aislePan(state) {
  const ev = passerbyAt(state.time, state.dayTime);
  if (!ev) return 0;
  if (ev.phase === 'stop') return -0.2;
  const p = ev.phase === 'in' ? ev.p * 0.5 : ev.phase === 'out' ? 0.5 + ev.p * 0.5 : ev.p;
  return ev.dir * (p * 2 - 1);
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
    km: lineKm(state.distance),
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
      if (event.type === 'horn') audio.whistle();
      if (event.type === 'radio') {
        radio.next();
        return;
      }
      audio.sfx(event.sound, (p.x / Math.max(1, canvas.clientWidth)) * 2 - 1);
      pending = [...pending, event];
    },
    onHover: (p) => { canvas.style.cursor = targetAt(p) ? 'pointer' : ''; },
  });
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || e.repeat || e.target.closest?.('input, textarea, select, button')) return;
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
  radio.setVolume(Number(volume.value));
  // A station remembered from last time starts with the first tap (browsers need a gesture for audio).
  if (select.value !== 'off') {
    doc.addEventListener('pointerdown', () => radio.tune(select.value).catch(report), { once: true });
  }
  return { ...radio, get station() { return radio.station; }, next: () => radio.next().catch(report) };
}

/** Where and when the train is, written on a postcard. */
function postcardInfo(state) {
  const minutes = Math.round(state.dayTime * 1440) % 1440;
  return {
    biome: biomeName(state.distance),
    station: state.dwell > 0 ? state.served?.name ?? null : null,
    clock: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
    date: new Date().toLocaleDateString(currentLang() === 'pt' ? 'pt-BR' : 'en-GB'),
  };
}

function start() {
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');
  const savedSettings = restoreSettings(document); // saved panel settings first; a shared link (below) overrides them
  const a11y = createA11y(document, { savedSettings });
  applySharedView(document, new URLSearchParams(window.location.search));
  const controls = createControls(document);
  const audio = createAudio();
  const fog = createFog();
  let scene = { view: null, state: null };
  const radio = createRadioControls(document);
  const clicks = createClicks({ canvas, audio, radio, controls, getScene: () => scene });
  const { pointer } = clicks;
  setupInstall(document, { onInstalled: () => journal.award('installed') });
  const letters = createLetters(document, {
    onReceived: () => { journal.award('letterIn'); audio.chime(); },
    onSaveToNotebook: (letter) => notebook.letter(letter, state),
  });
  const share = createShare(document, {
    getView: () => ({ state, input: controls.read() }),
    onShared: (withLetter) => { journal.award('shared'); if (withLetter) journal.award('letterOut'); },
    compose: (replyTo) => letters.compose(replyTo),
  });
  document.getElementById('letter-reply').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('letter-card').classList.add('hidden');
    share.start(letters.replyTarget());
  });
  const notebook = createNotebook(document);
  const journal = createJournal(document, { onDiscover: (fresh, s) => { audio.sfx('discover'); notebook.note(fresh, s); } });
  const travelers = createTravelers({ onRecall: (text) => clicks.queue({ type: 'recall', text }) });
  const arrival = createArrival(document, {
    panel: document.getElementById('panel'),
    onContinue: () => clicks.queue({ type: 'continue' }),
    foundCount: journal.foundCount,
    arrivalNote: (time) => schedule.arrivalNote(time),
  });
  const schedule = createSchedule(document, { onPunctual: () => journal.award('punctual') });
  const focus = createFocus(document, {
    params: new URLSearchParams(window.location.search),
    onChime: () => { radio.bell(); audio.chime(); },
    onBlock: (n) => { journal.award('focus1'); if (n >= 4) journal.award('focus4'); },
    onRelease: () => clicks.queue({ type: 'continue' }),
  });

  let layout = resizeCanvas(canvas, ctx);
  const params = new URLSearchParams(window.location.search);
  showSplash(document, params);
  const modes = createModes(document, {
    canvas,
    panel: document.getElementById('panel'),
    radio,
    describe: () => postcardInfo(state),
    onPostcard: () => journal.award('postcard'),
  });
  const intention = createIntention(document, {
    panel: document.getElementById('panel'),
    onWrite: () => journal.award('intentionWritten'),
    onReturn: () => { journal.award('intentionReturned'); audio.sfx('chime'); },
    makePostcard: (extra) => modes.postcard(extra),
  });
  const transfer = createTransfer(document, {
    onTransfer: () => clicks.queue({ type: 'transfer' }),
    onAnnounce: () => audio.chime(),
  });
  const breathing = createBreathing(document, {
    panel: document.getElementById('panel'),
    onComplete: () => { journal.award('breathing'); audio.chime(); },
  });
  const kmParam = params.get('km');
  const start = initialState(controls.read(), kmParam === null ? NaN : Number(kmParam));
  const day = Number(params.get('dia'));
  const withDay = params.has('dia') && Number.isFinite(day) ? { ...start, dayCount: Math.floor(day) } : start;
  const withBella = params.has('bella') ? { ...withDay, bellaFirst: 3 } : withDay; // ?bella: she comes running right away
  let state = params.has('pass') ? { ...withBella, nextPassing: 2 } : withBella;
  letters.receive(params, params.has('km') ? `${t(LINES[lineAt(state.distance)].name)}, ${t(biomeName(state.distance))}` : '');
  let last = performance.now();
  let hudTimer = 0;
  let lastBabyLine = null;

  window.addEventListener('resize', () => { layout = resizeCanvas(canvas, ctx); });
  const announcer = createAnnouncer(document, { radio });
  const headphones = document.getElementById('headphones');
  headphones.addEventListener('change', () => audio.setHeadphones(headphones.checked));
  controls.onSoundClick(async (e) => {
    e.stopPropagation();
    try {
      controls.showSound(await audio.toggle());
      audio.setHeadphones(headphones.checked);
    } catch (err) {
      console.error('Audio unavailable:', err);
      controls.showSound(false);
    }
  });

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const read = controls.read();
    const focusPlan = focus.update(state, read.stops);
    const destination = focusPlan?.destination ?? arrival.destination();
    const plan = schedule.update(state, destination, read.stops, focusPlan?.target ?? null);
    const input = plan ? { ...read, targetKmh: plan.kmh } : read;
    controls.showScheduledSpeed(plan ? plan.kmh : null);
    state = step(state, dt, { ...input, destination, destinationAt: plan?.stopAt ?? null, events: clicks.takeEvents() });
    arrival.update(state, focus.active());
    intention.update(state);
    travelers.observe(state);
    breathing.update(dt, state.speed);
    transfer.update(state);
    playSounds(audio, state);
    passerbyCues(state.time - dt, state.time, state.dayTime).forEach((cue) => audio.sfx(cue, aislePan(state)));
    const baby = companionLine(state, null);
    const babyLine = baby?.who === 'b' ? baby.text : null;
    if (babyLine && babyLine !== lastBabyLine) audio.sfx(babyLine.startsWith('Uá') ? 'cry' : 'babble');
    lastBabyLine = babyLine;
    modes.tick(state.distance, state.destination);
    if (input.autoDay) controls.showDayTime(state.dayTime);
    hudTimer += dt;
    if (hudTimer > HUD_INTERVAL) {
      hudTimer = 0;
      updatePanel(controls, state, input, schedule.boardText(state, destination) ?? arrival.boardText(state, input.targetKmh));
    }
    const headLook = pointer.updateLook(dt);
    const look = a11y.calm() ? { x: 0, y: 0 } : headLook; // reduced motion: no swaying point of view
    const strokes = pointer.takeStrokes();
    if (layout.W > 0 && layout.H > 0) {
      if (state.fog > 0.1 && strokes.length > 0) fog.wipe(strokes, layout);
      const view = { ...layout, lookX: look.x, lookY: look.y };
      render(ctx, view, state, sceneEnvironment(state), { fog, dt, station: radio.station, intention: intention.current(), platform: transfer.sceneAt(now), calm: a11y.calm() });
      scene = { view, state };
      const env = sceneEnvironment(state);
      journal.observe(state, env, view);
      if (env.hail && env.rain > 0.3 && Math.random() < dt * 14) audio.sfx('click', Math.random() * 2 - 1); // hail ticking on the roof
      notebook.observe(state, env);
      a11y.observe(state, env);
      announcer.observe(state, env, weatherTargets(input, state.time).mode);
      const booms = burstsExploded(state.time - dt, state, env, view);
      if (booms > 0) audio.sfx('boom');
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

start();
