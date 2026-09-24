import { hex, mix, radialGlow, rgba, scale } from './utils.js';

const LAMP_TINT = hex('#ffcf8a');
const LAMP_GLOW = hex('#ffd28c');
const WALL = hex('#d6c4a0');
const WOOD = hex('#5a3524');
const WOOD_DARK = hex('#3a2218');
const FRAME = hex('#4a2c1e');
const FRAME_EDGE = hex('#8a5a3c');
const CURTAIN = hex('#7a2331');
const CURTAIN_DARK = hex('#4a1119');
const BRASS = hex('#b08d57');
const LEDGE = hex('#6b3f28');
const LEDGE_TOP = hex('#8f5a3a');
const CHINA = hex('#efe8dc');
const COFFEE = hex('#3b2416');
const WHITE = hex('#ffffff');

/** Interior light: daylight through the window, plus the cabin lamp at night or in tunnels. */
export function interiorLighting(env, tunnel) {
  const daylight = env.light * (1 - tunnel);
  const lamp = env.light < 0.4 || tunnel > 0.15 ? 1 : 0;
  return {
    daylight,
    lamp,
    level: Math.max(0.16 + daylight * 0.8, lamp * 0.6),
    spill: mix(env.bottom, WHITE, 0.2),
  };
}

export const lit = (c, L) => mix(scale(c, 0.12), mix(c, LAMP_TINT, L.lamp * 0.22), L.level);

export const lampPosition = ({ win, u }) => ({ x: win.x + win.w * 0.5, y: Math.max(u * 2, win.y - u * 7.5) });

export function drawWall(ctx, layout, L) {
  const { W, H, win, u } = layout;
  ctx.fillStyle = rgba(lit(WALL, L));
  ctx.fillRect(0, 0, W, H);
  const woodTop = win.y + win.h + u * 4;
  ctx.fillStyle = rgba(lit(WOOD, L));
  ctx.fillRect(0, woodTop, W, H - woodTop);
  ctx.fillStyle = rgba(lit(WOOD_DARK, L));
  ctx.fillRect(0, woodTop, W, u * 0.5);
  const ceiling = ctx.createLinearGradient(0, 0, 0, win.y);
  ceiling.addColorStop(0, 'rgba(0,0,0,0.35)');
  ceiling.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ceiling;
  ctx.fillRect(0, 0, W, win.y);
  if (L.daylight > 0.02) {
    radialGlow(ctx, win.x + win.w / 2, win.y + win.h / 2, Math.max(W, H) * 0.7, L.spill, 0.25 * L.daylight);
  }
  if (L.lamp) {
    const lamp = lampPosition(layout);
    radialGlow(ctx, lamp.x, lamp.y, u * 45, LAMP_GLOW, 0.22);
  }
}

export function drawFrame(ctx, layout, L) {
  const { win, u } = layout;
  ctx.lineWidth = u * 2.2;
  ctx.strokeStyle = rgba(lit(FRAME, L));
  ctx.beginPath();
  ctx.roundRect(win.x - u * 1.1, win.y - u * 1.1, win.w + u * 2.2, win.h + u * 2.2, win.r + u * 1.1);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, u * 0.25);
  ctx.strokeStyle = rgba(lit(FRAME_EDGE, L));
  ctx.beginPath();
  ctx.roundRect(win.x - u * 2.2, win.y - u * 2.2, win.w + u * 4.4, win.h + u * 4.4, win.r + u * 2.2);
  ctx.stroke();
}

function drawCurtain(ctx, { win, u }, L, sway) {
  const x0 = win.x - u * 4;
  const top = win.y - u * 3.5;
  const width = win.w * 0.075 + u * 4;
  const tieY = win.y + win.h * 0.55;
  const tieX = x0 + width * 0.45 + sway;
  const bottom = win.y + win.h + u;
  const folds = ctx.createLinearGradient(x0, 0, x0 + width, 0);
  for (let i = 0; i <= 6; i++) folds.addColorStop(i / 6, rgba(lit(i % 2 ? CURTAIN_DARK : CURTAIN, L)));
  ctx.fillStyle = folds;
  ctx.beginPath();
  ctx.moveTo(x0, top);
  ctx.lineTo(x0 + width, top);
  ctx.quadraticCurveTo(x0 + width * 0.9, tieY - win.h * 0.2, tieX, tieY);
  ctx.quadraticCurveTo(x0 + width * 0.9, bottom - win.h * 0.05, x0 + width * 0.85 + sway * 0.5, bottom);
  ctx.lineTo(x0, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(lit(BRASS, L));
  ctx.fillRect(x0, tieY - u * 0.6, tieX - x0 + u * 0.6, u * 1.2);
}

export function drawCurtains(ctx, layout, L, sway) {
  const { win, u } = layout;
  drawCurtain(ctx, layout, L, sway);
  ctx.save();
  ctx.translate(win.x * 2 + win.w, 0);
  ctx.scale(-1, 1);
  drawCurtain(ctx, layout, L, -sway);
  ctx.restore();
  ctx.fillStyle = rgba(lit(BRASS, L));
  ctx.fillRect(win.x - u * 5, win.y - u * 3.9, win.w + u * 10, u * 0.7);
}

function drawSteam(ctx, x, y, u, time) {
  ctx.lineWidth = u * 0.35;
  ctx.lineCap = 'round';
  [0, 1].forEach((k) => {
    ctx.strokeStyle = `rgba(255,255,255,${0.14 + 0.06 * Math.sin(time + k)})`;
    ctx.beginPath();
    for (let j = 0; j <= 10; j++) {
      const t = j / 10;
      const sx = x + (k - 0.5) * 1.2 * u + Math.sin(time * 1.5 + t * 5 + k * 2) * 0.8 * u * t;
      ctx.lineTo(sx, y - t * 7 * u);
    }
    ctx.stroke();
  });
}

function drawCup(ctx, x, y, u, L, time, bob) {
  const china = rgba(lit(CHINA, L));
  ctx.fillStyle = china;
  ctx.beginPath();
  ctx.ellipse(x, y, u * 3.4, u * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - u * 2.2, y - u * 4.2);
  ctx.lineTo(x + u * 2.2, y - u * 4.2);
  ctx.lineTo(x + u * 1.6, y - u * 0.4);
  ctx.lineTo(x - u * 1.6, y - u * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = china;
  ctx.lineWidth = u * 0.6;
  ctx.beginPath();
  ctx.arc(x + u * 2.2, y - u * 2.6, u * 1.1, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.fillStyle = rgba(scale(lit(CHINA, L), 0.8));
  ctx.beginPath();
  ctx.ellipse(x, y - u * 4.2, u * 2.2, u * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(lit(COFFEE, L));
  ctx.beginPath();
  ctx.ellipse(x + bob * 0.3, y - u * 4.2, u * 1.9, u * 0.38, bob * 0.02, 0, Math.PI * 2);
  ctx.fill();
  drawSteam(ctx, x, y - u * 4.8, u, time);
}

export function drawLedge(ctx, layout, L, time, bob) {
  const { win, u } = layout;
  const y = win.y + win.h + u * 1.2;
  ctx.fillStyle = rgba(lit(LEDGE, L));
  ctx.fillRect(win.x - u * 4, y, win.w + u * 8, u * 2.4);
  ctx.fillStyle = rgba(lit(LEDGE_TOP, L));
  ctx.fillRect(win.x - u * 4, y, win.w + u * 8, u * 0.5);
  drawCup(ctx, win.x + win.w * 0.74, y + u * 0.2, u, L, time, bob);
}

export function drawLamp(ctx, layout, L) {
  const { u } = layout;
  const { x, y } = lampPosition(layout);
  if (L.lamp) radialGlow(ctx, x, y + u, u * 14, LAMP_GLOW, 0.45);
  ctx.fillStyle = rgba(lit(BRASS, L));
  ctx.fillRect(x - u * 0.25, y - u * 2, u * 0.5, u * 1.4);
  ctx.beginPath();
  ctx.ellipse(x, y - u * 0.4, u * 2.4, u * 1.6, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = L.lamp ? '#fff3cf' : rgba(lit(hex('#9a9080'), L));
  ctx.beginPath();
  ctx.ellipse(x, y - u * 0.3, u * 1.2, u * 0.7, 0, 0, Math.PI);
  ctx.fill();
}

export function drawVignette(ctx, { W, H }) {
  const g = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
