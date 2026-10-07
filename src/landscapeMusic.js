import { bass, epiano, flute, guitar, hat, kick, pad, piano, rim, shaker, snare } from './radioStyles.js';

// The "Landscape" station: a soundtrack that follows the window. Each biome has its own theme
// (scale, instruments, tempo); the music changes theme at the end of a phrase, so it never cuts
// mid-bar. At night every theme plays softer: no drums, fewer notes.

const chance = (p) => Math.random() < p;
const pickOf = (list) => list[Math.floor(Math.random() * list.length)];
const PHRASE_BARS = 4;

/** Each theme schedules one step at time t; `mood.night` softens it. */
export const THEMES = {
  Campos: { // folk in G: guitar arpeggios and a flute tune
    bpm: 92, stepsPerBeat: 2, swing: 0,
    chords: [[43, 47, 50, 55], [38, 42, 45, 50], [40, 43, 47, 52], [36, 40, 43, 48]],
    step(g, i, t, chord, dur, mood) {
      const s = i % 8;
      guitar(g, chord[[0, 2, 1, 3, 2, 3, 1, 2][s]] + 12, t, 0.045);
      if (s === 0) bass(g, chord[0] - 12, t, dur * 3, 0.1);
      if (s === 4) bass(g, chord[2] - 12, t, dur * 3, 0.08);
      if ((s === 0 || s === 3 || s === 6) && chance(mood.night ? 0.2 : 0.45)) flute(g, pickOf([67, 69, 71, 74, 76, 79]), t, dur * 2.5, 0.03);
      if (!mood.night && s % 2 === 1) shaker(g, t, 0.012);
    },
  },
  Fazenda: { // country boom-chick in D
    bpm: 104, stepsPerBeat: 2, swing: 0.08,
    chords: [[50, 54, 57], [43, 47, 50], [45, 49, 52], [50, 54, 57]],
    step(g, i, t, chord, dur, mood) {
      const s = i % 8;
      if (s % 4 === 0) bass(g, (s === 0 ? chord[0] : chord[2]) - 12, t, dur * 1.5, 0.12);
      if (s % 4 === 2) chord.forEach((m, k) => guitar(g, m + 12, t + k * 0.01, 0.04));
      if (!mood.night && s % 2 === 1) rim(g, t, 0.025);
      if (s === 5 && chance(0.35)) guitar(g, pickOf([69, 71, 74, 76, 78]), t, 0.05);
    },
  },
  Floresta: { // D dorian: pads, a wandering flute, a woodpecker now and then
    bpm: 58, stepsPerBeat: 2, swing: 0,
    chords: [[50, 57, 62, 65], [48, 55, 60, 64], [53, 57, 60, 65], [50, 57, 62, 64]],
    step(g, i, t, chord, dur, mood) {
      const s = i % 8;
      if (s === 0) pad(g, chord.map((m) => m - 12), t, dur * 8, 0.022);
      if (chance(mood.night ? 0.12 : 0.22)) flute(g, pickOf([62, 64, 65, 67, 69, 71, 72, 74]), t, dur * 3, 0.026);
      if (!mood.night && s === 5 && chance(0.12)) [0, 0.07, 0.14, 0.21].forEach((d) => rim(g, t + d, 0.03));
    },
  },
  Montanhas: { // E minor in open fifths: a deep drone and bells echoing between peaks
    bpm: 54, stepsPerBeat: 2, swing: 0,
    chords: [[40, 47, 52], [36, 43, 48], [38, 45, 50], [40, 47, 52]],
    step(g, i, t, chord, dur, mood) {
      const s = i % 8;
      if (s === 0) pad(g, chord.map((m) => m - 12), t, dur * 8, 0.03, 'sawtooth');
      if ((s === 0 || s === 3 || s === 6) && chance(mood.night ? 0.3 : 0.55)) epiano(g, pickOf([76, 79, 83, 86, 88, 91]), t, 0.04, 3.5);
    },
  },
  Outono: { // A minor arpeggios in 6/8, a little melancholy
    bpm: 66, stepsPerBeat: 2, stepsPerBar: 6, swing: 0,
    chords: [[45, 48, 52], [41, 45, 48], [43, 47, 50], [40, 44, 47]],
    step(g, i, t, chord, dur, mood) {
      const s = i % 6;
      piano(g, chord[[0, 1, 2, 1, 2, 1][s]] + 12, t, mood.night ? 0.035 : 0.05);
      if (s === 0) bass(g, chord[0] - 12, t, dur * 5, 0.09);
      if (s === 3 && chance(0.4)) piano(g, chord[2] + 24, t, 0.035);
    },
  },
  Subúrbio: { // easy lo-fi in F with a lazy beat
    bpm: 80, stepsPerBeat: 4, swing: 0.18,
    chords: [[41, 45, 48, 52], [38, 41, 45, 48], [46, 50, 53, 57], [43, 46, 50, 53]],
    step(g, i, t, chord, dur, mood) {
      const s = i % 16;
      if (s === 0) chord.forEach((m, k) => epiano(g, m + 12, t + k * 0.015, 0.03, 2));
      if (s === 0 || s === 10) bass(g, chord[0] - 12, t, 0.6, 0.12);
      if (mood.night) return;
      if (s === 0 || s === 9) kick(g, t, 0.25);
      if (s === 4 || s === 12) snare(g, t, 0.06);
      if (s % 4 === 2) hat(g, t, 0.016);
    },
  },
  Cidade: { // jazz: walking bass, seventh chords, brushed hats with swing
    bpm: 100, stepsPerBeat: 2, swing: 0.3,
    chords: [[50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 59], [45, 49, 52, 55]],
    step(g, i, t, chord, dur, mood) {
      const s = i % 8;
      if (s % 2 === 0) bass(g, chord[[0, 1, 2, 3][s / 2]] - 12, t, dur * 1.6, 0.11);
      if (s === 0 || (s === 5 && chance(0.6))) chord.slice(1).forEach((m) => epiano(g, m + 12, t, 0.028, 1.4));
      if (!mood.night) hat(g, t, s % 2 ? 0.012 : 0.022);
      if (chance(mood.night ? 0.12 : 0.2)) epiano(g, chord[1 + Math.floor(Math.random() * 3)] + 24, t, 0.025, 0.7);
    },
  },
  Litoral: { // breezy C major pentatonic, mallets and a shaker like the surf
    bpm: 84, stepsPerBeat: 4, swing: 0.06,
    chords: [[48, 52, 55, 59], [53, 57, 60, 64], [45, 48, 52, 55], [43, 47, 50, 55]],
    step(g, i, t, chord, dur, mood) {
      const s = i % 16;
      if ([0, 3, 6, 10, 12].includes(s)) epiano(g, chord[[1, 2, 3, 2, 1][[0, 3, 6, 10, 12].indexOf(s)]] + 12, t, 0.035, 0.6);
      if (s === 0 || s === 8) bass(g, chord[0] - 12, t, 0.7, 0.11);
      shaker(g, t, (s % 4 === 2 ? 0.022 : 0.01) * (mood.night ? 0.5 : 1));
      if ((s === 2 || s === 14) && chance(0.3)) epiano(g, pickOf([72, 74, 76, 79, 81]) + 12, t, 0.025, 0.5);
    },
  },
  Deserto: { // E phrygian dominant over a drone, a frame drum, an ornamented flute
    bpm: 72, stepsPerBeat: 2, swing: 0,
    chords: [[40, 47, 52], [41, 48, 53], [40, 47, 52], [38, 45, 50]],
    step(g, i, t, chord, dur, mood) {
      const s = i % 8;
      if (s === 0) pad(g, [28, 40], t, dur * 8, 0.03, 'sawtooth');
      if (!mood.night && (s === 0 || s === 3 || s === 6)) kick(g, t, s === 0 ? 0.22 : 0.12);
      if (!mood.night && (s === 2 || s === 7)) rim(g, t, 0.03);
      if (chance(mood.night ? 0.15 : 0.3)) {
        const note = pickOf([64, 65, 68, 69, 71, 72, 74, 76]);
        flute(g, note, t, dur * 1.8, 0.03);
        if (chance(0.4)) flute(g, note + 1, t + dur * 0.25, dur * 0.3, 0.02); // a quick turn
      }
    },
  },
  Vinhedos: { // a waltz in F: oom-pah-pah and a singing melody
    bpm: 132, stepsPerBeat: 1, stepsPerBar: 3, swing: 0,
    chords: [[41, 45, 48], [36, 40, 43], [38, 41, 45], [43, 46, 50]],
    step(g, i, t, chord, dur, mood) {
      const s = i % 3;
      if (s === 0) bass(g, chord[0] - 12, t, dur * 0.9, 0.11);
      else chord.forEach((m) => guitar(g, m + 12, t, mood.night ? 0.025 : 0.035));
      if (s === 0 && chance(0.6)) piano(g, pickOf([65, 67, 69, 70, 72, 74, 77]), t, 0.045);
    },
  },
  Lago: { // F lydian: still water, long pads and glassy notes
    bpm: 50, stepsPerBeat: 2, swing: 0,
    chords: [[41, 48, 53, 59], [43, 50, 55, 59], [41, 45, 52, 59], [36, 43, 48, 55]],
    step(g, i, t, chord, dur, mood) {
      const s = i % 8;
      if (s === 0) pad(g, chord, t, dur * 8, 0.02);
      if (chance(mood.night ? 0.14 : 0.24)) epiano(g, pickOf([77, 79, 81, 83, 84, 88]), t, 0.03, 3);
    },
  },
};

const stepsPerBarOf = (style) => style.stepsPerBar ?? style.stepsPerBeat * 4;

/**
 * Schedules the landscape station up to `horizon`. `scene()` returns { biome, night } now; a
 * new theme starts only at the end of a phrase. cursor: { step, time, theme }.
 */
export function scheduleLandscape(g, cursor, horizon, scene) {
  let { step, time, theme } = cursor;
  while (time < horizon) {
    const now = scene();
    const phrase = stepsPerBarOf(THEMES[theme]) * PHRASE_BARS;
    if (step % phrase === 0 && THEMES[now.biome] && now.biome !== theme) {
      theme = now.biome;
      step = 0;
    }
    const style = THEMES[theme];
    const stepDur = 60 / style.bpm / style.stepsPerBeat;
    const chord = style.chords[Math.floor(step / stepsPerBarOf(style)) % style.chords.length];
    const swing = step % 2 === 1 ? style.swing * stepDur : 0;
    style.step(g, step, time + swing, chord, stepDur, { night: now.night });
    step += 1;
    time += stepDur;
  }
  return { step, time, theme };
}
