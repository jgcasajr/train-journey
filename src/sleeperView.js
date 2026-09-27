import { lit } from './interior.js';
import { circle, hex, rgba } from './utils.js';

const QUILT = ['#5b43a8', '#3b6fa0', '#c9b4f0', '#e8dcc0'].map(hex);
const SHEET = hex('#f1ece2');
const BUNK = hex('#3a2a1e');
const SKIN = hex('#d8a07c');
const HAIR = hex('#2e1d14');
const LAMP = hex('#ffd28c');

/** The lower berth, below the window: mattress top and where her head rests. */
function berth(layout) {
  const { win, u, W, H } = layout;
  const top = win.y + win.h + u * 5;
  return { x: W * 0.04, y: top, w: W * 0.92, h: H - top, pillow: { x: W * 0.14, y: top + u * 1.5 } };
}

/** Her head on the pillow, for clicks. */
export function sleeperHeadBox(layout) {
  const { u } = layout;
  const b = berth(layout);
  return { x: b.pillow.x - u * 7, y: b.pillow.y - u * 7, w: u * 16, h: u * 12 };
}

function drawUpperBunk(ctx, layout, L) {
  const { W, u, win } = layout;
  ctx.fillStyle = rgba(lit(BUNK, L));
  ctx.fillRect(0, 0, W, Math.max(u * 3, win.y - u * 5));
  // Ladder up to the upper berth, on the right.
  const x = W * 0.93;
  ctx.fillRect(x, 0, u * 0.8, layout.H);
  ctx.fillRect(x + u * 5, 0, u * 0.8, layout.H);
  for (let y = u * 6; y < layout.H; y += u * 8) ctx.fillRect(x, y, u * 5.8, u * 0.7);
}

function drawQuilt(ctx, layout, L, breath) {
  const { u } = layout;
  const b = berth(layout);
  ctx.fillStyle = rgba(lit(SHEET, L));
  ctx.fillRect(b.x, b.y, b.w, b.h);
  const top = b.y + u * 4 - breath * u * 0.6;
  const size = u * 6;
  for (let x = b.pillow.x + u * 7, i = 0; x < b.x + b.w; x += size, i++) {
    for (let y = top, j = 0; y < b.y + b.h; y += size, j++) {
      ctx.fillStyle = rgba(lit(QUILT[(i + j) % QUILT.length], L));
      ctx.fillRect(x, y, size - 1, size - 1);
    }
  }
  ctx.fillStyle = rgba(lit(SHEET, L));
  ctx.fillRect(b.pillow.x + u * 7, top - u, b.w, u * 1.6); // the folded sheet edge
}

function drawHead(ctx, layout, L, awake) {
  const { u } = layout;
  const { pillow } = berth(layout);
  ctx.fillStyle = rgba(lit(SHEET, L));
  ctx.beginPath();
  ctx.ellipse(pillow.x, pillow.y + u * 2.5, u * 8, u * 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(lit(HAIR, L));
  ctx.beginPath();
  ctx.ellipse(pillow.x - u * 1.2, pillow.y - u * 0.6, u * 4.6, u * 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(lit(SKIN, L));
  ctx.beginPath();
  circle(ctx, pillow.x + u * 1.4, pillow.y, u * 3.4);
  ctx.fill();
  ctx.strokeStyle = rgba(lit(HAIR, L));
  ctx.lineWidth = u * 0.4;
  ctx.beginPath();
  if (awake) circle(ctx, pillow.x + u * 3, pillow.y - u * 0.6, u * 0.35);
  else {
    ctx.moveTo(pillow.x + u * 2.2, pillow.y - u * 0.4);
    ctx.quadraticCurveTo(pillow.x + u * 3, pillow.y + u * 0.3, pillow.x + u * 3.8, pillow.y - u * 0.4);
  }
  ctx.stroke();
}

function drawReadingLamp(ctx, layout, L) {
  const { u } = layout;
  const { pillow } = berth(layout);
  const x = pillow.x - u * 4;
  const y = pillow.y - u * 12;
  ctx.fillStyle = rgba(lit(hex('#b08d57'), L));
  ctx.fillRect(x - u * 1.5, y - u, u * 3, u * 1.6);
  if (!L.lamp) return;
  const g = ctx.createRadialGradient(x, y + u, 0, x, y + u, u * 16);
  g.addColorStop(0, rgba(LAMP, 0.45));
  g.addColorStop(1, rgba(LAMP, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - u * 16, y - u * 15, u * 32, u * 32);
}

/**
 * Sleeper car: upper bunk and ladder, and the lower berth where she lies under a patchwork
 * quilt — asleep at night (the quilt rises and falls with her breath), eyes open by day.
 */
export function drawSleeper(ctx, layout, L, state, awake) {
  const breath = Math.sin(state.time * 1.3);
  drawUpperBunk(ctx, layout, L);
  drawQuilt(ctx, layout, L, breath);
  drawHead(ctx, layout, L, awake);
  drawReadingLamp(ctx, layout, L);
  if (!awake) {
    ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.3 * breath})`;
    ctx.font = `600 ${layout.u * 2}px Georgia, serif`;
    const { pillow } = berth(layout);
    ctx.fillText('z', pillow.x + layout.u * 6, pillow.y - layout.u * 6 - breath * layout.u);
  }
}
