import { biomeName } from './biomes.js';
import { isNight } from './clock.js';
import { DWELL } from './stations.js';
import { meteorNight } from './moon.js';
import { hash } from './utils.js';

const SLOT = 70; // seconds between chances of a thought
const SECONDS = 4.5;

const GENERIC = [
  'Nova fase, nova vida.',
  'O caminho também é o destino.',
  'Cada estação é um recomeço.',
  'Deixar pra trás o que não cabe mais.',
  'O novo começa agora.',
  'Respira fundo. Tá tudo bem.',
  'Quando foi a última vez que olhei o céu assim?',
  'Esse trem balança igual rede...',
  'Preciso ligar pra minha mãe quando chegar.',
  'Será que esqueci a luz de casa acesa?',
  'Tudo passa tão rápido lá fora...',
  'Um dia vou morar numa casinha dessas.',
];
const METEORS = ['Uma chuva de meteoros! Faz um pedido!', 'Quantas estrelas cadentes... já perdi a conta.', 'Pedi uma vida nova. Acho que já começou.'];
const NEXUS = ['Nexus... é aqui que tudo muda.', 'Estação da nova fase. Cheguei.', 'Tudo se conecta, no fim das contas.', 'O que eu deixo nesta estação? O que eu levo?'];
const NIGHT = ['As estrelas parecem acompanhar o trem.', 'Que silêncio bom...', 'A noite tem outro ritmo.'];
const RAIN = ['Chuva no vidro dá vontade de escrever.', 'Tomara que pare até eu chegar.', 'Barulhinho bom de chuva.'];
const WINTER = ['Brr... ainda bem que trouxe casaco.', 'Chocolate quente ia bem agora.'];
const BIOME = {
  Campos: ['Dá pra sentir o cheiro de mato daqui.'],
  Fazenda: ['Será que aquelas vacas têm nome?'],
  Floresta: ['Quantos bichos devem estar escondidos ali...'],
  Montanhas: ['Lá em cima deve estar gelado.'],
  Outono: ['Folhas caindo... tudo se renova.'],
  Subúrbio: ['Cada janela, uma história.'],
  Cidade: ['Tanta gente, tanta pressa.'],
  Litoral: ['Cheiro de maresia!'],
};

function pool(state, env) {
  if (isNight(state.dayTime) && meteorNight(state.dayCount ?? 0) && env.rain < 0.2) return METEORS;
  if (isNight(state.dayTime)) return [...NIGHT, ...GENERIC];
  if (env.rain > 0.5) return [...RAIN, ...GENERIC];
  if (env.season.winter > 0.5) return [...WINTER, ...GENERIC];
  return [...(BIOME[biomeName(state.distance)] ?? []), ...GENERIC];
}

/** Stopped at the Nexus station she always has something to think about. */
function nexusThought(state) {
  if (!(state.dwell > 0) || state.served?.name !== 'Nexus') return null;
  const since = DWELL - state.dwell;
  if (since < 2 || since > 2 + SECONDS) return null;
  return NEXUS[Math.floor(hash(state.served.id, 2511) * NEXUS.length)];
}

/**
 * A thought she has on her own now and then (shown as a thought bubble), or null.
 * `busy` = something else is happening (a conversation, a visitor, she's asleep...).
 */
export function thoughtAt(state, env, busy) {
  if (busy) return null;
  const nexus = nexusThought(state);
  if (nexus) return nexus;
  const k = Math.floor(state.time / SLOT);
  if (k < 1 || hash(k, 2501) > 0.6) return null;
  const start = k * SLOT + 10 + hash(k, 2502) * (SLOT - SECONDS - 20);
  if (state.time < start || state.time > start + SECONDS) return null;
  const lines = pool(state, env);
  return lines[Math.floor(hash(k, 2503) * lines.length)];
}
