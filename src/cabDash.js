import { lineKm } from './biomes.js';
import { t } from './i18n.js';
import { nextStation } from './stations.js';
import { hex, mix, rgba } from './utils.js';

const PANEL = hex('#23282c');
const PANEL_EDGE = hex('#3a4247');
const PILLAR = hex('#1a1d20');
const LCD = hex('#9fe3b0');
const NEEDLE = hex('#ff6a3d');
const HORN = hex('#c0392b');
const MAX_KMH = 220;

/** The horn button on the dashboard (screen box), for clicks. */
export function hornBox(layout) {
  const { W, H } = layout;
  const r = Math.min(W, H) * 0.055;
  return { x: W * 0.8 - r, y: H * 0.86 - r, w: r * 2, h: r * 2, r };
}

function drawWindshield(ctx, layout, state, rain) {
  const { W, H } = layout;
  const bottom = H * 0.74;
  ctx.fillStyle = rgba(PILLAR);
  ctx.fillRect(0, 0, W, H * 0.04);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W * 0.07, 0);
  ctx.lineTo(W * 0.04, bottom);
  ctx.lineTo(0, bottom);
  ctx.moveTo(W, 0);
  ctx.lineTo(W * 0.93, 0);
  ctx.lineTo(W * 0.96, bottom);
  ctx.lineTo(W, bottom);
  ctx.fill();
  if (rain < 0.2) return;
  // Wipers sweep in the rain.
  const a = Math.sin(state.time * 2.2) * 0.9 - Math.PI / 2;
  ctx.strokeStyle = rgba(PILLAR);
  ctx.lineWidth = Math.max(2, W * 0.004);
  [0.28, 0.72].forEach((f) => {
    const x = W * f;
    ctx.beginPath();
    ctx.moveTo(x, bottom);
    ctx.lineTo(x + Math.cos(a) * H * 0.3, bottom + Math.sin(a) * H * 0.3);
    ctx.stroke();
  });
}

function drawSpeedometer(ctx, cx, cy, r, kmh) {
  ctx.fillStyle = '#0f1214';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(PANEL_EDGE);
  ctx.lineWidth = r * 0.08;
  ctx.stroke();
  const angle = (v) => Math.PI * 0.75 + (v / MAX_KMH) * Math.PI * 1.5;
  ctx.strokeStyle = '#d8d2c4';
  ctx.lineWidth = Math.max(1, r * 0.03);
  for (let v = 0; v <= MAX_KMH; v += 20) {
    const a = angle(v);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78);
    ctx.lineTo(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9);
    ctx.stroke();
  }
  const a = angle(Math.min(kmh, MAX_KMH));
  ctx.strokeStyle = rgba(NEEDLE);
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82);
  ctx.stroke();
  ctx.fillStyle = '#d8d2c4';
  ctx.font = `600 ${r * 0.3}px Consolas, ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(Math.round(kmh)), cx, cy + r * 0.45);
}

function drawDisplay(ctx, x, y, w, h, state) {
  ctx.fillStyle = '#0c1a12';
  ctx.fillRect(x, y, w, h);
  const next = nextStation(state.distance, state.served?.id);
  const lines = [
    `km ${lineKm(state.distance).toFixed(1)}`,
    next ? t(`Próx.: ${next.name}`) : '',
    next ? `${((next.stopAt - state.distance) / 1000).toFixed(1)} km` : '',
  ];
  ctx.fillStyle = rgba(LCD);
  ctx.font = `600 ${h * 0.2}px Consolas, ui-monospace, monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => ctx.fillText(line, x + h * 0.15, y + h * (0.22 + i * 0.28), w - h * 0.3));
}

function drawHorn(ctx, layout, pressed) {
  const b = hornBox(layout);
  ctx.fillStyle = rgba(mix(HORN, hex('#000000'), pressed ? 0.35 : 0));
  ctx.beginPath();
  ctx.arc(b.x + b.r, b.y + b.r, b.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(PANEL_EDGE);
  ctx.lineWidth = b.r * 0.15;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `600 ${b.r * 0.42}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(t('APITO'), b.x + b.r, b.y + b.r);
}

/**
 * The driver's desk: windshield pillars (and wipers in the rain), speedometer, the line
 * display with the next station, and the horn button. `hornUntil` darkens it while pressed.
 */
export function drawCabDash(ctx, layout, state, env, hornUntil = 0) {
  const { W, H } = layout;
  drawWindshield(ctx, layout, state, env.rain ?? 0);
  const top = H * 0.74;
  const g = ctx.createLinearGradient(0, top, 0, H);
  g.addColorStop(0, rgba(PANEL_EDGE));
  g.addColorStop(0.08, rgba(PANEL));
  g.addColorStop(1, rgba(mix(PANEL, hex('#000000'), 0.4)));
  ctx.fillStyle = g;
  ctx.fillRect(0, top, W, H - top);
  const r = Math.min(W, H) * 0.09;
  drawSpeedometer(ctx, W * 0.2, H * 0.87, r, state.speed * 3.6);
  drawDisplay(ctx, W * 0.36, H * 0.8, W * 0.3, H * 0.13, state);
  drawHorn(ctx, layout, state.time < hornUntil);
}
