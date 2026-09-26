import { DISHES } from './dining.js';
import { lit } from './interior.js';
import { passengerOrigin } from './passenger.js';
import { circle, hex, radialGlow, rgba } from './utils.js';

const PANEL = hex('#5a3322');
const PANEL_DARK = hex('#3e2216');
const WALL_UPPER = hex('#7a4a30');
const BRASS = hex('#c9a45a');
const CLOTH = hex('#f7f3ea');
const CLOTH_SHADE = hex('#e3dccd');
const PLATE = hex('#fbfaf6');
const GLASS = hex('#dbe8f0');
const WINE = hex('#7a1f2b');
const VASE = hex('#6fa3b8');
const ROSE = hex('#c0392b');
const LEAF = hex('#4f8f3f');
const LAMP_GLOW = hex('#ffd28c');

/** Dining car walls: dark wood paneling with brass trims, two sconces and a small painting. */
export function drawDiningRoom(ctx, layout, L) {
  const { W, H, win, u } = layout;
  ctx.fillStyle = rgba(lit(WALL_UPPER, L));
  ctx.fillRect(0, 0, W, H);
  const panelTop = win.y + win.h + u * 4;
  ctx.fillStyle = rgba(lit(PANEL, L));
  ctx.fillRect(0, panelTop, W, H - panelTop);
  ctx.strokeStyle = rgba(lit(PANEL_DARK, L));
  ctx.lineWidth = Math.max(1, u * 0.3);
  for (let x = u * 4; x < W; x += u * 14) ctx.strokeRect(x, panelTop + u * 3, u * 11, H - panelTop - u * 5);
  ctx.fillStyle = rgba(lit(BRASS, L));
  ctx.fillRect(0, panelTop, W, u * 0.6);
  ctx.fillRect(0, u * 3, W, u * 0.5);
  [win.x - u * 6, win.x + win.w + u * 6].forEach((x) => {
    radialGlow(ctx, x, win.y + win.h * 0.3, u * 16, LAMP_GLOW, 0.35 * Math.max(L.lamp, 0.4));
    ctx.fillStyle = rgba(lit(BRASS, L));
    ctx.fillRect(x - u * 0.3, win.y + win.h * 0.3, u * 0.6, u * 4);
    ctx.fillStyle = 'rgba(255,236,190,0.9)';
    ctx.beginPath();
    ctx.moveTo(x - u * 1.6, win.y + win.h * 0.3);
    ctx.lineTo(x + u * 1.6, win.y + win.h * 0.3);
    ctx.lineTo(x + u * 1, win.y + win.h * 0.3 - u * 2.4);
    ctx.lineTo(x - u * 1, win.y + win.h * 0.3 - u * 2.4);
    ctx.closePath();
    ctx.fill();
  });
}

function drawFood(ctx, x, y, u, dish, level, L) {
  if (!dish || level <= 0.02) return;
  const [main, side, garnish] = dish.colors.map((col) => rgba(lit(hex(col), L)));
  const s = 0.4 + level * 0.6;
  ctx.fillStyle = side;
  ctx.beginPath();
  ctx.ellipse(x - u * 1.2, y - u * 0.35, u * 1.5 * s, u * 0.45 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = main;
  ctx.beginPath();
  ctx.ellipse(x + u * 0.9, y - u * 0.4, u * 1.7 * s, u * 0.55 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = garnish;
  ctx.beginPath();
  circle(ctx, x + u * 0.2, y - u * 0.9 * s, u * 0.35 * s);
  ctx.fill();
}

/** The table by the window: tablecloth, the served plate, wine glass, vase with a rose, candle. */
export function drawDiningTable(ctx, layout, L, state, cup) {
  const { win, u } = layout;
  const top = win.y + win.h + u * 1.2;
  ctx.fillStyle = rgba(lit(CLOTH, L));
  ctx.beginPath();
  ctx.moveTo(win.x - u * 5, top);
  ctx.lineTo(win.x + win.w + u * 5, top);
  ctx.lineTo(win.x + win.w + u * 7, top + u * 9);
  ctx.lineTo(win.x - u * 7, top + u * 9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(lit(CLOTH_SHADE, L));
  ctx.lineWidth = Math.max(1, u * 0.25);
  ctx.beginPath();
  for (let x = win.x; x < win.x + win.w; x += u * 9) {
    ctx.moveTo(x, top + u * 3);
    ctx.lineTo(x - u * 0.6, top + u * 9);
  }
  ctx.stroke();
  const plateX = passengerOrigin(layout).x + u * 30;
  const plateY = top + u * 1.5;
  ctx.fillStyle = rgba(lit(PLATE, L));
  ctx.beginPath();
  ctx.ellipse(plateX, plateY, u * 4.2, u * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  const dish = DISHES.find((d) => d.id === state.meal?.dish);
  drawFood(ctx, plateX, plateY, u, dish, state.meal?.level ?? 0, L);
  const glassX = plateX + u * 7;
  ctx.fillStyle = rgba(lit(GLASS, L), 0.8);
  ctx.fillRect(glassX - u * 0.15, top - u * 1.5, u * 0.3, u * 1.5);
  ctx.beginPath();
  ctx.moveTo(glassX - u * 1, top - u * 4);
  ctx.lineTo(glassX + u * 1, top - u * 4);
  ctx.quadraticCurveTo(glassX + u * 1, top - u * 1.6, glassX, top - u * 1.5);
  ctx.quadraticCurveTo(glassX - u * 1, top - u * 1.6, glassX - u * 1, top - u * 4);
  ctx.fill();
  ctx.fillStyle = rgba(lit(WINE, L));
  ctx.beginPath();
  ctx.ellipse(glassX, top - u * 2.6, u * 0.8, u * 0.9, 0, 0, Math.PI);
  ctx.fill();
  const vaseX = win.x + win.w * 0.55;
  ctx.fillStyle = rgba(lit(VASE, L));
  ctx.beginPath();
  ctx.roundRect(vaseX - u * 0.9, top - u * 3.2, u * 1.8, u * 3.2, u * 0.7);
  ctx.fill();
  ctx.strokeStyle = rgba(lit(LEAF, L));
  ctx.lineWidth = Math.max(1, u * 0.2);
  ctx.beginPath();
  ctx.moveTo(vaseX, top - u * 3);
  ctx.lineTo(vaseX + u * 0.3, top - u * 6.5);
  ctx.stroke();
  ctx.fillStyle = rgba(lit(ROSE, L));
  ctx.beginPath();
  circle(ctx, vaseX + u * 0.3, top - u * 7, u * 0.9);
  ctx.fill();
  if (L.lamp) {
    const candleX = vaseX + u * 5;
    ctx.fillStyle = rgba(lit(CLOTH, L));
    ctx.fillRect(candleX - u * 0.4, top - u * 3, u * 0.8, u * 3);
    radialGlow(ctx, candleX, top - u * 3.6, u * 6, LAMP_GLOW, 0.55);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.ellipse(candleX, top - u * 3.6, u * 0.3, u * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return { plateX, cup };
}
