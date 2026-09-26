import { aisleEventAt } from './aisleSchedule.js';
import { hash } from './utils.js';

const SLOT = 50; // seconds; at most one passer-by per slot
const WALK = 3; // seconds to walk in/out for characters that stop
const LINE = 3.2; // seconds a line stays on screen
const GAP = 0.35;
const APPLE_SECONDS = 240;

/**
 * The cast. `stop`: they stop next to her for a little scene (one of `scripts`, lines as
 * [who, text] with 'x' = the character, 'p' = the passenger). Otherwise they cross the aisle,
 * maybe saying one of `pass` lines, sometimes answered by her (`replies`).
 * `cues` fire sounds/effects at seconds into the stop. `rarity`: relative weight.
 */
export const CAST = [
  {
    id: 'kid', name: 'Criança com balão', icon: '🎈', rarity: 10, crossSeconds: 4.5, scale: 0.62,
    look: { coat: '#e0533d', pants: '#2f5d8a', skin: '#e0b18f', hair: '#6b4a2a', style: 'short' }, props: ['balloon'],
    pass: ['Olha meu balão!', 'Uhuul! Trem!', 'Mãe, olha a vaca!'], replies: ['Que lindo!', 'Cuidado pra não soltar!'],
    clicks: ['Hihi!', 'Quer ver meu balão?'],
  },
  {
    id: 'violinist', name: 'Violinista', icon: '🎻', rarity: 5, stop: true, cues: [{ at: 1, name: 'violin' }],
    look: { coat: '#2b2b33', pants: '#1c1c22', skin: '#b9835f', hair: '#111111', style: 'short' }, props: ['violin'],
    scripts: [
      [['x', 'Uma musiquinha pra viagem?'], ['p', 'Que lindo! Toca mais!'], ['x', 'Obrigado, boa viagem!']],
      [['x', 'Essa eu compus no trem.'], ['p', 'Nossa, arrepiei!']],
    ],
    clicks: ['♪ Lá-lá-lá ♪', 'Pedidos?'],
  },
  {
    id: 'grandma', name: 'Senhora das maçãs', icon: '🍎', rarity: 8, stop: true, gift: 'apple',
    look: { coat: '#6a3d6e', pants: '#3a3a4a', skin: '#f1c9a5', hair: '#d9d4cc', style: 'bun' }, props: ['basket'],
    scripts: [
      [['x', 'Aceita uma maçã, minha filha?'], ['p', 'Aceito sim, obrigada!'], ['x', 'Colhi hoje cedinho.']],
      [['x', 'Tão magrinha... pega uma maçã!'], ['p', 'Haha, obrigada, senhora!']],
    ],
    clicks: ['Tem mais maçã aqui!', 'Deus te abençoe, filha.'],
  },
  {
    id: 'businessman', name: 'Executivo no celular', icon: '📱', rarity: 8, crossSeconds: 8,
    look: { coat: '#3a3f4a', pants: '#23262d', skin: '#e0b18f', hair: '#2a1c14', style: 'short' }, props: ['phone'],
    pass: ['Não, não! O relatório é pra ONTEM!', 'Tô no trem, a ligação vai cair...', 'Fecha a reunião pras três!'],
    replies: ['Hmm... falando alto, né?', 'Relaxa, moço, é só um trem!'],
    clicks: ['Agora não, tô numa ligação!', 'Alô? Alô?!'],
  },
  {
    id: 'tourist', name: 'Turista', icon: '📷', rarity: 7, stop: true, cues: [{ at: 4.2, name: 'flash' }],
    look: { coat: '#f2c14e', pants: '#6b8f3a', skin: '#f1c9a5', hair: '#d9b36a', style: 'cap' }, props: ['camera'],
    scripts: [
      [['x', 'Posso fotografar sua janela?'], ['p', 'Claro, fica à vontade!'], ['x', 'Perfeita! Obrigado!']],
      [['x', 'Que vista incrível!'], ['p', 'Né? A melhor do trem.']],
    ],
    clicks: ['Xiiis!', 'Mais uma foto!'],
  },
  {
    id: 'dog', name: 'Cachorro fugido', icon: '🐕', rarity: 6, crossSeconds: 5, cues: [{ at: 0.6, name: 'bark' }],
    look: { coat: '#8a3a3a', pants: '#2b2f38', skin: '#b9835f', hair: '#2a1c14', style: 'short' }, props: ['dog'],
    pass: ['Rex! Volta aqui, Rex!', 'Desculpa, ele fugiu da caixinha!'], replies: ['Haha, corre, Rex!', 'Que fofo!'],
    clicks: ['Viu um cachorro passar?', 'Rex!!'],
  },
  {
    id: 'couple', name: 'Casal apaixonado', icon: '💕', rarity: 6, crossSeconds: 7,
    look: { coat: '#2f7a6a', pants: '#2b2f38', skin: '#8a5a3c', hair: '#111111', style: 'short' }, props: ['partner'],
    pass: ['Olha, amor, que vista!', 'Nossa primeira viagem juntos!'], replies: ['Que fofos!', 'Aproveitem!'],
    clicks: ['A gente vai se casar!', 'Oi! 💕'],
  },
  {
    id: 'vendor', name: 'Vendedor de balas', icon: '🍬', rarity: 8, stop: true,
    look: { coat: '#c9842a', pants: '#3a3027', skin: '#8a5a3c', hair: '#111111', style: 'short' }, props: ['tray'],
    scripts: [
      [['x', 'Bala, chiclete, paçoca!'], ['p', 'Uma paçoca, por favor!'], ['x', 'Saindo! Bom apetite!']],
      [['x', 'Olha a bala de goma!'], ['p', 'Hoje não, obrigada!'], ['x', 'Tá bom, boa viagem!']],
    ],
    clicks: ['Leva duas, faço preço!', 'Tem de menta também!'],
  },
  {
    id: 'magician', name: 'Mágico', icon: '🎩', rarity: 2, stop: true, cues: [{ at: 4, name: 'magic' }],
    look: { coat: '#1f1f2e', pants: '#1a1a24', skin: '#e0b18f', hair: '#2a1c14', style: 'tophat' }, props: ['wand'],
    scripts: [
      [['x', 'Quer ver uma mágica?'], ['p', 'Quero!'], ['x', 'Abracadabra!'], ['p', 'Ué! Cadê a moeda?!'], ['x', 'Atrás da sua orelha!']],
    ],
    clicks: ['Nada nas mangas!', 'Escolha uma carta...'],
  },
  {
    id: 'student', name: 'Estudante com fones', icon: '🎧', rarity: 8, crossSeconds: 7,
    look: { coat: '#4a6fa5', pants: '#2b2f38', skin: '#e0b18f', hair: '#b85c2a', style: 'long' }, props: ['headphones', 'backpack'],
    pass: ['♪ ♫ ♪', 'Tum-tss, tum-tss...'], replies: ['Que música será?'],
    clicks: ['Hã? Oi! (tira um fone)', 'Tá tocando meu som favorito!'],
  },
];

const TOTAL_WEIGHT = CAST.reduce((s, c) => s + c.rarity, 0);

function pickCharacter(k) {
  const r = hash(k, 2402) * TOTAL_WEIGHT;
  let acc = 0;
  return CAST.find((c) => (acc += c.rarity) >= r) ?? CAST[0];
}

const scriptLength = (lines) => lines.length * (LINE + GAP) + 0.8;

/** Everything about slot k's passer-by that doesn't depend on the current time. */
function slotPlan(k) {
  if (k < 1 || hash(k, 2401) > 0.75) return null;
  const ch = pickCharacter(k);
  const script = ch.stop ? ch.scripts[Math.floor(hash(k, 2405) * ch.scripts.length)] : null;
  const stopSeconds = script ? Math.max(6, scriptLength(script)) : 0;
  const duration = ch.stop ? WALK * 2 + stopSeconds : ch.crossSeconds;
  const start = k * SLOT + 5 + hash(k, 2403) * (SLOT - duration - 10);
  return { k, ch, script, stopSeconds, duration, start, dir: hash(k, 2404) < 0.5 ? -1 : 1 };
}

/** Passers-by give way to the conductor and the snack cart. */
function clashesWithAisle(plan, dayTime) {
  return [0, 0.5, 1].some((f) => aisleEventAt(plan.start + plan.duration * f, dayTime) !== null);
}

/**
 * The passer-by in the aisle now: { k, ch, dir, phase ('in'|'stop'|'out'|'cross'), p, t, tStop, script }
 * or null. `dir` -1 walks right-to-left, +1 left-to-right. Pure function of time.
 */
export function passerbyAt(time, dayTime) {
  const plan = slotPlan(Math.floor(time / SLOT));
  if (!plan) return null;
  const t = time - plan.start;
  if (t < 0 || t > plan.duration || clashesWithAisle(plan, dayTime)) return null;
  if (!plan.ch.stop) return { ...plan, phase: 'cross', p: t / plan.duration, t };
  if (t < WALK) return { ...plan, phase: 'in', p: t / WALK, t };
  if (t < WALK + plan.stopSeconds) return { ...plan, phase: 'stop', p: (t - WALK) / plan.stopSeconds, t, tStop: t - WALK };
  return { ...plan, phase: 'out', p: (t - WALK - plan.stopSeconds) / WALK, t };
}

/** The line being said right now in a passer-by scene: { who: 'x'|'p', text } or null. */
export function passerbyLine(ev) {
  if (!ev) return null;
  if (ev.phase === 'stop' && ev.script) {
    const k = Math.floor((ev.tStop - 0.5) / (LINE + GAP));
    const inLine = ev.tStop >= 0.5 && (ev.tStop - 0.5) - k * (LINE + GAP) < LINE;
    const line = inLine ? ev.script[k] : null;
    return line ? { who: line[0], text: line[1] } : null;
  }
  if (ev.phase !== 'cross' || !ev.ch.pass) return null;
  const say = ev.ch.pass[Math.floor(hash(ev.k, 2406) * ev.ch.pass.length)];
  if (ev.p > 0.15 && ev.p < 0.55) return { who: 'x', text: say };
  const reply = ev.ch.replies && hash(ev.k, 2407) < 0.7 ? ev.ch.replies[Math.floor(hash(ev.k, 2408) * ev.ch.replies.length)] : null;
  return reply && ev.p >= 0.58 && ev.p < 0.95 ? { who: 'p', text: reply } : null;
}

/** Cues (sounds/effects) that fired between two instants of the same scene. */
export function passerbyCues(prevTime, time, dayTime) {
  const ev = passerbyAt(time, dayTime);
  if (!ev?.ch.cues) return [];
  const t0 = ev.ch.stop ? ev.t - WALK - (time - prevTime) : ev.t - (time - prevTime);
  const t1 = ev.ch.stop ? ev.t - WALK : ev.t;
  return ev.ch.cues.filter((c) => c.at > t0 && c.at <= t1).map((c) => c.name);
}

/** Seconds since a cue fired in the current scene (for flashes and sparkles), or Infinity. */
export function cueAge(ev, name) {
  const cue = ev?.ch.cues?.find((c) => c.name === name);
  if (!cue) return Infinity;
  const t = ev.ch.stop ? (ev.tStop ?? -1) : ev.t;
  return t >= cue.at ? t - cue.at : Infinity;
}

export const initialPassersby = () => ({ appleUntil: 0, passerbySpeech: null });

/** The grandma's apple stays on the ledge for a while after she hands it over. */
export function updatePassersby(state) {
  const ev = passerbyAt(state.time, state.dayTime);
  const gave = ev?.ch.gift === 'apple' && ev.phase === 'stop' && passerbyLine(ev)?.who === 'p';
  const speech = state.passerbySpeech && state.time < state.passerbySpeech.until ? state.passerbySpeech : null;
  return {
    appleUntil: gave ? state.time + APPLE_SECONDS : state.appleUntil,
    passerbySpeech: speech,
  };
}

/** A click on the passer-by: a line of their own. */
export function passerbyClicked(state) {
  const ev = passerbyAt(state.time, state.dayTime);
  if (!ev) return {};
  const text = ev.ch.clicks[Math.floor(hash(state.clicks, 2409) * ev.ch.clicks.length)];
  return { passerbySpeech: { text, until: state.time + 2.6, k: ev.k } };
}
