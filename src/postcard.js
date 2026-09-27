import { BRAND, drawNexusEmblem } from './brand.js';
import { t } from './i18n.js';

const W = 1500;
const H = 1000;
const PAD = 40;
const PHOTO_W = 900;
const INK = '#3a2c20';
const HAND = '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';
const SERIF = 'Georgia, "Times New Roman", serif';

const MESSAGES = {
  Campos: 'O campo passa devagar e a cabeça fica leve. Queria que você visse esse verde.',
  Fazenda: 'Vi vacas, cavalos e um celeiro vermelho. A vida simples também é bonita.',
  Floresta: 'A floresta engole o trem por uns minutos. Cheiro de mato e silêncio bom.',
  Montanhas: 'As montanhas lembram que tudo é questão de perspectiva. Lá de cima, deve ser lindo.',
  Outono: 'Folhas caindo pela janela: o que não serve mais, a gente deixa ir.',
  Nexus: 'Parei na estação Nexus. Dizem que é onde as linhas se cruzam e as fases mudam. Senti que era verdade.',
  Subúrbio: 'Cada casinha, uma história. Cada janela acesa, alguém recomeçando.',
  Cidade: 'A cidade corre lá fora, mas aqui dentro o tempo é meu.',
  Litoral: 'Cheiro de maresia pela janela. O mar sempre parece um começo.',
};
const FROM = {
  Campos: 'dos Campos', Fazenda: 'da Fazenda', Floresta: 'da Floresta', Montanhas: 'das Montanhas',
  Outono: 'do Bosque de Outono', Subúrbio: 'do Subúrbio', Cidade: 'da Cidade', Litoral: 'do Litoral',
};
const GENERIC = 'Nova fase, nova vida. O caminho também é o destino.';

/** Greeting and message for a postcard from where the train is now. */
export function postcardText({ biome, station }) {
  const from = station ? `de ${station}` : FROM[biome] ?? 'da viagem';
  return { title: t(`Lembranças ${from}`), message: t(MESSAGES[station === BRAND.station ? 'Nexus' : biome] ?? GENERIC) };
}

function coverImage(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

function wrap(ctx, text, maxWidth) {
  return text.split(' ').reduce((lines, word) => {
    const last = lines[lines.length - 1];
    const tryLine = last ? `${last} ${word}` : word;
    return ctx.measureText(tryLine).width <= maxWidth || !last ? [...lines.slice(0, -1), tryLine] : [...lines, word];
  }, ['']);
}

function drawPhoto(ctx, scene, title) {
  const x = PAD;
  const y = PAD;
  const h = H - PAD * 2;
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - 12, y - 12, PHOTO_W + 24, h + 24);
  coverImage(ctx, scene, x, y, PHOTO_W, h);
  const band = ctx.createLinearGradient(0, y + h - 190, 0, y + h);
  band.addColorStop(0, 'rgba(0,0,0,0)');
  band.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = band;
  ctx.fillRect(x, y + h - 190, PHOTO_W, 190);
  ctx.fillStyle = '#fff6e2';
  ctx.font = `italic 600 58px ${SERIF}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(title, x + 36, y + h - 44, PHOTO_W - 72);
}

function drawStamp(ctx, x, y) {
  const w = 170;
  const h = 200;
  ctx.fillStyle = '#fffaf0';
  ctx.fillRect(x, y, w, h);
  // Perforated edge: little bites all around.
  ctx.fillStyle = '#f3ead8';
  for (let i = 0; i <= 10; i++) {
    [[x + (i * w) / 10, y], [x + (i * w) / 10, y + h], [x, y + (i * h) / 10], [x + w, y + (i * h) / 10]].forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.fillStyle = '#e8a33d';
  ctx.fillRect(x + 16, y + 16, w - 32, h - 58);
  ctx.font = '76px serif';
  ctx.textAlign = 'center';
  ctx.fillText('🚂', x + w / 2, y + 120);
  ctx.fillStyle = INK;
  ctx.font = `600 20px ${SERIF}`;
  ctx.fillText(t('CORREIO · TREM'), x + w / 2, y + h - 16);
  ctx.textAlign = 'left';
}

function drawPostmark(ctx, x, y, { km, date }) {
  ctx.save();
  ctx.strokeStyle = 'rgba(60, 50, 110, 0.75)';
  ctx.fillStyle = 'rgba(60, 50, 110, 0.75)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, 92, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 78, 0, Math.PI * 2);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.font = `600 15px ${SERIF}`;
  ctx.fillText('TRAIN JOURNEY', x, y - 26);
  ctx.font = `600 26px ${SERIF}`;
  ctx.fillText(`km ${km.toFixed(1)}`, x, y + 10);
  ctx.font = `18px ${SERIF}`;
  ctx.fillText(date, x, y + 38);
  [0, 1, 2].forEach((i) => {
    ctx.beginPath();
    ctx.moveTo(x + 100, y - 26 + i * 26);
    ctx.bezierCurveTo(x + 140, y - 46 + i * 26, x + 170, y - 6 + i * 26, x + 210, y - 26 + i * 26);
    ctx.stroke();
  });
  ctx.restore();
}

function drawBack(ctx, { message, clock, date, km }) {
  const x = PAD + PHOTO_W + 60;
  const w = W - x - PAD;
  drawStamp(ctx, W - PAD - 180, PAD + 10);
  drawPostmark(ctx, W - PAD - 300, PAD + 175, { km, date });
  ctx.fillStyle = INK;
  ctx.font = `34px ${HAND}`;
  const lines = wrap(ctx, message, w);
  lines.forEach((line, i) => ctx.fillText(line, x, 390 + i * 52));
  ctx.font = `28px ${HAND}`;
  ctx.fillText(t(`— da janela do trem, às ${clock}`), x, 390 + lines.length * 52 + 30, w);
  ctx.strokeStyle = 'rgba(58, 44, 32, 0.35)';
  ctx.lineWidth = 2;
  [0, 1, 2].forEach((i) => {
    ctx.beginPath();
    ctx.moveTo(x, H - 200 + i * 60);
    ctx.lineTo(x + w, H - 200 + i * 60);
    ctx.stroke();
  });
  ctx.font = `30px ${HAND}`;
  ctx.fillText(t('Para: você, na nova fase'), x, H - 210, w);
}

/** Small NexionAI seal in the bottom-right corner of the card. */
function drawSeal(ctx) {
  const x = W - PAD - 16;
  const y = H - 21;
  drawNexusEmblem(ctx, x, y, 15, 'rgba(91, 67, 168, 0.8)', 1);
  ctx.fillStyle = 'rgba(91, 67, 168, 0.85)';
  ctx.font = `600 15px ${SERIF}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${BRAND.project} · ${BRAND.org}`, x - 24, y);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

/** Composes a postcard (photo with greeting + stamp, postmark and a handwritten note). */
export function makePostcard(doc, scene, info) {
  const card = doc.createElement('canvas');
  card.width = W;
  card.height = H;
  const ctx = card.getContext('2d');
  if (!ctx) throw new Error('Postcard: 2D context unavailable');
  ctx.fillStyle = '#f3ead8';
  ctx.fillRect(0, 0, W, H);
  // The traveler's own words (an intention) are never translated.
  const { title, message } = info.message ? { title: info.title, message: info.message } : postcardText(info);
  drawPhoto(ctx, scene, title);
  ctx.strokeStyle = 'rgba(58, 44, 32, 0.25)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(PAD + PHOTO_W + 36, PAD + 260);
  ctx.lineTo(PAD + PHOTO_W + 36, H - PAD);
  ctx.stroke();
  drawBack(ctx, { message, clock: info.clock, date: info.date, km: info.km });
  drawSeal(ctx);
  return card;
}
