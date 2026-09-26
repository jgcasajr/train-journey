const BOGIE_AXLE_GAP = 2.6; // meters between axles on one bogie
const BOGIE_GAP = 17; // meters between the front and rear bogie of the car

function noiseBuffer(ac, seconds) {
  const buffer = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function loopedNoise(ac, buffer, filterType, frequency, destination) {
  const src = ac.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const filter = ac.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = frequency;
  const gain = ac.createGain();
  gain.gain.value = 0;
  src.connect(filter).connect(gain).connect(destination);
  src.start();
  return { filter, gain };
}

function buildGraph() {
  const ac = new AudioContext();
  const noise = noiseBuffer(ac, 2);
  const master = ac.createGain();
  master.gain.value = 0.9;
  master.connect(ac.destination);
  return {
    ac,
    noise,
    master,
    rumble: loopedNoise(ac, noise, 'lowpass', 160, master),
    rain: loopedNoise(ac, noise, 'highpass', 2500, master),
  };
}

function envelope(param, when, peak, decay) {
  param.setValueAtTime(0.0001, when);
  param.exponentialRampToValueAtTime(peak, when + 0.004);
  param.exponentialRampToValueAtTime(0.0001, when + decay);
}

/** One wheel hitting a rail joint: a filtered noise click plus a low thump. */
function wheelClick(g, when, strength) {
  const src = g.ac.createBufferSource();
  src.buffer = g.noise;
  const band = g.ac.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 700 + Math.random() * 300;
  band.Q.value = 1.2;
  const clickGain = g.ac.createGain();
  envelope(clickGain.gain, when, 0.5 * strength, 0.09);
  src.connect(band).connect(clickGain).connect(g.master);
  src.start(when, Math.random() * 1.5, 0.12);

  const osc = g.ac.createOscillator();
  osc.frequency.setValueAtTime(110, when);
  osc.frequency.exponentialRampToValueAtTime(50, when + 0.08);
  const thumpGain = g.ac.createGain();
  envelope(thumpGain.gain, when, 0.35 * strength, 0.1);
  osc.connect(thumpGain).connect(g.master);
  osc.start(when);
  osc.stop(when + 0.12);
}

function tone(g, { type, freq, when, duration, peak, vibrato = 0 }) {
  const osc = g.ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  const gain = g.ac.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + 0.03);
  gain.gain.setValueAtTime(peak, when + duration * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  if (vibrato) {
    const lfo = g.ac.createOscillator();
    const depth = g.ac.createGain();
    lfo.frequency.value = 5.5;
    depth.gain.value = vibrato;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(when);
    lfo.stop(when + duration);
  }
  osc.connect(gain).connect(g.master);
  osc.start(when);
  osc.stop(when + duration + 0.05);
}

/** A voiced animal call: sawtooth with a pitch contour, vibrato and a vowel-like band filter. */
function voiceCall(g, t, { pitches, duration, vibrato, rate, formant, peak }) {
  const osc = g.ac.createOscillator();
  osc.type = 'sawtooth';
  pitches.forEach(([f, at], i) => (i === 0 ? osc.frequency.setValueAtTime(f, t) : osc.frequency.linearRampToValueAtTime(f, t + at)));
  const lfo = g.ac.createOscillator();
  const depth = g.ac.createGain();
  lfo.frequency.value = rate;
  depth.gain.value = vibrato;
  lfo.connect(depth).connect(osc.frequency);
  const band = g.ac.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = formant;
  band.Q.value = 1.5;
  const gain = g.ac.createGain();
  envelope(gain.gain, t, peak, duration);
  osc.connect(band).connect(gain).connect(g.master);
  [osc, lfo].forEach((n) => { n.start(t); n.stop(t + duration + 0.05); });
}

function noiseBurst(g, t, { freq, q = 1, duration, peak, type = 'bandpass' }) {
  const src = g.ac.createBufferSource();
  src.buffer = g.noise;
  const filter = g.ac.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = g.ac.createGain();
  envelope(gain.gain, t, peak, duration);
  src.connect(filter).connect(gain).connect(g.master);
  src.start(t, Math.random(), duration + 0.05);
}

const SFX = {
  moo: (g, t) => voiceCall(g, t, { pitches: [[115, 0], [125, 0.3], [95, 1.1]], duration: 1.2, vibrato: 2, rate: 5, formant: 420, peak: 0.5 }),
  baa: (g, t) => voiceCall(g, t, { pitches: [[330, 0], [360, 0.2], [310, 0.7]], duration: 0.75, vibrato: 30, rate: 16, formant: 1100, peak: 0.35 }),
  neigh: (g, t) => voiceCall(g, t, { pitches: [[520, 0], [900, 0.25], [650, 0.6], [420, 1]], duration: 1, vibrato: 60, rate: 22, formant: 1400, peak: 0.3 }),
  flutter: (g, t) => Array.from({ length: 9 }, (_, k) => noiseBurst(g, t + k * 0.07, { freq: 2200, q: 0.8, duration: 0.05, peak: 0.25 })),
  brake: (g, t) => {
    [1900, 2350].forEach((freq) => tone(g, { type: 'sine', freq, when: t, duration: 2.6, peak: 0.05, vibrato: 25 }));
    noiseBurst(g, t, { freq: 3000, q: 0.5, duration: 2.6, peak: 0.12 });
  },
  click: (g, t) => noiseBurst(g, t, { freq: 3500, q: 2, duration: 0.03, peak: 0.3 }),
  swish: (g, t) => noiseBurst(g, t, { freq: 1200, q: 0.4, duration: 0.5, peak: 0.12, type: 'lowpass' }),
  cheer: (g, t) => [880, 1175].forEach((freq, k) => tone(g, { type: 'triangle', freq, when: t + k * 0.12, duration: 0.3, peak: 0.05 })),
  chime: (g, t) => [1320, 1760].forEach((freq, k) => tone(g, { type: 'sine', freq, when: t + k * 0.15, duration: 1.2, peak: 0.08 })),
};

export function createAudio() {
  let graph = null;
  let enabled = false;
  let lastBell = 0;

  return {
    get enabled() {
      return enabled;
    },
    async toggle() {
      graph = graph ?? buildGraph();
      if (enabled) await graph.ac.suspend();
      else await graph.ac.resume();
      enabled = !enabled;
      return enabled;
    },
    /** `bell`: a level crossing is near — its warning bell rings twice a second. */
    update(speed, rain, bell = false) {
      if (!enabled) return;
      const now = graph.ac.currentTime;
      if (bell && now - lastBell > 0.5) {
        lastBell = now;
        tone(graph, { type: 'triangle', freq: 1320, when: now + 0.02, duration: 0.3, peak: 0.08 });
        tone(graph, { type: 'sine', freq: 2640, when: now + 0.02, duration: 0.2, peak: 0.03 });
      }
      graph.rumble.gain.gain.setTargetAtTime(Math.min(1, speed / 60) * 0.35, now, 0.3);
      graph.rumble.filter.frequency.setTargetAtTime(120 + speed * 4, now, 0.3);
      graph.rain.gain.gain.setTargetAtTime(rain * 0.06, now, 0.5);
    },
    /** Thunder `delay` seconds after the flash: a crack for close strikes, then a long low rumble. */
    thunder(delay, closeness) {
      if (!enabled) return;
      const { ac } = graph;
      const t = ac.currentTime + delay;
      const duration = 3 + (1 - closeness) * 2;
      const src = ac.createBufferSource();
      src.buffer = graph.noise;
      src.loop = true;
      const low = ac.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.setValueAtTime(250 + closeness * 500, t);
      low.frequency.exponentialRampToValueAtTime(70, t + duration);
      const gain = ac.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35 + closeness * 0.45, t + 0.08 + (1 - closeness) * 0.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      src.connect(low).connect(gain).connect(graph.master);
      src.start(t);
      src.stop(t + duration + 0.1);
    },
    /** Short sound effect for a click interaction (see SFX). */
    sfx(name) {
      if (!enabled || !SFX[name]) return;
      SFX[name](graph, graph.ac.currentTime + 0.02);
    },
    /** Station arrival: two-note "ding-dong" chime. */
    chime() {
      if (!enabled) return;
      const t = graph.ac.currentTime + 0.05;
      tone(graph, { type: 'sine', freq: 659, when: t, duration: 1.2, peak: 0.18 });
      tone(graph, { type: 'sine', freq: 523, when: t + 0.55, duration: 1.6, peak: 0.18 });
    },
    /** Departure: a soft two-tone whistle. */
    whistle() {
      if (!enabled) return;
      const t = graph.ac.currentTime + 0.05;
      [587, 740].forEach((freq) => tone(graph, { type: 'triangle', freq, when: t, duration: 1.4, peak: 0.07, vibrato: 4 }));
    },
    /** Opposing train: a loud filtered-noise whoosh lasting `duration` seconds. */
    passBy(duration) {
      if (!enabled) return;
      const { ac } = graph;
      const t = ac.currentTime + 0.02;
      const src = ac.createBufferSource();
      src.buffer = graph.noise;
      src.loop = true;
      const band = ac.createBiquadFilter();
      band.type = 'bandpass';
      band.Q.value = 0.7;
      band.frequency.setValueAtTime(900, t);
      band.frequency.exponentialRampToValueAtTime(350, t + duration);
      const gain = ac.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.55, t + 0.15);
      gain.gain.setValueAtTime(0.45, t + Math.max(0.2, duration - 0.4));
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration + 0.3);
      src.connect(band).connect(gain).connect(graph.master);
      src.start(t);
      src.stop(t + duration + 0.4);
    },
    /** Called when the train passes a rail joint: "ta-dum ... ta-dum". */
    clack(speed) {
      if (!enabled || speed < 1) return;
      const strength = Math.min(1, speed / 30);
      const t0 = graph.ac.currentTime + 0.01;
      const offsets = [0, BOGIE_AXLE_GAP, BOGIE_GAP, BOGIE_GAP + BOGIE_AXLE_GAP].map((m) => m / speed);
      offsets
        .filter((dt) => dt < 1.5)
        .forEach((dt, i) => wheelClick(graph, t0 + dt, strength * (i % 2 ? 0.85 : 1)));
    },
  };
}
