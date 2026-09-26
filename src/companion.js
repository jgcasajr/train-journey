import { isNight } from './clock.js';
import { hash } from './utils.js';

// Timeline (seconds since the status began) of someone boarding or leaving at a station stop.
export const BOARD = { walkFrom: 3, walkTo: 8, sitTo: 9.5, done: 10 };
export const LEAVE = { standTo: 1.5, walkTo: 6, done: 6 };
const BOARD_CHANCE = 0.6;
const CHAT_SLOT = 32; // seconds between conversations
const LINE_SECONDS = 3.2;

/**
 * Conversations: 'c' is the companion, 'p' the passenger. `{next}` becomes the next station name.
 * `greet` plays when they sit down, `bye` while they stand up to leave.
 */
const GREET = [['c', 'Com licença, esse lugar tá livre?'], ['p', 'Tá sim, fica à vontade!']];
const BYE = [['c', 'Foi um prazer! Boa viagem.'], ['p', 'Igualmente, tchau!']];
const CHATS = [
  [['c', 'Primeira vez nessa linha?'], ['p', 'Não, faço sempre! Adoro.'], ['c', 'Eu também, é tão tranquilo.']],
  [['c', 'Pra onde você vai?'], ['p', 'Vou longe ainda. E você?'], ['c', 'Desço em {next}.']],
  [['p', 'Que paisagem, né?'], ['c', 'Linda! Parece uma pintura.']],
  [['c', 'Tá gostando do livro?'], ['p', 'Muito! Não consigo parar.']],
  [['c', 'Será que chove mais tarde?'], ['p', 'Tomara que não!'], ['c', 'Trouxe guarda-chuva, por via das dúvidas.']],
  [['c', 'Que cheiro bom desse café.'], ['p', 'É do carrinho, recomendo!']],
  [['p', 'Você mora por aqui?'], ['c', 'Moro perto de {next}.']],
  [['c', 'Viajar de trem é outra coisa, né?'], ['p', 'Nem me fale. Dá pra pensar na vida.']],
  [['c', 'Você vai a trabalho ou a passeio?'], ['p', 'Um pouco dos dois. Recomeço, sabe?'], ['c', 'Recomeços são os melhores.']],
  [['p', 'Já reparou como a vida parece mais leve no trem?'], ['c', 'É o balanço. Acalma a gente.']],
  [['c', 'Minha avó dizia que viagem boa é a que muda a gente.'], ['p', 'Sábia, sua avó.']],
  [['c', 'Aceita um biscoito?'], ['p', 'Aceito! Obrigada!'], ['c', 'É de polvilho, receita de casa.']],
  [['p', 'Qual a sua estação favorita da linha?'], ['c', 'Porto Azul, por causa do mar.'], ['p', 'Boa escolha!']],
  [['c', 'Olha aquele pássaro!'], ['p', 'Onde? Ah, lá! Que bonito.']],
  [['c', 'Você acredita em destino?'], ['p', 'Acredito em caminho.'], ['c', 'Gostei disso.']],
  [['p', 'Tô começando uma fase nova.'], ['c', 'Que demais! Nova fase, novos ares.'], ['p', 'Exatamente.']],
  [['c', 'Nunca canso dessa paisagem.'], ['p', 'Nem eu. Sempre tem algo diferente.']],
  [['c', 'Que horas são? Perdi a noção.'], ['p', 'No trem o tempo corre diferente.']],
];
const CLICK_LINES = ['Oi! Tudo bem?', 'Quer um biscoito?', 'Bela viagem, né?', 'Adoro essa linha.'];

export const initialCompanion = () => ({ companion: null, companionSpeech: null });

/** Appearance of the companion, derived from their seed. */
export function companionLook(seed) {
  const pick = (list, s) => list[Math.floor(hash(seed, s) * list.length)];
  return {
    coat: pick(['#2f5d8a', '#6a3d6e', '#3f6b4a', '#8a3a3a', '#c9a24a', '#44474d'], 2011),
    skin: pick(['#e0b18f', '#b9835f', '#8a5a3c', '#f1c9a5'], 2012),
    hair: pick(['#2a1c14', '#6b4a2a', '#b8b2a8', '#d9b36a', '#111111'], 2013),
    style: pick(['short', 'long', 'bun', 'hat', 'short'], 2014),
    glasses: hash(seed, 2015) < 0.35,
  };
}

/**
 * Pure update at a station arrival: whoever reached their stop gets up; otherwise someone
 * may board (seeded by the station, so the same stop always brings the same traveller).
 */
function atArrival(state) {
  const c = state.companion;
  if (c && c.status === 'seated') {
    return c.stopsLeft <= 1 ? { ...c, status: 'leaving', since: state.time } : { ...c, stopsLeft: c.stopsLeft - 1 };
  }
  if (c) return c;
  const k = state.served?.id ?? 0;
  if (hash(k, 2001) > BOARD_CHANCE) return null;
  return { seed: k * 13 + 7, stopsLeft: 1 + Math.floor(hash(k, 2002) * 3), status: 'boarding', since: state.time, seatedAt: null };
}

/** Advances boarding → seated and leaving → gone. */
function progress(c, time) {
  if (!c) return null;
  const t = time - c.since;
  if (c.status === 'boarding' && t >= BOARD.done) return { ...c, status: 'seated', seatedAt: time };
  if (c.status === 'leaving' && t >= LEAVE.done) return null;
  return c;
}

export function updateCompanion(state) {
  const companion = progress(state.arrived ? atArrival(state) : state.companion, state.time);
  const speech = state.companionSpeech && state.time < state.companionSpeech.until ? state.companionSpeech : null;
  return { companion, companionSpeech: speech };
}

/** A click on the companion: a short friendly line. */
export function companionClicked(state) {
  const text = CLICK_LINES[Math.floor(hash(state.clicks, 2021) * CLICK_LINES.length)];
  return { companionSpeech: { text, until: state.time + LINE_SECONDS } };
}

function lineAt(lines, t, start) {
  const k = Math.floor((t - start) / (LINE_SECONDS + 0.4));
  const inLine = (t - start) - k * (LINE_SECONDS + 0.4) < LINE_SECONDS;
  return t >= start && k < lines.length && inLine ? lines[k] : null;
}

/**
 * The line being spoken right now between the two: { who: 'c'|'p', text } or null.
 * Greeting after sitting, a chat every ~30 s (not at night, when both doze), goodbye when leaving.
 */
export function companionLine(state, nextName) {
  const c = state.companion;
  if (!c) return null;
  const fill = (line) => line && { who: line[0], text: line[1].replace('{next}', nextName ?? 'a próxima') };
  if (c.status === 'leaving') return fill(lineAt(BYE, state.time - c.since, 0));
  if (c.status !== 'seated') return null;
  const t = state.time - c.seatedAt;
  if (t < 8) return fill(lineAt(GREET, t, 0.5));
  if (isNight(state.dayTime)) return null;
  const slot = Math.floor(t / CHAT_SLOT);
  const chat = CHATS[Math.floor(hash(c.seed * 7 + slot, 2031) * CHATS.length)];
  return fill(lineAt(chat, t - slot * CHAT_SLOT, 6));
}
