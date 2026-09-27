import { lit } from './interior.js';
import { hex, rgba } from './utils.js';

const STEEL = hex('#3c4448');
const GLASS_TINT = hex('#bfe3ff');

/**
 * Panorama car: the glass roof ribs over the (taller) window and a slim sill below it.
 * `layout.win` is the panorama window from carLayout.
 */
export function drawPanoramaFrame(ctx, layout, L) {
  const { win, u, W } = layout;
  ctx.fillStyle = rgba(GLASS_TINT, 0.06);
  ctx.fillRect(win.x, win.y, win.w, win.h * 0.45);
  ctx.strokeStyle = rgba(lit(STEEL, L));
  ctx.lineWidth = u * 0.9;
  const ribs = 6;
  for (let i = 1; i < ribs; i++) {
    const x = win.x + (win.w * i) / ribs;
    ctx.beginPath();
    ctx.moveTo(x, win.y);
    ctx.quadraticCurveTo(x + (x - W / 2) * 0.08, win.y + win.h * 0.22, x + (x - W / 2) * 0.12, win.y + win.h * 0.42);
    ctx.stroke();
  }
  // Where the roof glass meets the side glass.
  ctx.lineWidth = u * 1.4;
  ctx.beginPath();
  ctx.moveTo(win.x, win.y + win.h * 0.42);
  ctx.lineTo(win.x + win.w, win.y + win.h * 0.42);
  ctx.stroke();
  ctx.lineWidth = u * 2.2;
  ctx.strokeRect(win.x, win.y, win.w, win.h);
}
