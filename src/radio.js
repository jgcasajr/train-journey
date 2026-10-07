import { STYLES, epiano, pad, tuning } from './radioStyles.js';
import { THEMES, scheduleLandscape } from './landscapeMusic.js';

// The cabin radio: generative stations played through a soft echo, with its own AudioContext
// (independent of the train sounds). 'ambient' is the slow pad music of relax mode;
// 'landscape' follows the view (see landscapeMusic.js).
export const STATIONS = ['off', 'landscape', 'ambient', 'lofi', 'classical', 'bossa'];
export const STATION_NAMES = { off: 'Desligado', landscape: 'Paisagem', ambient: 'Ambiente', lofi: 'Lo-fi', classical: 'Clássica', bossa: 'Bossa nova' };

const LOOKAHEAD = 0.3; // seconds scheduled ahead
const TICK_MS = 60;
const AMBIENT_CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const AMBIENT_NOTES = [69, 72, 74, 76, 79, 81, 84];
const AMBIENT_CHORD_SECONDS = 8;

function buildGraph() {
  const ac = new AudioContext();
  const volume = ac.createGain();
  volume.gain.value = 0.8;
  const out = ac.createGain();
  const delay = ac.createDelay(1);
  delay.delayTime.value = 0.33;
  const feedback = ac.createGain();
  feedback.gain.value = 0.28;
  const wet = ac.createGain();
  wet.gain.value = 0.22;
  out.connect(volume).connect(ac.destination);
  out.connect(delay).connect(feedback).connect(delay);
  delay.connect(wet).connect(volume);
  const noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return { ac, out, volume, noise };
}

/** Beat-based styles: schedule every step that falls inside the lookahead window. */
function scheduleStyle(g, style, cursor, horizon) {
  const stepDur = 60 / style.bpm / style.stepsPerBeat;
  const stepsPerBar = style.stepsPerBar ?? style.stepsPerBeat * 4;
  let { step, time } = cursor;
  while (time < horizon) {
    const chord = style.chords[Math.floor(step / stepsPerBar) % style.chords.length];
    const swing = step % 2 === 1 ? style.swing * stepDur : 0;
    style.step(g, step, time + swing, chord, stepDur);
    step += 1;
    time += stepDur;
  }
  return { step, time };
}

/** The ambient station: long pad chords with sparse bell notes. */
function scheduleAmbient(g, cursor, horizon) {
  let { step, time, noteAt } = cursor;
  while (time < horizon) {
    pad(g, AMBIENT_CHORDS[step % AMBIENT_CHORDS.length].map((m) => m - 12), time, AMBIENT_CHORD_SECONDS, 0.04);
    step += 1;
    time += AMBIENT_CHORD_SECONDS;
  }
  while (noteAt < horizon) {
    epiano(g, AMBIENT_NOTES[Math.floor(Math.random() * AMBIENT_NOTES.length)], noteAt, 0.05, 2.2);
    noteAt += 1.2 + Math.random() * 2.4;
  }
  return { step, time, noteAt };
}

export function createRadio({ onChange = () => {} } = {}) {
  let graph = null;
  let station = 'off';
  let cursor = null;
  let timer = null;
  let volumeLevel = 0.8;
  let duckLevel = 1; // lowered while the announcer talks
  let fadeLevel = 1; // the sleep timer fades the music out
  let scene = { biome: 'Campos', night: false }; // what the window shows, for the landscape station
  const level = () => Math.max(0.0001, volumeLevel * duckLevel * fadeLevel);

  function tick() {
    const horizon = graph.ac.currentTime + LOOKAHEAD;
    if (station === 'landscape') cursor = scheduleLandscape(graph, cursor, horizon, () => scene);
    else if (station === 'ambient') cursor = scheduleAmbient(graph, cursor, horizon);
    else cursor = scheduleStyle(graph, STYLES[station], cursor, horizon);
  }

  async function tune(next) {
    if (!STATIONS.includes(next) || next === station) return;
    clearInterval(timer);
    timer = null;
    station = next;
    onChange(station);
    if (station === 'off') {
      if (graph) graph.volume.gain.setTargetAtTime(0.0001, graph.ac.currentTime, 0.15);
      return;
    }
    graph = graph ?? buildGraph();
    await graph.ac.resume();
    const now = graph.ac.currentTime;
    graph.volume.gain.setTargetAtTime(level(), now, 0.3);
    tuning(graph, now);
    cursor = { step: 0, time: now + 0.5, noteAt: now + 2, theme: THEMES[scene.biome] ? scene.biome : 'Campos' };
    tick();
    timer = setInterval(tick, TICK_MS);
  }

  return {
    get station() {
      return station;
    },
    tune,
    /** Next station in the dial order (used by clicking the radio). */
    next: () => tune(STATIONS[(STATIONS.indexOf(station) + 1) % STATIONS.length]),
    setVolume(v) {
      volumeLevel = Math.max(0.0001, Math.min(1, v));
      if (graph && station !== 'off') graph.volume.gain.setTargetAtTime(level(), graph.ac.currentTime, 0.1);
    },
    /** Lowers the music to `factor` of its volume (1 = back to normal), e.g. under the announcer. */
    duck(factor) {
      duckLevel = Math.max(0.05, Math.min(1, factor));
      if (graph && station !== 'off') graph.volume.gain.setTargetAtTime(level(), graph.ac.currentTime, 0.4);
    },
    /** Fades the music to `factor` of its volume (sleep timer); 1 = back to normal. */
    fade(factor) {
      fadeLevel = Math.max(0, Math.min(1, factor));
      if (graph && station !== 'off') graph.volume.gain.setTargetAtTime(level(), graph.ac.currentTime, 0.5);
    },
    /** What the window shows now (biome name, night), followed by the landscape station. */
    setScene(biome, night) {
      if (biome !== scene.biome || night !== scene.night) scene = { biome, night };
    },
    /** Soft bell for timer changes (only audible once the radio has been used). */
    bell() {
      if (!graph) return;
      const t = graph.ac.currentTime + 0.05;
      [88, 95].forEach((m, k) => epiano(graph, m, t + k * 0.35, 0.12, 2.5));
    },
  };
}
