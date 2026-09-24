// Generative ambient music: slow pad chords (Am–F–C–G) with sparse pentatonic plucks
// through a soft echo. Uses its own AudioContext so it works independently of the train sounds.

const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; // MIDI notes
const PENTATONIC = [69, 72, 74, 76, 79, 81, 84];
const CHORD_SECONDS = 8;
const LOOKAHEAD = 1; // seconds scheduled ahead
const TICK_MS = 250;

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

function buildGraph() {
  const ac = new AudioContext();
  const out = ac.createGain();
  out.gain.value = 0.0001;
  const tone = ac.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2200;
  const delay = ac.createDelay(1);
  delay.delayTime.value = 0.38;
  const feedback = ac.createGain();
  feedback.gain.value = 0.35;
  const wet = ac.createGain();
  wet.gain.value = 0.3;
  out.connect(tone).connect(ac.destination);
  tone.connect(delay).connect(feedback).connect(delay);
  delay.connect(wet).connect(ac.destination);
  return { ac, out };
}

function voice(g, { type, freq, start, attack, hold, release, peak }) {
  const osc = g.ac.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const env = g.ac.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(peak, start + attack);
  env.gain.setValueAtTime(peak, start + attack + hold);
  env.gain.exponentialRampToValueAtTime(0.0001, start + attack + hold + release);
  osc.connect(env).connect(g.out);
  osc.start(start);
  osc.stop(start + attack + hold + release + 0.05);
}

const pad = (g, chord, start) => chord.forEach((m) => voice(g, {
  type: 'triangle', freq: hz(m - 12), start, attack: 2, hold: CHORD_SECONDS - 2, release: 2.5, peak: 0.045,
}));

const pluck = (g, midi, start) => voice(g, {
  type: 'sine', freq: hz(midi), start, attack: 0.01, hold: 0, release: 2.2, peak: 0.06,
});

export function createMusic() {
  let graph = null;
  let timer = null;
  let nextChordAt = 0;
  let nextNoteAt = 0;
  let chordIndex = 0;

  function schedule() {
    const horizon = graph.ac.currentTime + LOOKAHEAD;
    while (nextChordAt < horizon) {
      pad(graph, CHORDS[chordIndex % CHORDS.length], nextChordAt);
      chordIndex += 1;
      nextChordAt += CHORD_SECONDS;
    }
    while (nextNoteAt < horizon) {
      pluck(graph, PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)], nextNoteAt);
      nextNoteAt += 1.2 + Math.random() * 2.4;
    }
  }

  return {
    get playing() {
      return timer !== null;
    },
    async start() {
      if (timer) return;
      graph = graph ?? buildGraph();
      await graph.ac.resume();
      const now = graph.ac.currentTime;
      graph.out.gain.setTargetAtTime(1, now, 1.5);
      nextChordAt = now + 0.1;
      nextNoteAt = now + 1.5;
      schedule();
      timer = setInterval(schedule, TICK_MS);
    },
    stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
      graph.out.gain.setTargetAtTime(0.0001, graph.ac.currentTime, 0.8);
    },
    /** Soft bell for timer changes (only audible once the music context exists). */
    bell() {
      if (!graph) return;
      const t = graph.ac.currentTime + 0.05;
      [880, 1320].forEach((freq, k) => voice(graph, {
        type: 'sine', freq, start: t + k * 0.35, attack: 0.01, hold: 0, release: 2.5, peak: 0.12,
      }));
    },
  };
}
