import { PETS } from './bella.js';
import { biomeName } from './biomes.js';
import { isNight } from './clock.js';
import { companionClicked } from './companion.js';
import { transferState } from './lineChange.js';
import { passerbyAt, passerbyClicked } from './passersby.js';
import { approach, hash } from './utils.js';

const SPEECH_SECONDS = 3.4;
const WAKE_SECONDS = 25;
const SIP_SECONDS = 4;
const BRAKE_SECONDS = 7;
const EFFECT_SECONDS = 4;
const LAMP_MODES = ['auto', 'on', 'off'];

const BIOME_LINES = {
  Campos: ['Que campo bonito!', 'Dá vontade de fazer um piquenique.'],
  Fazenda: ['Olha as vaquinhas!', 'Cheiro de roça!'],
  Floresta: ['Que floresta fechada...', 'Será que tem bicho aí dentro?'],
  Montanhas: ['Olha a neve lá no alto!', 'Que frio que deve estar lá fora.'],
  Outono: ['Amo essa época do ano.', 'Parece uma pintura.'],
  Subúrbio: ['Que bairro tranquilo.', 'Já morei numa casinha assim.'],
  Cidade: ['A cidade não para, né?', 'Quanto prédio!'],
  Litoral: ['O mar! Finalmente!', 'Queria estar na areia agora.'],
  Deserto: ['Quanto silêncio nessas dunas.', 'Olha o cacto! Parece que está acenando.'],
  Vinhedos: ['Um vinho agora cairia bem...', 'Quanta uva!'],
  Lago: ['Tem duas montanhas: uma no céu e outra na água.', 'Que água parada, parece um espelho.'],
};
const GENERIC_LINES = ['Oi! Tudo bem?', 'Essa viagem tá uma delícia.', 'Já estamos chegando?', 'Adoro viajar de trem.'];

/** Something to say that fits the moment: weather, time of day, what she's doing, the landscape. */
function passengerLine(state) {
  const pick = (lines) => lines[Math.floor(hash(state.clicks, 1901) * lines.length)];
  if (state.pose.read > 0.5) return pick(['Shh... tô na melhor parte do livro!', 'Só mais um capítulo.']);
  if (state.storm > 0.5) return pick(['Nossa, que trovão!', 'Ainda bem que estamos aqui dentro.']);
  if (state.rain > 0.5) return pick(['Adoro o barulho da chuva.', 'Olha as gotas no vidro.']);
  if (state.dwell > 0) return pick(['Será que alguém vai sentar aqui?', 'Estação bonitinha.']);
  if (isNight(state.dayTime)) return pick(['Olha quantas estrelas!', 'Que noite linda...']);
  const lines = BIOME_LINES[biomeName(state.distance)] ?? [];
  return pick(hash(state.clicks, 1902) < 0.7 ? lines : GENERIC_LINES);
}

const say = (state, text) => ({ speech: { text, until: state.time + SPEECH_SECONDS } });
const addEffect = (state, effect) => ({ effects: [...state.effects, { ...effect, born: state.time }] });

export const initialInteraction = () => ({
  speech: null,
  wakeUntil: 0,
  sipUntil: 0,
  brakeUntil: 0,
  brakeStarted: false,
  lampMode: 'auto',
  curtainsClosed: false,
  curtains: 0,
  effects: [],
  clicks: 0,
  scatterAt: -99,
});

/** State changes caused by one viewer event (all pure). */
function reduce(state, event) {
  switch (event.type) {
    case 'talk':
      if (state.pose.sleep > 0.5) return { ...say(state, 'Hã?! Já chegamos?'), wakeUntil: state.time + WAKE_SECONDS };
      return say(state, passengerLine(state));
    case 'sip':
      if (state.coffee <= 0.05) return say(state, 'Acabou o café... cadê o carrinho?');
      return { sipUntil: state.time + SIP_SECONDS, speech: null };
    case 'lamp':
      return { lampMode: LAMP_MODES[(LAMP_MODES.indexOf(state.lampMode) + 1) % LAMP_MODES.length] };
    case 'curtain':
      return { curtainsClosed: !state.curtainsClosed };
    case 'brake':
      if (state.speed < 2) return say(state, 'O trem já está parado...');
      if (state.time < state.brakeUntil) return {};
      return { ...say(state, 'Ai! O que foi isso?!'), brakeUntil: state.time + BRAKE_SECONDS, brakeStarted: true };
    case 'passerby':
      return passerbyClicked(state);
    case 'companion':
      return companionClicked(state);
    case 'continue':
      return { holding: false, arrivedAt: null, dwell: Math.min(state.dwell, 2) };
    case 'transfer':
      return transferState(state);
    case 'sleeper':
      return say(state, isNight(state.dayTime) ? 'Zzz... só mais cinco minutinhos.' : 'Que cama gostosa! Dá até vontade de cochilar.');
    case 'recall': {
      const ev = passerbyAt(state.time, state.dayTime);
      return ev ? { passerbySpeech: { text: event.text, until: state.time + 3.4, k: ev.k }, recalls: (state.recalls ?? 0) + 1 } : {};
    }
    case 'bella': {
      const pets = (state.bellaPets ?? 0) + 1;
      return { ...say(state, PETS[(pets - 1) % PETS.length]), ...addEffect(state, { kind: 'bella' }), bellaPets: pets };
    }
    case 'cat':
      return { catPetAt: state.time, catPets: (state.catPets ?? 0) + 1 };
    case 'horn':
      return { hornUntil: state.time + 0.6, horns: (state.horns ?? 0) + 1 };
    case 'scatter':
      return { scatterAt: state.time };
    case 'float':
      return addEffect(state, { kind: 'float', text: event.text, depth: event.depth, wx: event.wx, y: event.y });
    case 'wave':
      return addEffect(state, { kind: 'wave', id: event.id });
    case 'flash':
      return addEffect(state, { kind: 'flash', at: event.at });
    default:
      return {};
  }
}

/** Applies the viewer's events of this frame, then drops expired effects. */
export function applyEvents(state, events) {
  const next = events.reduce((s, e) => ({ ...s, ...reduce(s, e), clicks: s.clicks + 1 }), state);
  return { ...next, effects: next.effects.filter((e) => next.time - e.born < EFFECT_SECONDS) };
}

/** Per-frame easing of interaction state (curtains sliding, speech expiring, one-frame flags reset). */
export function updateInteraction(state, dt) {
  return {
    curtains: approach(state.curtains, state.curtainsClosed ? 1 : 0, dt * 1.2),
    speech: state.speech && state.time < state.speech.until ? state.speech : null,
    brakeStarted: false,
  };
}

export const EMERGENCY_DECEL = 6; // m/s²
