// Instruments and arrangements for the cabin radio. Everything is synthesized with Web Audio.
// `g` is { ac, out, noise }: the context, the radio's output bus and a noise buffer.

export const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

function envGain(g, t, peak, attack, decay) {
  const gain = g.ac.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  gain.connect(g.out);
  return gain;
}

function osc(g, type, freq, t, stop, dest) {
  const o = g.ac.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.connect(dest);
  o.start(t);
  o.stop(stop);
  return o;
}

function noise(g, t, dur, filterType, freq, dest) {
  const src = g.ac.createBufferSource();
  src.buffer = g.noise;
  const f = g.ac.createBiquadFilter();
  f.type = filterType;
  f.frequency.value = freq;
  src.connect(f).connect(dest);
  src.start(t, Math.random() * 1.5, dur + 0.05);
}

// ---- instruments ----------------------------------------------------------

/** Electric piano: sine plus a soft bell partial. */
export function epiano(g, midi, t, peak = 0.05, decay = 1.6) {
  const gain = envGain(g, t, peak, 0.01, decay);
  osc(g, 'sine', hz(midi), t, t + decay + 0.1, gain);
  const bell = g.ac.createGain();
  bell.gain.value = 0.25;
  bell.connect(gain);
  osc(g, 'sine', hz(midi) * 2.01, t, t + decay * 0.5, bell);
}

/** Piano-ish pluck (classical arpeggios). */
export const piano = (g, midi, t, peak = 0.06) => osc(g, 'triangle', hz(midi), t, t + 1.4, envGain(g, t, peak, 0.005, 1.3));

/** Nylon guitar pluck (bossa comping): short and bright, through a lowpass. */
export function guitar(g, midi, t, peak = 0.05) {
  const lp = g.ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2400;
  lp.connect(envGain(g, t, peak, 0.004, 0.45));
  osc(g, 'triangle', hz(midi), t, t + 0.55, lp);
}

export const bass = (g, midi, t, dur = 0.6, peak = 0.12) => osc(g, 'sine', hz(midi), t, t + dur + 0.1, envGain(g, t, peak, 0.01, dur));

/** Soft sustained pad (strings / ambient). */
export function pad(g, midis, t, dur, peak = 0.03, type = 'triangle') {
  midis.forEach((m) => {
    const gain = g.ac.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + Math.min(2, dur * 0.3));
    gain.gain.setValueAtTime(peak, t + dur * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.5);
    const lp = g.ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    lp.connect(gain).connect(g.out);
    osc(g, type, hz(m), t, t + dur + 1.6, lp);
  });
}

/** Breathy flute-like line with vibrato. */
export function flute(g, midi, t, dur, peak = 0.035) {
  const gain = envGain(g, t, peak, 0.08, dur);
  const o = osc(g, 'sine', hz(midi), t, t + dur + 0.2, gain);
  const lfo = g.ac.createOscillator();
  const depth = g.ac.createGain();
  lfo.frequency.value = 5;
  depth.gain.value = hz(midi) * 0.006;
  lfo.connect(depth).connect(o.frequency);
  lfo.start(t);
  lfo.stop(t + dur + 0.2);
}

export function kick(g, t, peak = 0.35) {
  const o = g.ac.createOscillator();
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  o.connect(envGain(g, t, peak, 0.004, 0.22));
  o.start(t);
  o.stop(t + 0.3);
}

export const snare = (g, t, peak = 0.12) => noise(g, t, 0.18, 'bandpass', 1800, envGain(g, t, peak, 0.003, 0.16));
export const hat = (g, t, peak = 0.03) => noise(g, t, 0.05, 'highpass', 7000, envGain(g, t, peak, 0.002, 0.04));
export const shaker = (g, t, peak = 0.02) => noise(g, t, 0.07, 'highpass', 5000, envGain(g, t, peak, 0.02, 0.05));
export const rim = (g, t, peak = 0.05) => noise(g, t, 0.03, 'bandpass', 3200, envGain(g, t, peak, 0.001, 0.03));
export const crackle = (g, t) => noise(g, t, 0.01, 'highpass', 3000, envGain(g, t, 0.02 + Math.random() * 0.03, 0.001, 0.008));
/** Tuning static between stations. */
export const tuning = (g, t) => noise(g, t, 0.45, 'bandpass', 1500, envGain(g, t, 0.12, 0.02, 0.4));

// ---- styles ---------------------------------------------------------------
// Each style schedules one step (a 16th or an 8th note) at time t. `rand` is Math.random.

const chance = (p) => Math.random() < p;

export const STYLES = {
  lofi: {
    label: 'Lo-fi',
    stepsPerBeat: 4,
    bpm: 76,
    swing: 0.2,
    chords: [[50, 53, 57, 60, 64], [43, 47, 50, 53, 57], [48, 52, 55, 59, 62], [45, 48, 52, 55, 59]],
    step(g, i, t, chord) {
      const s = i % 16;
      if (s === 0) chord.slice(1).forEach((m, k) => epiano(g, m + 12, t + k * 0.012, 0.035, 2.2));
      if (s === 8 && chance(0.6)) chord.slice(2, 4).forEach((m) => epiano(g, m + 12, t, 0.02, 1));
      if (s === 0 || s === 10) bass(g, chord[0] - 12, t, 0.7, 0.14);
      if (s === 0 || s === 7 || s === 10) kick(g, t, 0.3);
      if (s === 4 || s === 12) snare(g, t, 0.09);
      if (s % 2 === 0) hat(g, t, 0.018 + Math.random() * 0.015);
      if ((s === 2 || s === 6 || s === 14) && chance(0.3)) epiano(g, chord[1 + Math.floor(Math.random() * 4)] + 24, t, 0.02, 0.8);
      if (chance(0.25)) crackle(g, t + Math.random() * 0.1);
    },
  },
  classical: {
    label: 'Clássica',
    stepsPerBeat: 2,
    bpm: 72,
    swing: 0,
    stepsPerBar: 6,
    chords: [[48, 52, 55], [43, 47, 50], [45, 48, 52], [40, 43, 47], [41, 45, 48], [36, 40, 43], [41, 45, 48], [43, 47, 50]],
    step(g, i, t, chord, stepDur) {
      const s = i % 6;
      const arp = [0, 1, 2, 1, 2, 1];
      piano(g, chord[arp[s]] + 12 + (s === 4 ? 12 : 0), t, 0.05);
      if (s === 0) {
        bass(g, chord[0] - 12, t, stepDur * 5, 0.1);
        pad(g, chord.map((m) => m + 12), t, stepDur * 6, 0.012, 'sawtooth');
      }
      if (s === 0 && Math.floor(i / 6) % 2 === 0) piano(g, chord[2] + 24, t + stepDur * 0.5, 0.045);
    },
  },
  bossa: {
    label: 'Bossa nova',
    stepsPerBeat: 4,
    bpm: 66,
    swing: 0.05,
    chords: [[48, 52, 55, 59], [45, 49, 52, 55], [50, 53, 57, 60], [43, 47, 50, 53]],
    step(g, i, t, chord) {
      const s = i % 16;
      if ([0, 3, 6, 10, 13].includes(s)) chord.slice(1).forEach((m, k) => guitar(g, m + 12, t + k * 0.008, 0.05));
      if (s === 0 || s === 14) bass(g, chord[0] - 12, t, 0.45, 0.12);
      if (s === 6 || s === 8) bass(g, chord[2] - 12, t, 0.4, 0.1);
      shaker(g, t, s % 4 === 2 ? 0.025 : 0.012);
      if ([0, 3, 6, 10, 12].includes(s) && Math.floor(i / 16) % 2 === 1) rim(g, t, 0.04);
      if (s === 2 && chance(0.4)) flute(g, chord[3] + 24, t, 0.9);
    },
  },
};
