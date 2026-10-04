import { biomeName } from './biomes.js';
import { currentLang, t } from './i18n.js';
import { meteorNight } from './moon.js';
import { nextStation } from './stations.js';
import { hash } from './utils.js';

const STORAGE_KEY = 'train-journey:announcer:v1';
const APPROACH_METERS = 900; // "next station" call this far before the platform
const CHRONICLE_EVERY = 360; // seconds of trip between chronicles
const DUCK = 0.3; // radio volume share while the announcer talks

const CHRONICLES = {
  Campos: ['Crônica da viagem: nos campos, o vento escreve no capim e apaga logo em seguida. Ninguém lê, mas todo mundo sente.'],
  Fazenda: ['Crônica da viagem: dizem que as vacas olham o trem passar como quem vê o tempo. Elas não têm pressa; talvez saibam de alguma coisa.'],
  Floresta: ['Crônica da viagem: dentro da floresta, até o trem fala mais baixo. Há lugares que pedem silêncio sem dizer nada.'],
  Montanhas: ['Crônica da viagem: as montanhas estavam aqui antes dos trilhos e vão estar depois. Passar por elas é um jeito de aprender paciência.'],
  Outono: ['Crônica da viagem: no outono as árvores ensinam a soltar. Cada folha que cai abre espaço para o que ainda vai nascer.'],
  Subúrbio: ['Crônica da viagem: cada janela acesa do subúrbio guarda um jantar, uma conversa, um recomeço. O trem passa e deseja boa noite a todas.'],
  Cidade: ['Crônica da viagem: a cidade corre, buzina e acende. Daqui de dentro ela parece um rio de luzes, e a gente só observa.'],
  Litoral: ['Crônica da viagem: o mar não para de chegar. Talvez seja essa a lição: voltar quantas vezes for preciso.'],
  Deserto: ['Crônica da viagem: no deserto não há pressa nem barulho. Só o sol, a areia e o tempo, que aqui anda descalço.'],
  Vinhedos: ['Crônica da viagem: cada uva esperou a sua estação. Nada amadurece antes da hora, nem a gente.'],
  Lago: ['Crônica da viagem: um lago parado é o espelho mais honesto que existe. Ele mostra o céu e a montanha exatamente como são.'],
};
const GENERIC = [
  'Crônica da viagem: toda estação é um pequeno recomeço. A gente desce, a gente sobe, e o trem segue com quem ficou.',
  'Crônica da viagem: o caminho também é o destino. Quem olha pela janela já está chegando a algum lugar.',
];

const hourWords = (h) => (h === 0 ? 'meia-noite' : h === 12 ? 'meio-dia' : h === 1 || h === 13 ? 'uma hora' : `${h} horas`);
const greeting = (h) => (h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite');

/** What to say about the hour that just started (game clock). */
export function hourLine(hour) {
  return `São ${hourWords(hour)}. ${greeting(hour)} a todos os passageiros.`;
}

const WEATHER_LINES = {
  rain: 'Atenção, passageiros: chuva nos próximos quilômetros. Aproveitem o barulhinho no vidro.',
  storm: 'Atenção: tempestade a caminho. Fiquem tranquilos, o trem conhece bem o caminho.',
  clear: 'O tempo abriu. Céu limpo pela frente.',
};

function savedOn() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch (err) {
    console.warn('Announcer setting unavailable:', err);
    return false;
  }
}

/**
 * The radio announcer: speaks (Web Speech) the next station, arrivals, the hour, weather
 * changes, rare sights and a short chronicle now and then; the radio ducks while it talks.
 */
export function createAnnouncer(doc, { radio }) {
  const box = doc.getElementById('announcer');
  if (!box) throw new Error('Missing element #announcer');
  const synth = window.speechSynthesis;
  box.checked = savedOn();
  box.disabled = !synth;
  box.addEventListener('change', () => {
    try {
      localStorage.setItem(STORAGE_KEY, box.checked ? '1' : '0');
    } catch (err) {
      console.warn('Announcer setting not saved:', err);
    }
    if (box.checked) say('Boa viagem! Eu sou o locutor do rádio do trem e vou acompanhar vocês.');
    else synth?.cancel();
  });

  let memory = null; // what was already announced
  let talking = 0;

  function say(text) {
    if (!synth || !box.checked) return;
    if (synth.pending) synth.cancel(); // never pile up stale news
    const u = new SpeechSynthesisUtterance(t(text));
    u.lang = currentLang() === 'pt' ? 'pt-BR' : 'en-US';
    const voice = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith(u.lang.slice(0, 2)));
    if (voice) u.voice = voice;
    u.rate = 1;
    u.pitch = 0.95;
    u.onstart = () => { talking += 1; radio.duck?.(DUCK); };
    u.onend = () => { talking = Math.max(0, talking - 1); if (!talking) radio.duck?.(1); };
    u.onerror = u.onend;
    synth.speak(u);
  }

  /** Called every frame; `weather` is the current weather mode (clear/rain/storm). */
  function observe(state, env, weather) {
    const hour = Math.floor(state.dayTime * 24);
    const next = nextStation(state.distance, state.served?.id);
    if (!memory) {
      memory = { hour, weather, approach: null, arrival: state.served?.id ?? null, chronicle: state.time, sky: false };
      return;
    }
    if (!box.checked) return;
    if (state.arrived && state.served && memory.arrival !== state.served.id) {
      memory = { ...memory, arrival: state.served.id };
      say(`Estação ${state.served.name}. Desembarque com cuidado e boa viagem a quem segue.`);
    } else if (next && next.stopAt - state.distance < APPROACH_METERS && memory.approach !== next.id && state.speed > 1) {
      memory = { ...memory, approach: next.id };
      say(`Próxima estação: ${next.name}.`);
    } else if (hour !== memory.hour) {
      // The game day passes in minutes: only the day's landmarks get announced (6h, noon, 18h, midnight).
      memory = { ...memory, hour };
      if (hour % 6 === 0) say(hourLine(hour));
    } else if (weather !== memory.weather) {
      memory = { ...memory, weather };
      if (WEATHER_LINES[weather]) say(WEATHER_LINES[weather]);
    } else if (!memory.sky && env.sunElev < -0.2 && env.rain < 0.2 && meteorNight(state.dayCount ?? 0)) {
      memory = { ...memory, sky: true };
      say('Olhem para o céu: hoje é noite de chuva de meteoros. Façam seus pedidos!');
    } else if (state.time - memory.chronicle > CHRONICLE_EVERY) {
      memory = { ...memory, chronicle: state.time };
      const lines = [...(CHRONICLES[biomeName(state.distance)] ?? []), ...GENERIC];
      say(lines[Math.floor(hash(Math.floor(state.time), 2611) * lines.length)]);
    }
  }

  return { observe, say };
}
