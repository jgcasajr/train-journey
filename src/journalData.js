import { BIOMES, LINES, biomeAt, biomeName, lineAt, lineBiomes, num, nightLine } from './biomes.js';
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
import { moonFullness } from './moon.js';
import { constellationsVisible } from './starSky.js';
import { mirageStrength } from './weatherFx.js';
import { onViaduct } from './viaduct.js';
import { auroraStrength } from './nightView.js';
import { fireworkBursts, meteorsAt, shootingStarAt } from './rareSky.js';
import { doubleRainbow, precipitationKind, rainbowStrength } from './weatherView.js';
import { circusInView, festaAt, skywriterAt } from './rareEvents.js';
import { DWELL, stationsBetween } from './stations.js';
import { reunionAt, runnerAt, stopElapsed, vendorAt } from './stationPeople.js';
import { FIELDS_DEPTH } from './landscape.js';
import { deerInView, whaleAt } from './wildlife.js';
import { bellaAt } from './bella.js';
import { cityNight } from './cityNight.js';
import { capybarasInView, dolphinsAt, herdInView } from './animals.js';

export const BIOME_ICONS = {
  Campos: '🌾', Fazenda: '🐄', Floresta: '🌲', Montanhas: '🏔️', Outono: '🍂', Subúrbio: '🏡', Cidade: '🏙️', Litoral: '🏖️',
  Deserto: '🏜️', Vinhedos: '🍇', Lago: '🏞️',
};
const STATION_WHERE = {
  Campos: 'nos campos', Fazenda: 'na fazenda', Montanhas: 'nas montanhas',
  Floresta: 'na floresta', Outono: 'no bosque de outono', Deserto: 'no deserto', Vinhedos: 'nos vinhedos', Lago: 'à beira do lago', Subúrbio: 'no subúrbio', Cidade: 'na cidade', Litoral: 'no litoral',
};
const SEASONS = [
  { id: 'spring', title: 'Primavera', icon: '🌸', hint: 'Quando as árvores florescem.' },
  { id: 'summer', title: 'Verão', icon: '☀️', hint: 'A estação mais quente.' },
  { id: 'autumn', title: 'Outono', icon: '🍁', hint: 'Folhas alaranjadas no vento.' },
  { id: 'winter', title: 'Inverno', icon: '⛄', hint: 'Tudo fica branquinho.' },
];

/** Every station of every line once, with the biome it sits in. */
function uniqueStations() {
  const all = LINES.flatMap((_, i) => lineBiomes(i).filter((b) => b.station));
  return all.filter((b, i) => all.findIndex((o) => o.station === b.station) === i);
}

export const CATEGORIES = ['Estações', 'Paisagens', 'Estações do ano', 'Céu e clima', 'Pelo caminho', 'Momentos', 'Personagens', 'Raridades', 'Marcos', 'Conquistas'];

/**
 * Every collectible discovery. `test(f)` receives the facts of the current frame (see factsFrom);
 * `hint` is shown on the card until it is found.
 */
export const DISCOVERIES = [
  ...uniqueStations().map((b) => ({
    id: `station:${b.station}`, category: 'Estações', icon: b.station === 'Nexus' ? '💠' : '🚉', title: b.station,
    hint: `Uma parada ${STATION_WHERE[b.name] ?? 'pelo caminho'}.`, test: (f) => f.station === b.station,
  })),
  { id: 'car:panorama', category: 'Momentos', icon: '🔭', title: 'Vagão panorâmico', hint: 'Um vagão com teto de vidro...', test: (f) => f.car === 'panorama' },
  { id: 'car:sleeper', category: 'Momentos', icon: '🛏️', title: 'Noite no vagão-leito', hint: 'Durma embalada pelos trilhos.', test: (f) => f.car === 'sleeper' && f.night },
  { id: 'recall', category: 'Personagens', icon: '🤝', title: 'Velho conhecido', hint: 'Reencontre alguém do corredor.', test: (f) => f.recalls > 0 },
  { id: 'scarf', category: 'Momentos', icon: '🧶', title: 'Cachecol de tricô', hint: 'Ela tricota nas horas vagas...', test: (f) => f.knitted >= 150 },
  { id: 'hug', category: 'Momentos', icon: '🫂', title: 'Abraço na plataforma', hint: 'Às vezes alguém desce e é recebido com um abraço.', test: (f) => f.hug },
  { id: 'runner', category: 'Momentos', icon: '🏃', title: 'Correu e conseguiu!', hint: 'Alguém atrasado corre para não perder o trem.', test: (f) => f.runner },
  { id: 'cheeseBread', category: 'Momentos', icon: '🧀', title: 'Pão de queijo quentinho', hint: 'Tem vendedor em algumas plataformas.', test: (f) => f.cheeseBread },
  { id: 'cat', category: 'Personagens', icon: '🐈', title: 'Gato clandestino', hint: 'Alguém dorme no vagão de bagagem.', test: (f) => f.catPets > 0 },
  { id: 'car:cab', category: 'Momentos', icon: '🚂', title: 'Cabine do maquinista', hint: 'Veja os trilhos lá da frente.', test: (f) => f.car === 'cab' },
  { id: 'horn', category: 'Momentos', icon: '📯', title: 'Apito do maquinista', hint: 'Na cabine, aperte o botão vermelho.', test: (f) => f.horns > 0 },
  { id: 'viaduct', category: 'Pelo caminho', icon: '🌉', title: 'Viaduto sobre o vale', hint: 'Entre as parreiras, o chão some lá embaixo...', test: (f) => f.viaduct },
  { id: 'transfer', category: 'Momentos', icon: '🔁', title: 'Baldeação na Nexus', hint: 'Troque de trem na estação Nexus.', test: (f) => f.transfers > 0 },
  { id: 'line:estelar', category: 'Marcos', icon: '✨', title: 'Linha Estelar', hint: 'Uma linha que só anda à noite...', test: (f) => f.line === 2 },
  { id: 'constellations', category: 'Céu e clima', icon: '🌌', title: 'Constelações', hint: 'Na Linha Estelar, o céu tem nomes.', test: (f) => f.constellations },
  { id: 'line:horizonte', category: 'Marcos', icon: '🌅', title: 'Linha Horizonte', hint: 'Existe outra linha além da Nexus...', test: (f) => f.line === 1 },
  ...BIOMES.map((b) => ({
    id: `biome:${b.name}`, category: 'Paisagens', icon: BIOME_ICONS[b.name] ?? '🗺️', title: b.name,
    hint: 'Continue viajando...', test: (f) => f.biome === b.name,
  })),
  ...SEASONS.map((s) => ({ ...s, id: `season:${s.id}`, category: 'Estações do ano', test: (f) => f.season === s.id })),
  { id: 'rainbow', category: 'Céu e clima', icon: '🌈', title: 'Arco-íris', hint: 'Algo colorido depois da chuva.', test: (f) => f.rainbow },
  { id: 'lightning', category: 'Céu e clima', icon: '⚡', title: 'Relâmpago', hint: 'Só aparece quando o tempo fecha.', test: (f) => f.lightning },
  { id: 'fullMoon', category: 'Céu e clima', icon: '🌕', title: 'Lua cheia', hint: 'A lua muda de fase a cada noite.', test: (f) => f.fullMoon },
  { id: 'newMoon', category: 'Céu e clima', icon: '🌑', title: 'Noite de lua nova', hint: 'Uma noite sem lua nenhuma.', test: (f) => f.newMoon },
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
  { id: 'dining', category: 'Momentos', icon: '🍽️', title: 'Jantar no vagão-restaurante', hint: 'Há um vagão com toalha branca...', test: (f) => f.dining },
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
  { id: 'meteorShower', category: 'Raridades', icon: '☄️', title: 'Chuva de meteoros', hint: 'Algumas noites limpas são especiais.', test: (f) => f.meteorShower },
  { id: 'aurora', category: 'Raridades', icon: '🌌', title: 'Aurora boreal', hint: 'Noites limpas nas montanhas nevadas...', test: (f) => f.aurora },
  { id: 'doubleRainbow', category: 'Raridades', icon: '🌈', title: 'Arco-íris duplo', hint: 'Às vezes, depois da chuva, são dois...', test: (f) => f.doubleRainbow },
  { id: 'skywriter', category: 'Raridades', icon: '💘', title: 'Coração no céu', hint: 'Um aviãozinho escreve no céu limpo.', test: (f) => f.skywriter },
  { id: 'festa', category: 'Raridades', icon: '🎉', title: 'Festa junina na estação', hint: 'Bandeirinhas numa estação do interior.', test: (f) => f.festa },
  { id: 'circus', category: 'Raridades', icon: '🎪', title: 'O circo chegou', hint: 'Uma lona listrada nos campos...', test: (f) => f.circus },
  { id: 'hail', category: 'Céu e clima', icon: '🧊', title: 'Chuva de granizo', hint: 'Algumas tempestades trazem pedrinhas de gelo.', test: (f) => f.precip === 'hail' },
  { id: 'blizzard', category: 'Céu e clima', icon: '🌨️', title: 'Nevasca', hint: 'Tempestade de neve nas montanhas.', test: (f) => f.precip === 'blizzard' },
  { id: 'mirage', category: 'Céu e clima', icon: '🏜️', title: 'Miragem no deserto', hint: 'Ao meio-dia, o horizonte do deserto parece água.', test: (f) => f.mirage },
  { id: 'gale', category: 'Céu e clima', icon: '🌬️', title: 'Vendaval', hint: 'Veja as árvores se curvarem ao vento.', test: (f) => f.wind > 0.8 },
  { id: 'deer', category: 'Raridades', icon: '🦌', title: 'Cervo', hint: 'Bem no meio da floresta.', test: (f) => f.deer },
  { id: 'fireworks', category: 'Raridades', icon: '🎆', title: 'Fogos de artifício', hint: 'A cidade à noite às vezes comemora.', test: (f) => f.fireworks },
  { id: 'bella', category: 'Personagens', icon: '🐕', title: 'Bella', hint: 'Uma pastora-alemã que corre ao lado do trem.', test: (f) => f.bella },
  { id: 'bellaPet', category: 'Momentos', icon: '💕', title: 'Carinho na Bella', hint: 'Quando ela aparecer, toque nela.', test: (f) => f.bellaPets > 0 },
  { id: 'herd', category: 'Pelo caminho', icon: '🐎', title: 'Cavalos a galope', hint: 'Nos campos, às vezes eles apostam corrida com o trem.', test: (f) => f.herd },
  { id: 'dolphins', category: 'Raridades', icon: '🐬', title: 'Golfinhos', hint: 'Saltos no mar aberto.', test: (f) => f.dolphins },
  { id: 'capybaras', category: 'Pelo caminho', icon: '🦫', title: 'Família de capivaras', hint: 'Na beira do lago.', test: (f) => f.capybaras },
  { id: 'cityNight', category: 'Pelo caminho', icon: '🌃', title: 'Cidade acordada', hint: 'Passe pela cidade grande à noite.', test: (f) => f.cityNight },
  { id: 'whale', category: 'Raridades', icon: '🐋', title: 'Baleia', hint: 'Fique de olho no mar.', test: (f) => f.whale },
  { id: 'arrival', category: 'Marcos', icon: '🏁', title: 'Chegada ao destino', hint: 'Escolha um destino no painel.', test: (f) => f.arrival },
  { id: 'km10', category: 'Marcos', icon: '🛤️', title: '10 km de viagem', hint: 'Continue a viagem.', test: (f) => f.traveled >= 10000 },
  { id: 'km100', category: 'Conquistas', icon: '🏆', title: '100 km de viagem', hint: 'Uma jornada de verdade.', test: (f) => f.traveled >= 100000 },
  { id: 'min10', category: 'Conquistas', icon: '⏱️', title: '10 minutos a bordo', hint: 'Fique um pouco na janela.', test: (f) => f.minutes >= 10 },
  { id: 'min30', category: 'Conquistas', icon: '☕', title: 'Meia hora a bordo', hint: 'Tempo de um café sem pressa.', test: (f) => f.minutes >= 30 },
  { id: 'hour1', category: 'Conquistas', icon: '⌛', title: 'Uma hora a bordo', hint: 'O trem virou companhia.', test: (f) => f.minutes >= 60 },
  { id: 'hour3', category: 'Conquistas', icon: '🧘', title: 'Três horas a bordo', hint: 'Viajante de longa data.', test: (f) => f.minutes >= 180 },
  { id: 'day1', category: 'Conquistas', icon: '🌅', title: 'Um dia inteiro no trem', hint: 'Veja o sol nascer de novo.', test: (f) => f.days >= 1 },
  { id: 'lunar', category: 'Conquistas', icon: '🌙', title: 'Um ciclo da lua', hint: 'Viaje por 8 dias.', test: (f) => f.days >= 8 },
  { id: 'intentionWritten', category: 'Conquistas', icon: '🕯️', title: 'Intenção lacrada', hint: 'Escreva uma intenção para a viagem.', test: (f) => f.awarded?.has('intentionWritten') },
  { id: 'intentionReturned', category: 'Conquistas', icon: '📬', title: 'A intenção voltou', hint: 'Leve sua intenção até a estação Nexus ou ao destino.', test: (f) => f.awarded?.has('intentionReturned') },
  { id: 'breathing', category: 'Conquistas', icon: '🫁', title: 'Respiração no ritmo do trem', hint: 'Use o botão Respirar até o fim.', test: (f) => f.awarded?.has('breathing') },
  { id: 'installed', category: 'Conquistas', icon: '📲', title: 'Trem no bolso', hint: 'Instale o app pelo painel.', test: (f) => f.awarded?.has('installed') },
  { id: 'shared', category: 'Conquistas', icon: '🔗', title: 'Vista compartilhada', hint: 'Mande a sua vista para alguém.', test: (f) => f.awarded?.has('shared') },
  { id: 'punctual', category: 'Conquistas', icon: '⏰', title: 'Pontualidade britânica', hint: 'Marque um horário de chegada e chegue na hora.', test: (f) => f.awarded?.has('punctual') },
  { id: 'focus1', category: 'Conquistas', icon: '🎯', title: 'Um bloco de foco', hint: 'Use o modo Foco até a primeira pausa.', test: (f) => f.awarded?.has('focus1') },
  { id: 'focus4', category: 'Conquistas', icon: '🏔️', title: 'Quatro blocos seguidos', hint: 'Uma sessão longa de foco no trem.', test: (f) => f.awarded?.has('focus4') },
  ...LINES.map((l) => ({
    id: `passport:${l.id}`, category: 'Conquistas', icon: '🛂', title: `Passaporte da ${l.name}`,
    hint: 'Carimbe todas as estações dessa linha.', test: (f) => f.awarded?.has(`passport:${l.id}`),
  })),
  { id: 'mission1', category: 'Conquistas', icon: '🎯', title: 'Missão cumprida', hint: 'Cumpra a missão do dia (no painel).', test: (f) => f.awarded?.has('mission1') },
  { id: 'missions7', category: 'Conquistas', icon: '🗓️', title: 'Sete missões cumpridas', hint: 'Uma missão por dia, sem pressa.', test: (f) => f.awarded?.has('missions7') },
  { id: 'streak3', category: 'Conquistas', icon: '🔥', title: 'Três dias seguidos', hint: 'Cumpra a missão do dia três dias seguidos.', test: (f) => f.awarded?.has('streak3') },
  { id: 'realSky', category: 'Céu e clima', icon: '📍', title: 'O mesmo céu que o seu', hint: 'Ligue "Hora e clima reais" no painel.', test: (f) => f.awarded?.has('realSky') },
  { id: 'sleepTimer', category: 'Conquistas', icon: '😴', title: 'Bons sonhos', hint: 'Use o timer de sono até o fim.', test: (f) => f.awarded?.has('sleepTimer') },
  { id: 'letterOut', category: 'Conquistas', icon: '✉️', title: 'Carta enviada', hint: 'Compartilhe a vista com uma carta.', test: (f) => f.awarded?.has('letterOut') },
  { id: 'letterIn', category: 'Conquistas', icon: '💌', title: 'Uma carta para você', hint: 'Abra um link que traga uma carta.', test: (f) => f.awarded?.has('letterIn') },
  { id: 'postcard', category: 'Conquistas', icon: '💌', title: 'Primeiro cartão-postal', hint: 'Mande notícias da viagem.', test: (f) => f.awarded?.has('postcard') },
  { id: 'km50', category: 'Marcos', icon: '🏅', title: '50 km de viagem', hint: 'Uma longa jornada.', test: (f) => f.traveled >= 50000 },
];

/** The passer-by counts as met once they stop by her or are halfway across the aisle. */
function passerbySeen(state) {
  const ev = passerbyAt(state.time, state.dayTime);
  if (!ev) return null;
  return ev.phase === 'stop' || (ev.phase === 'cross' && ev.p > 0.3 && ev.p < 0.7) ? ev.ch.id : null;
}

/** What is happening on the platform where the train is standing (reunion, runner, vendor). */
function platformFacts(state) {
  if (!(state.dwell > 0)) return {};
  const st = stationsBetween(state.distance - 1, state.distance + 1).find((s) => s.id === state.served?.id);
  if (!st) return {};
  const elapsed = stopElapsed(state, st);
  return { hug: reunionAt(st) && elapsed > 6, runner: runnerAt(st) && elapsed > DWELL - 2.5, cheeseBread: vendorAt(st) };
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
    snowing: ['snow', 'blizzard'].includes(precipitationKind(env, num(biomeAt(state.distance), 'snow'))) && env.rain > 0.4,
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
    cityNight: cityNight(state, env) > 0.7,
    bella: (bellaAt(state)?.t ?? 0) > 4 && bellaAt(state).alpha > 0.8,
    bellaPets: state.bellaPets ?? 0,
    herd: (herdInView(view, state) ?? []).some((h) => h.x > view.win.x && h.x < view.win.x + view.win.w),
    dolphins: (dolphinsAt(state, view)?.t ?? 0) > 1.5,
    capybaras: capybarasInView(view, state).some((c) => c.x > view.win.x && c.x < view.win.x + view.win.w),
    meteorShower: meteorsAt(state, env).length > 0,
    fullMoon: env.sunElev < -0.1 && env.rain < 0.3 && moonFullness(env.moonPhase ?? 0.5) > 0.93,
    newMoon: env.sunElev < -0.1 && moonFullness(env.moonPhase ?? 0.5) < 0.05,
    arrival: Boolean(state.holding),
    dining: state.car === 'dining' && Boolean(state.meal),
    passerby: passerbySeen(state),
    companionPersona: state.companion?.status === 'seated' ? companionPersona(state.companion.seed).id : null,
    traveled,
    transfers: state.transfers ?? 0,
    car: state.car,
    constellations: constellationsVisible(env, nightLine(state.distance)),
    precip: precipitationKind(env, num(biomeAt(state.distance), 'snow')),
    mirage: mirageStrength(state, env) > 0.5,
    wind: env.wind ?? 0,
    ...platformFacts(state),
    knitted: state.knitted ?? 0,
    recalls: state.recalls ?? 0,
    doubleRainbow: rainbowStrength(env) > 0.3 && doubleRainbow(state),
    skywriter: (skywriterAt(state, env)?.t ?? 0) > 0.6,
    festa: state.dwell > 0 && stationsBetween(state.distance - 1, state.distance + 1).some((st) => st.id === state.served?.id && festaAt(state, st)),
    circus: circusInView(view, state, FIELDS_DEPTH) !== null,
    viaduct: onViaduct(state.distance),
    night: env.sunElev < -0.1,
    aurora: auroraStrength(state, env) > 0.3,
    catPets: state.catPets ?? 0,
    horns: state.horns ?? 0,
    line: lineAt(state.distance),
  };
}
