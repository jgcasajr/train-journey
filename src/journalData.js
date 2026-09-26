import { BIOMES, biomeAt, biomeName, num } from './biomes.js';
import { aisleEventAt, beatAt, cupWithPassenger } from './cabin.js';
import { LIGHTHOUSE_DEPTH, lighthousesInView } from './coast.js';
import { layerFrame } from './frame.js';
import { passingCoverage } from './passingTrain.js';
import { bridgeAt } from './rivers.js';
import { crossingsBetween } from './roads.js';
import { dominantSeason } from './seasons.js';
import { tunnelCoverage } from './tunnel.js';
import { companionPersona } from './companion.js';
import { CAST, passerbyAt } from './passersby.js';
import { PERSONAS } from './personas.js';
import { fireworkBursts, shootingStarAt } from './rareSky.js';
import { precipitationKind, rainbowStrength } from './weatherView.js';
import { deerInView, whaleAt } from './wildlife.js';

const BIOME_ICONS = {
  Campos: '🌾', Fazenda: '🐄', Floresta: '🌲', Montanhas: '🏔️', Outono: '🍂', Subúrbio: '🏡', Cidade: '🏙️', Litoral: '🏖️',
};
const STATION_WHERE = {
  Campos: 'nos campos', Fazenda: 'na fazenda', Montanhas: 'nas montanhas',
  Subúrbio: 'no subúrbio', Cidade: 'na cidade', Litoral: 'no litoral',
};
const SEASONS = [
  { id: 'spring', title: 'Primavera', icon: '🌸', hint: 'Quando as árvores florescem.' },
  { id: 'summer', title: 'Verão', icon: '☀️', hint: 'A estação mais quente.' },
  { id: 'autumn', title: 'Outono', icon: '🍁', hint: 'Folhas alaranjadas no vento.' },
  { id: 'winter', title: 'Inverno', icon: '⛄', hint: 'Tudo fica branquinho.' },
];

export const CATEGORIES = ['Estações', 'Paisagens', 'Estações do ano', 'Céu e clima', 'Pelo caminho', 'Momentos', 'Personagens', 'Raridades', 'Marcos'];

/**
 * Every collectible discovery. `test(f)` receives the facts of the current frame (see factsFrom);
 * `hint` is shown on the card until it is found.
 */
export const DISCOVERIES = [
  ...BIOMES.filter((b) => b.station).map((b) => ({
    id: `station:${b.station}`, category: 'Estações', icon: '🚉', title: b.station,
    hint: `Uma parada ${STATION_WHERE[b.name] ?? 'pelo caminho'}.`, test: (f) => f.station === b.station,
  })),
  ...BIOMES.map((b) => ({
    id: `biome:${b.name}`, category: 'Paisagens', icon: BIOME_ICONS[b.name] ?? '🗺️', title: b.name,
    hint: 'Continue viajando...', test: (f) => f.biome === b.name,
  })),
  ...SEASONS.map((s) => ({ ...s, id: `season:${s.id}`, category: 'Estações do ano', test: (f) => f.season === s.id })),
  { id: 'rainbow', category: 'Céu e clima', icon: '🌈', title: 'Arco-íris', hint: 'Algo colorido depois da chuva.', test: (f) => f.rainbow },
  { id: 'lightning', category: 'Céu e clima', icon: '⚡', title: 'Relâmpago', hint: 'Só aparece quando o tempo fecha.', test: (f) => f.lightning },
  { id: 'snowfall', category: 'Céu e clima', icon: '❄️', title: 'Nevando', hint: 'Frio + precipitação.', test: (f) => f.snowing },
  { id: 'mist', category: 'Céu e clima', icon: '🌫️', title: 'Neblina da manhã', hint: 'Bem cedinho, nos vales.', test: (f) => f.mist },
  { id: 'stars', category: 'Céu e clima', icon: '✨', title: 'Céu estrelado', hint: 'Uma noite sem nuvens.', test: (f) => f.stars },
  { id: 'sunset', category: 'Céu e clima', icon: '🌇', title: 'Pôr do sol', hint: 'O céu fica alaranjado.', test: (f) => f.sunset },
  { id: 'tunnel', category: 'Pelo caminho', icon: '🚇', title: 'Túnel', hint: 'Tudo escurece de repente.', test: (f) => f.tunnel },
  { id: 'bridge', category: 'Pelo caminho', icon: '🌉', title: 'Ponte', hint: 'Atravessar um rio.', test: (f) => f.bridge },
  { id: 'crossing', category: 'Pelo caminho', icon: '🚦', title: 'Passagem de nível', hint: 'Carros esperando o trem passar.', test: (f) => f.crossing },
  { id: 'passing', category: 'Pelo caminho', icon: '🚆', title: 'Trem cruzando', hint: 'Vuuush!', test: (f) => f.passing },
  { id: 'lighthouse', category: 'Pelo caminho', icon: '🔆', title: 'Farol', hint: 'Lá no litoral.', test: (f) => f.lighthouse },
  { id: 'conductor', category: 'Momentos', icon: '🎫', title: 'Bilhete conferido', hint: 'Alguém de quepe vai passar.', test: (f) => f.conductor },
  { id: 'coffee', category: 'Momentos', icon: '☕', title: 'Café fresquinho', hint: 'O carrinho de lanches.', test: (f) => f.coffee },
  { id: 'emergency', category: 'Momentos', icon: '🛑', title: 'Freio de emergência', hint: 'Só em caso de emergência...', test: (f) => f.emergency },
  { id: 'animal', category: 'Momentos', icon: '🐮', title: 'Conversa com os bichos', hint: 'Clique em um animal.', test: (f) => f.animal },
  { id: 'flock', category: 'Momentos', icon: '🐦', title: 'Revoada', hint: 'Assuste os pássaros.', test: (f) => f.flock },
  { id: 'balloon', category: 'Momentos', icon: '🎈', title: 'Olá, balão!', hint: 'Acene para quem está lá no alto.', test: (f) => f.balloonWave },
  { id: 'companion', category: 'Momentos', icon: '🧳', title: 'Companhia de viagem', hint: 'Alguém pode sentar no banco da frente.', test: (f) => f.companion },
  { id: 'woke', category: 'Momentos', icon: '😴', title: 'Acordou a passageira', hint: 'Não se faz isso com quem dorme...', test: (f) => f.woke },
  ...PERSONAS.map((pe) => ({
    id: `persona:${pe.id}`, category: 'Personagens', icon: pe.icon, title: pe.name,
    hint: 'Alguém pode sentar no banco da frente.', test: (f) => f.companionPersona === pe.id,
  })),
  ...CAST.map((ch) => ({
    id: `character:${ch.id}`, category: 'Personagens', icon: ch.icon, title: ch.name,
    hint: ch.rarity <= 3 ? 'Esse é raro de ver...' : 'Alguém vai passar pelo corredor.', test: (f) => f.passerby === ch.id,
  })),
  { id: 'shootingStar', category: 'Raridades', icon: '🌠', title: 'Estrela cadente', hint: 'Olhe o céu numa noite limpa.', test: (f) => f.shootingStar },
  { id: 'deer', category: 'Raridades', icon: '🦌', title: 'Cervo', hint: 'Bem no meio da floresta.', test: (f) => f.deer },
  { id: 'fireworks', category: 'Raridades', icon: '🎆', title: 'Fogos de artifício', hint: 'A cidade à noite às vezes comemora.', test: (f) => f.fireworks },
  { id: 'whale', category: 'Raridades', icon: '🐋', title: 'Baleia', hint: 'Fique de olho no mar.', test: (f) => f.whale },
  { id: 'arrival', category: 'Marcos', icon: '🏁', title: 'Chegada ao destino', hint: 'Escolha um destino no painel.', test: (f) => f.arrival },
  { id: 'km10', category: 'Marcos', icon: '🛤️', title: '10 km de viagem', hint: 'Continue a viagem.', test: (f) => f.traveled >= 10000 },
  { id: 'km50', category: 'Marcos', icon: '🏅', title: '50 km de viagem', hint: 'Uma longa jornada.', test: (f) => f.traveled >= 50000 },
];

/** The passer-by counts as met once they stop by her or are halfway across the aisle. */
function passerbySeen(state) {
  const ev = passerbyAt(state.time, state.dayTime);
  if (!ev) return null;
  return ev.phase === 'stop' || (ev.phase === 'cross' && ev.p > 0.3 && ev.p < 0.7) ? ev.ch.id : null;
}

/** Facts about the current frame that discoveries are tested against. */
export function factsFrom({ state, env, view, traveled }) {
  const ev = aisleEventAt(state.time, state.dayTime);
  const windowMeters = view.win.w / view.px;
  const lighthouses = lighthousesInView(view, layerFrame(view, state, LIGHTHOUSE_DEPTH));
  const effects = state.effects ?? [];
  return {
    biome: biomeName(state.distance),
    season: dominantSeason(env.season),
    station: state.dwell > 0 ? state.served?.name : null,
    rainbow: rainbowStrength(env) > 0.25,
    lightning: state.lightning !== null && state.lightning !== undefined,
    snowing: precipitationKind(env, num(biomeAt(state.distance), 'snow')) === 'snow' && env.rain > 0.4,
    mist: env.mist > 0.4,
    stars: env.sunElev < -0.2 && env.rain < 0.2,
    sunset: env.dayTime > 0.7 && env.dayTime < 0.8 && env.warm > 0.6,
    tunnel: tunnelCoverage(view, state) > 0.8,
    bridge: bridgeAt(state.distance),
    crossing: crossingsBetween(state.distance, state.distance + windowMeters).length > 0,
    passing: passingCoverage(view, state) > 0.3,
    lighthouse: lighthouses.some((l) => l.x > view.win.x && l.x < view.win.x + view.win.w),
    conductor: beatAt(ev)?.action === 'punch',
    coffee: cupWithPassenger(ev),
    emergency: state.time < (state.brakeUntil ?? 0),
    animal: effects.some((e) => e.kind === 'float'),
    flock: state.time - (state.scatterAt ?? -99) < 1,
    balloonWave: effects.some((e) => e.kind === 'wave'),
    woke: state.time < (state.wakeUntil ?? 0),
    companion: state.companion?.status === 'seated',
    shootingStar: shootingStarAt(state, env) !== null,
    deer: deerInView(view, state).some((d) => d.x > view.win.x && d.x < view.win.x + view.win.w),
    fireworks: fireworkBursts(state, env, view).some((b) => b.age > 0.5),
    whale: whaleAt(state, view) !== null,
    arrival: Boolean(state.holding),
    passerby: passerbySeen(state),
    companionPersona: state.companion?.status === 'seated' ? companionPersona(state.companion.seed).id : null,
    traveled,
  };
}
