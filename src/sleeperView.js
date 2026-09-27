import { lit } from './interior.js';
import { circle, hex, rgba } from './utils.js';

const QUILT = ['#5b43a8', '#3b6fa0', '#c9b4f0', '#e8dcc0'].map(hex);
const SHEET = hex('#f1ece2');
const SHEET_SHADE = hex('#d9d2c4');
const WOOD = hex('#5a3524');
const WOOD_DARK = hex('#3a2218');
const BRASS = hex('#b08d57');
const SKIN = hex('#d8a07c');
const HAIR = hex('#2e1d14');
const LAMP = hex('#ffd28c');

/** On wide screens the berth is drawn bigger (she would look tiny scaled by the height alone). */
const scaled = (layout) => ({ ...layout, u: Math.min(Math.max(layout.u, layout.W / 110), layout.W / 78) });

/** The lower berth under the window: mattress top, and where she lies on it (head at `head`). */
function berth(layout) {
  const { win, u, W, H } = layout;
  const top = Math.max(win.y + win.h + u * 7, H * 0.62); // lower on tall screens
  const head = { x: Math.max(W * 0.1, win.x + u * 6), y: top - u * 2.6 };
  return { top, x0: 0, x1: W, bottom: H, head, feet: head.x + u * 64 };
}

/** Her head on the pillow, for clicks. */
export function sleeperHeadBox(view) {
  const layout = scaled(view);
  const { u } = layout;
  const { head } = berth(layout);
  return { x: head.x - u * 7, y: head.y - u * 6, w: u * 16, h: u * 10 };
}

function drawUpperBunk(ctx, layout, L) {
  const { W, H, u, win } = layout;
  ctx.fillStyle = rgba(lit(WOOD_DARK, L));
  ctx.fillRect(0, 0, W, Math.max(u * 3, win.y - u * 5));
  // Ladder up to the upper berth, on the right.
  const x = W - u * 9;
  ctx.fillStyle = rgba(lit(WOOD, L));
  ctx.fillRect(x, 0, u * 0.9, H);
  ctx.fillRect(x + u * 5, 0, u * 0.9, H);
  for (let y = u * 6; y < H; y += u * 8) ctx.fillRect(x, y, u * 5.9, u * 0.8);
}

/** Drawers under the berth, with brass knobs (sleeper cabins keep luggage there). */
function drawDrawers(ctx, layout, L, b) {
  const { u, W } = layout;
  const top = b.top + u * 7;
  const h = Math.min(u * 14, b.bottom - top - u * 3);
  if (h < u * 4) return;
  const count = Math.max(2, Math.round(W / (u * 36)));
  const w = (W - u * 6) / count;
  for (let i = 0; i < count; i++) {
    const x = u * 3 + i * w;
    ctx.strokeStyle = rgba(lit(WOOD_DARK, L));
    ctx.lineWidth = Math.max(1, u * 0.5);
    ctx.strokeRect(x + u, top, w - u * 2, h);
    ctx.fillStyle = rgba(lit(BRASS, L));
    ctx.fillRect(x + w / 2 - u * 2.5, top + h * 0.4, u * 5, u * 1);
  }
}

/** Mattress with its sheet and the wooden berth front below it. */
function drawBed(ctx, layout, L, b) {
  const { u } = layout;
  ctx.fillStyle = rgba(lit(WOOD, L));
  ctx.fillRect(b.x0, b.top + u * 4.5, b.x1 - b.x0, b.bottom - b.top);
  ctx.fillStyle = rgba(lit(WOOD_DARK, L));
  ctx.fillRect(b.x0, b.top + u * 4.5, b.x1 - b.x0, u * 0.8);
  drawDrawers(ctx, layout, L, b);
  ctx.fillStyle = rgba(lit(SHEET, L));
  ctx.beginPath();
  ctx.roundRect(b.x0 - u * 2, b.top - u * 0.5, b.x1 - b.x0 + u * 4, u * 5.2, u * 2);
  ctx.fill();
  ctx.fillStyle = rgba(lit(SHEET_SHADE, L));
  ctx.fillRect(b.x0, b.top + u * 3.6, b.x1 - b.x0, u * 1);
}

/** The outline of her body under the quilt: shoulder, waist, hip, knees and feet. */
function bodyPath(ctx, b, u, breath) {
  const x = b.head.x + u * 5;
  const lift = breath * u * 0.5;
  ctx.beginPath();
  ctx.moveTo(x, b.top + u * 0.5);
  ctx.bezierCurveTo(x + u * 1, b.top - u * 8 - lift, x + u * 10, b.top - u * 8.5 - lift, x + u * 16, b.top - u * 6.5);
  ctx.bezierCurveTo(x + u * 22, b.top - u * 5.5, x + u * 26, b.top - u * 8, x + u * 32, b.top - u * 7.5);
  ctx.bezierCurveTo(x + u * 40, b.top - u * 7, x + u * 44, b.top - u * 5.5, x + u * 50, b.top - u * 5);
  ctx.bezierCurveTo(x + u * 56, b.top - u * 4.6, b.feet, b.top - u * 6, b.feet + u * 2, b.top + u * 0.5);
  ctx.closePath();
}

function drawQuilt(ctx, layout, L, b, breath) {
  const { u } = layout;
  ctx.save();
  bodyPath(ctx, b, u, breath);
  ctx.clip();
  const size = u * 4;
  for (let x = b.head.x, i = 0; x < b.feet + u * 4; x += size, i++) {
    for (let y = b.top - u * 10, j = 0; y < b.top + u; y += size, j++) {
      ctx.fillStyle = rgba(lit(QUILT[(i * 3 + j) % QUILT.length], L));
      ctx.fillRect(x, y, size - Math.max(1, u * 0.2), size - Math.max(1, u * 0.2));
    }
  }
  // The folded sheet edge across her chest.
  ctx.fillStyle = rgba(lit(SHEET, L));
  ctx.fillRect(b.head.x + u * 5, b.top - u * 12, u * 3.2, u * 13);
  ctx.restore();
  ctx.strokeStyle = rgba(lit(hex('#3b2a6e'), L), 0.5);
  ctx.lineWidth = Math.max(1, u * 0.3);
  bodyPath(ctx, b, u, breath);
  ctx.stroke();
}

/** Pillow, hair spread on it, and her face in profile looking up (eyes closed at night). */
function drawHead(ctx, layout, L, b, awake) {
  const { u } = layout;
  const { head } = b;
  ctx.fillStyle = rgba(lit(SHEET, L));
  ctx.beginPath();
  ctx.roundRect(head.x - u * 8, b.top - u * 3.6, u * 13, u * 4.4, u * 2);
  ctx.fill();
  ctx.fillStyle = rgba(lit(HAIR, L));
  ctx.beginPath();
  ctx.ellipse(head.x - u * 2.4, head.y + u * 0.6, u * 4.8, u * 2.4, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(lit(SKIN, L));
  ctx.beginPath();
  ctx.ellipse(head.x, head.y - u * 0.4, u * 3, u * 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Nose pointing up and a little lip line: she lies on her back.
  ctx.beginPath();
  ctx.moveTo(head.x + u * 0.6, head.y - u * 2.8);
  ctx.quadraticCurveTo(head.x + u * 1.3, head.y - u * 3.9, head.x + u * 1.9, head.y - u * 2.7);
  ctx.fill();
  ctx.fillStyle = rgba(lit(HAIR, L));
  ctx.beginPath();
  ctx.arc(head.x - u * 0.8, head.y - u * 0.6, u * 3.1, Math.PI * 0.55, Math.PI * 1.45);
  ctx.fill();
  ctx.strokeStyle = rgba(lit(HAIR, L));
  ctx.lineWidth = Math.max(1, u * 0.35);
  ctx.beginPath();
  if (awake) circle(ctx, head.x + u * 0.2, head.y - u * 1.6, u * 0.4);
  else {
    ctx.moveTo(head.x - u * 0.6, head.y - u * 1.5);
    ctx.quadraticCurveTo(head.x + u * 0.1, head.y - u * 1.1, head.x + u * 0.8, head.y - u * 1.6);
  }
  if (awake) ctx.fill();
  else ctx.stroke();
}

/** A brass reading lamp on the wall above the pillow, glowing when the cabin lamp is on. */
function drawReadingLamp(ctx, layout, L, b) {
  const { u, win } = layout;
  // On the wall left of the window, above the pillow.
  const x = Math.max(u * 4, win.x - u * 3);
  const y = win.y + win.h * 0.55;
  ctx.fillStyle = rgba(lit(BRASS, L));
  ctx.fillRect(x - u * 3, y - u * 0.4, u * 3, u * 0.8); // arm from the wall
  ctx.beginPath();
  ctx.moveTo(x - u * 1.2, y + u * 1.8);
  ctx.lineTo(x + u * 1.2, y + u * 1.8);
  ctx.lineTo(x + u * 0.6, y - u * 0.3);
  ctx.lineTo(x - u * 0.6, y - u * 0.3);
  ctx.fill();
  if (!L.lamp) return;
  const g = ctx.createRadialGradient(x, y + u * 2, 0, x, y + u * 2, u * 14);
  g.addColorStop(0, rgba(LAMP, 0.45));
  g.addColorStop(1, rgba(LAMP, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - u * 14, y - u * 12, u * 28, u * 28);
}

/**
 * Sleeper car: upper bunk and ladder, and the lower berth where she lies under a patchwork
 * quilt shaped by her body — asleep at night (the quilt rises and falls with her breath),
 * eyes open by day.
 */
export function drawSleeper(ctx, view, L, state, awake) {
  const layout = scaled(view);
  const b = berth(layout);
  const breath = Math.sin(state.time * 1.3);
  drawUpperBunk(ctx, view, L);
  drawBed(ctx, layout, L, b);
  drawReadingLamp(ctx, layout, L, b);
  drawQuilt(ctx, layout, L, b, breath);
  drawHead(ctx, layout, L, b, awake);
  if (awake) return;
  ctx.fillStyle = `rgba(255,255,255,${0.55 + 0.3 * breath})`;
  ctx.font = `600 ${layout.u * 2.2}px Georgia, serif`;
  ctx.fillText('z', b.head.x + layout.u * 4, b.head.y - layout.u * 7 - breath * layout.u);
  ctx.fillText('z', b.head.x + layout.u * 6.5, b.head.y - layout.u * 10 - breath * layout.u);
}
