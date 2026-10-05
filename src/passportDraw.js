import { drawNexusEmblem } from './brand.js';
import { t } from './i18n.js';
import { hash } from './utils.js';

// Drawing of one passport spread: the line's page on the left, its station stamps on the right.

export const SPREAD = { w: 960, h: 640 };
const SERIF = 'Georgia, "Times New Roman", serif';
const COVER = '#1d2a44';
const PAGE = '#f6eedb';
const PAGE_LINE = '#e3d5b4';
const TEXT = '#3a2c20';
const FAINT = 'rgba(58,44,32,0.28)';
export const INKS = { aurora: '#b8342a', horizonte: '#1f6fb2', estelar: '#5b43a8' };

const textHash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 100003, 7);

/** Writes `text` centered at (x, y), shrinking the font so it fits in `maxW`. */
function fitText(ctx, text, x, y, maxW, size, weight = 700) {
  let px = size;
  ctx.font = `${weight} ${px}px ${SERIF}`;
  while (ctx.measureText(text).width > maxW && px > 8) {
    px -= 1;
    ctx.font = `${weight} ${px}px ${SERIF}`;
  }
  ctx.fillText(text, x, y);
}

function drawPages(ctx) {
  const { w, h } = SPREAD;
  ctx.fillStyle = COVER;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 26);
  ctx.fill();
  ctx.fillStyle = PAGE;
  ctx.fillRect(22, 20, w - 44, h - 40);
  ctx.strokeStyle = PAGE_LINE;
  ctx.lineWidth = 1;
  for (let y = 70; y < h - 30; y += 26) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(w - 40, y);
    ctx.stroke();
  }
  const fold = ctx.createLinearGradient(w / 2 - 18, 0, w / 2 + 18, 0);
  fold.addColorStop(0, 'rgba(0,0,0,0)');
  fold.addColorStop(0.5, 'rgba(0,0,0,0.18)');
  fold.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fold;
  ctx.fillRect(w / 2 - 18, 20, 36, h - 40);
}

/** Left page: title, the line, how many stamps, the Nexus emblem. */
function drawLinePage(ctx, { lineName, ink, count, total, first }) {
  const cx = SPREAD.w / 4 + 6;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = TEXT;
  ctx.font = `600 15px ${SERIF}`;
  ctx.fillText(t('PASSAPORTE DE VIAGEM'), cx, 72);
  ctx.fillStyle = ink;
  fitText(ctx, t(lineName), cx, 128, 380, 40);
  drawNexusEmblem(ctx, cx, 290, 86, ink, 2);
  ctx.fillStyle = TEXT;
  ctx.font = `700 26px ${SERIF}`;
  ctx.fillText(t(`${count} de ${total} carimbos`), cx, 430);
  ctx.font = `italic 16px ${SERIF}`;
  ctx.fillStyle = FAINT;
  const note = count === total ? t('Linha completa!') : first ? t(`Primeiro carimbo em ${first}`) : t('Pare nas estações para carimbar.');
  ctx.fillText(note, cx, 466);
  ctx.font = `600 13px ${SERIF}`;
  ctx.fillText('Fractal Nexus · NexionAI Systems', cx, SPREAD.h - 56);
}

/** A rubber stamp: double ring, the place's icon, the station name and the date. */
function drawStamp(ctx, x, y, r, { name, icon, date, lineCode }, ink) {
  const seed = textHash(name);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((hash(seed, 6101) - 0.5) * 0.5);
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, r - 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = `${r * 0.36}px system-ui, sans-serif`;
  ctx.fillText(icon, 0, -r * 0.45);
  fitText(ctx, name.toUpperCase(), 0, -r * 0.02, r * 1.5, r * 0.27, 800);
  ctx.font = `600 ${r * 0.18}px ${SERIF}`;
  ctx.fillText(date, 0, r * 0.3);
  ctx.font = `700 ${r * 0.14}px ${SERIF}`;
  ctx.fillText(lineCode, 0, r * 0.56);
  ctx.globalAlpha = 1;
  ctx.fillStyle = PAGE; // worn ink: a few gaps where the stamp did not touch the paper
  for (let k = 0; k < 26; k++) {
    const a = hash(seed + k, 6102) * Math.PI * 2;
    const d = hash(seed + k, 6103) * r;
    ctx.fillRect(Math.cos(a) * d, Math.sin(a) * d, 2 + hash(seed + k, 6104) * 3, 1.5);
  }
  ctx.restore();
}

function drawEmptySlot(ctx, x, y, r, name) {
  ctx.save();
  ctx.strokeStyle = FAINT;
  ctx.setLineDash([5, 6]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = FAINT;
  fitText(ctx, name, x, y, r * 1.6, 15, 600);
  ctx.restore();
}

/** Where each slot of the right page goes (3 columns). */
function slotCenters(count) {
  const cols = 3;
  const rows = Math.ceil(count / cols);
  const x0 = SPREAD.w / 2 + 30;
  const cellW = (SPREAD.w / 2 - 70) / cols;
  const cellH = Math.min(150, (SPREAD.h - 100) / rows);
  return Array.from({ length: count }, (_, i) => ({
    x: x0 + cellW * (i % cols + 0.5),
    y: 60 + cellH * (Math.floor(i / cols) + 0.5),
    r: Math.min(cellW, cellH) * 0.42,
  }));
}

/**
 * One spread of the passport. `page`: { lineId, lineName, stations: [{ name, icon }],
 * stamps: { [name]: { date } } }.
 */
export function drawPassport(ctx, page) {
  const ink = INKS[page.lineId] ?? TEXT;
  const done = page.stations.filter((s) => page.stamps[s.name]);
  const first = done.map((s) => page.stamps[s.name]).sort((a, b) => a.at - b.at)[0]?.date ?? null;
  drawPages(ctx);
  drawLinePage(ctx, { lineName: page.lineName, ink, count: done.length, total: page.stations.length, first });
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lineCode = t(page.lineName).toUpperCase();
  slotCenters(page.stations.length).forEach(({ x, y, r }, i) => {
    const st = page.stations[i];
    const stamp = page.stamps[st.name];
    if (stamp) drawStamp(ctx, x, y, r, { ...st, date: stamp.date, lineCode }, ink);
    else drawEmptySlot(ctx, x, y, r, st.name);
  });
}
