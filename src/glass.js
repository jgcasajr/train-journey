import { lampPosition, lit } from './interior.js';
import { hex, radialGlow, rgba } from './utils.js';

const WALL = hex('#d6c4a0');
const LAMP_GLOW = hex('#ffd28c');

/** Raindrops on the glass live in window-normalized coordinates (0..1). */
function spawnDrop() {
  return { x: Math.random(), y: Math.random(), r: 0.3 + Math.random() * 0.7, vy: 0.01 + Math.random() * 0.05 };
}

export const createDrops = (count) => Array.from({ length: count }, spawnDrop);

export function updateDrops(drops, dt, speed) {
  return drops.map((d) => {
    const x = d.x - (0.01 + speed * 0.005) * d.r * dt;
    const y = d.y + d.vy * dt;
    return x < -0.05 || y > 1.05 ? spawnDrop() : { ...d, x, y };
  });
}

/** `amount` 0..1: share of drops visible (0 when it is snowing instead of raining). */
export function drawDrops(ctx, layout, state, amount) {
  const visible = Math.round(state.drops.length * amount);
  if (visible === 0) return;
  const { win, u } = layout;
  const vx = (0.01 + state.speed * 0.005) * win.w;
  ctx.lineCap = 'round';
  state.drops.slice(0, visible).forEach((d) => {
    const x = win.x + d.x * win.w;
    const y = win.y + d.y * win.h;
    const r = u * 0.35 * d.r;
    const trail = Math.min(u * 6, 0.12 * Math.hypot(vx * d.r, d.vy * win.h));
    const angle = Math.atan2(-d.vy * win.h, vx * d.r);
    ctx.strokeStyle = 'rgba(230,238,245,0.16)';
    ctx.lineWidth = r * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * trail, y + Math.sin(angle) * trail);
    ctx.stroke();
    ctx.fillStyle = 'rgba(225,235,245,0.4)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Faint glass sheen by day; at night the lit cabin reflects on the glass. */
export function drawGlass(ctx, layout, L) {
  const { win, u } = layout;
  const sheen = ctx.createLinearGradient(win.x, win.y, win.x + win.w * 0.6, win.y + win.h);
  sheen.addColorStop(0, 'rgba(255,255,255,0.10)');
  sheen.addColorStop(0.35, 'rgba(255,255,255,0.02)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.07)');
  sheen.addColorStop(0.62, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(win.x, win.y, win.w, win.h);
  const reflection = (1 - L.daylight) * 0.18 * L.level;
  if (reflection > 0.005) {
    ctx.fillStyle = rgba(lit(WALL, L), reflection);
    ctx.fillRect(win.x, win.y, win.w, win.h);
  }
  if (L.lamp) {
    const lamp = lampPosition(layout);
    radialGlow(ctx, lamp.x, win.y + u * 6, u * 8, LAMP_GLOW, 0.25);
  }
}
