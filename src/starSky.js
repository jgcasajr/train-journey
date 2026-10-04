import { t } from './i18n.js';
import { hash, hex, rgba, smoothstep } from './utils.js';

const STAR = hex('#f4f2ff');
const DUST = hex('#c9c2ff');
const LINE = hex('#b9c4ff');

/** Bright planets, at fractions of the window (x) and of the sky above the horizon (y). */
const PLANETS = [
  { name: 'Vênus', x: 0.18, y: 0.62, r: 1.25, color: hex('#fff6d2') },
  { name: 'Júpiter', x: 0.71, y: 0.32, r: 1.05, color: hex('#f1e2c4') },
  { name: 'Marte', x: 0.44, y: 0.18, r: 0.8, color: hex('#ff9a7a') },
];

/** Constellations: star points (same fractions) and the lines that join them. */
const CONSTELLATIONS = [
  { name: 'Cruzeiro do Sul', stars: [[0.84, 0.48], [0.86, 0.64], [0.8, 0.56], [0.9, 0.55], [0.875, 0.6]], lines: [[0, 1], [2, 3]] },
  { name: 'Órion', stars: [[0.3, 0.12], [0.36, 0.14], [0.31, 0.3], [0.33, 0.31], [0.35, 0.32], [0.29, 0.46], [0.38, 0.45]], lines: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]] },
  { name: 'Escorpião', stars: [[0.55, 0.25], [0.57, 0.33], [0.6, 0.4], [0.62, 0.5], [0.66, 0.56], [0.7, 0.55], [0.72, 0.5]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]] },
];

const night = (env) => smoothstep(-0.12, -0.3, env.sunElev) * (1 - Math.min(1, env.rain * 2.5));

/** The sky turns slowly overhead: everything drifts a little sideways with the hours. */
function skyPoint(layout, env, [fx, fy]) {
  const { win, horizon } = layout;
  const drift = (env.dayTime % 1) * 0.12;
  return { x: win.x + (((fx - drift) % 1) + 1) % 1 * win.w, y: win.y + fy * (horizon - win.y) };
}

/** A soft diagonal band of light, dusted with hundreds of faint tiny stars. */
function drawMilkyWay(ctx, layout, env, strength) {
  const { win, horizon, u } = layout;
  const skyH = horizon - win.y;
  const width = skyH * 0.32;
  const x0 = win.x;
  const y0 = win.y + skyH * 0.78;
  const x1 = win.x + win.w;
  const y1 = win.y + skyH * 0.12;
  const angle = Math.atan2(y1 - y0, x1 - x0);
  ctx.save();
  ctx.translate((x0 + x1) / 2, (y0 + y1) / 2);
  ctx.rotate(angle);
  const length = Math.hypot(x1 - x0, y1 - y0) + width;
  const band = ctx.createLinearGradient(0, -width / 2, 0, width / 2);
  band.addColorStop(0, rgba(DUST, 0));
  band.addColorStop(0.5, rgba(DUST, strength * 0.1));
  band.addColorStop(1, rgba(DUST, 0));
  ctx.fillStyle = band;
  ctx.fillRect(-length / 2, -width / 2, length, width);
  for (let i = 0; i < 360; i++) {
    const along = (hash(i, 4101) - 0.5) * length;
    const across = (hash(i, 4102) + hash(i, 4104) - 1) * width * 0.5; // denser in the middle
    ctx.fillStyle = rgba(STAR, strength * (0.25 + hash(i, 4103) * 0.5));
    ctx.fillRect(along, across, Math.max(0.8, u * 0.18), Math.max(0.8, u * 0.18));
  }
  ctx.restore();
}

function drawPlanets(ctx, layout, env, strength, labels) {
  const { u } = layout;
  PLANETS.forEach((p) => {
    const { x, y } = skyPoint(layout, env, [p.x, p.y]);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, u * p.r * 3);
    glow.addColorStop(0, rgba(p.color, strength * 0.6));
    glow.addColorStop(1, rgba(p.color, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(x - u * p.r * 3, y - u * p.r * 3, u * p.r * 6, u * p.r * 6);
    ctx.fillStyle = rgba(p.color, strength);
    ctx.beginPath();
    ctx.arc(x, y, u * p.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    if (labels) label(ctx, layout, t(p.name), x + u * 1.6, y + u * 0.4, strength * 0.7);
  });
}

function label(ctx, layout, text, x, y, alpha) {
  ctx.fillStyle = rgba(LINE, alpha);
  ctx.font = `italic ${Math.max(9, layout.u * 1.5)}px Georgia, serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function drawConstellations(ctx, layout, env, strength, labels, time) {
  const { u } = layout;
  CONSTELLATIONS.forEach((c, ci) => {
    const pts = c.stars.map((s) => skyPoint(layout, env, s));
    if (labels) {
      ctx.strokeStyle = rgba(LINE, strength * 0.25);
      ctx.lineWidth = Math.max(0.6, u * 0.12);
      ctx.beginPath();
      c.lines.forEach(([a, b]) => {
        ctx.moveTo(pts[a].x, pts[a].y);
        ctx.lineTo(pts[b].x, pts[b].y);
      });
      ctx.stroke();
    }
    pts.forEach((p, i) => {
      const twinkle = 0.75 + 0.25 * Math.sin(time * (1.5 + hash(ci * 10 + i, 4111)) + i);
      ctx.fillStyle = rgba(STAR, strength * twinkle);
      ctx.beginPath();
      ctx.arc(p.x, p.y, u * (0.28 + hash(ci * 10 + i, 4112) * 0.22), 0, Math.PI * 2);
      ctx.fill();
    });
    if (labels) {
      const top = pts.reduce((m, p) => (p.y < m.y ? p : m), pts[0]);
      label(ctx, layout, t(c.name), top.x + u * 1.5, top.y - u * 1.5, strength * 0.55);
    }
  });
}

/**
 * The night sky in detail: Milky Way, planets and constellations. On the Star Line the sky is
 * the show (lines and names drawn); elsewhere it only shows faintly on clear nights.
 */
export function drawStarSky(ctx, layout, state, env, starLine) {
  const strength = night(env) * (starLine ? 1 : 0.45);
  if (strength < 0.03) return;
  drawMilkyWay(ctx, layout, env, strength);
  drawConstellations(ctx, layout, env, strength, starLine, state.time);
  drawPlanets(ctx, layout, env, strength, starLine);
}

/** Constellations are named only on the Star Line, on clear nights (for the journal). */
export const constellationsVisible = (env, starLine) => starLine && night(env) > 0.6;
