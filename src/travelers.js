import { passerbyAt } from './passersby.js';

const STORAGE_KEY = 'train-journey:travelers:v1';
const AGAIN = 'De novo por aqui? Que coincidência!';

/**
 * What each aisle character tells you when you meet again: their story moves on one chapter
 * per reunion (the last chapter repeats once the story is told).
 */
export const CHAPTERS = {
  kid: ['Oi de novo! Meu balão ainda tá inteiro!', 'Olha, ganhei um balão novo! Azul!', 'Aprendi a dar nó no balão sozinho!'],
  violinist: ['Você de novo! Lembra da minha música?', 'O concerto é semana que vem. Tô nervoso!', 'Tocamos com o teatro lotado! Obrigado pela torcida.'],
  grandma: ['Minha filha, de novo por aqui? Guardei a maçã mais vermelha pra você.', 'Minha neta nasceu! Chama Maria.', 'Hoje é bolo de maçã, receita da minha mãe.'],
  businessman: ['Ah, oi... a gente já se viu, né? Desculpa o outro dia.', 'Desliguei o celular por uma hora. Que estranho... e que bom!', 'Pedi demissão. Vou abrir uma padaria!'],
  tourist: ['Você de novo! Sua janela saiu na minha exposição!', 'Já são 300 fotos desse trem.', 'Vou fazer um livro de fotos. Sua janela é a capa!'],
  dog: ['O Rex te reconheceu! Olha o rabinho!', 'O Rex aprendeu a sentar!', 'O Rex vai ser irmão mais velho: adotamos uma gatinha!'],
  couple: ['Oi! Lembra da gente? Ficamos noivos!', 'Marcamos a data do casamento!', 'Casamos! Essa é a nossa lua de mel.'],
  vendor: ['Freguesa! A paçoca de sempre?', 'Tô juntando dinheiro pra faculdade do meu filho.', 'Meu filho passou no vestibular!'],
  magician: ['Você de novo! Achou a moeda?', 'Aprendi um truque novo, mas é segredo.', 'Vou me apresentar num circo de verdade!'],
  student: ['(tira um fone) Ei, você de novo!', 'Passei na prova! Aquela música deu sorte.', 'Montei uma banda. A gente ensaia no trem!'],
};

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return data && typeof data === 'object' ? data : {};
  } catch (err) {
    console.warn('Travelers memory unavailable:', err);
    return {};
  }
}

function save(meets) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meets));
  } catch (err) {
    console.warn('Travelers memory not saved:', err);
  }
}

/** The chapter someone tells on the meeting after `meetsBefore` earlier ones, or null the first time. */
export function chapterFor(id, meetsBefore) {
  const lines = CHAPTERS[id];
  if (!lines || meetsBefore < 1) return null;
  return lines[Math.min(meetsBefore - 1, lines.length - 1)];
}

/**
 * Remembers who you met in the aisle (across visits, in the browser). The first time someone
 * you already know comes by in a visit, `onRecall(text)` gets the next chapter of their story;
 * seeing them again in the same visit only earns a friendly hello (once).
 */
export function createTravelers({ onRecall }) {
  let meets = load();
  let lastK = null;
  let seen = {}; // this visit: id → times seen
  return {
    observe(state) {
      const ev = passerbyAt(state.time, state.dayTime);
      if (!ev || ev.k === lastK || state.car === 'cab' || state.car === 'baggage') return;
      lastK = ev.k;
      const times = seen[ev.ch.id] ?? 0;
      seen = { ...seen, [ev.ch.id]: times + 1 };
      if (times === 1) onRecall(AGAIN);
      if (times > 0) return;
      const before = meets[ev.ch.id] ?? 0;
      meets = { ...meets, [ev.ch.id]: before + 1 };
      save(meets);
      const text = chapterFor(ev.ch.id, before);
      if (text) onRecall(text);
    },
  };
}
