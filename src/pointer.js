import { clamp, lerp } from './utils.js';

const LOOK_RATE = 2.5; // head easing toward the pointer (1/s)
const TAP_SLOP = 6; // px of movement below which a press counts as a tap

/**
 * Pointer input: hovering the mouse moves the viewer's head (look), dragging draws
 * strokes (used to wipe the fogged glass), and a short tap calls onTap.
 */
export function createPointer(canvas, { onTap }) {
  let target = { x: 0, y: 0 };
  let look = { x: 0, y: 0 };
  let press = null; // { last, moved } while a button/finger is down
  let strokes = [];

  const axis = (pos, size) => (size > 0 && Number.isFinite(pos) ? clamp((pos / size) * 2 - 1, -1, 1) : 0);
  const toLook = (e) => ({ x: axis(e.clientX, window.innerWidth), y: axis(e.clientY, window.innerHeight) });

  canvas.addEventListener('pointerdown', (e) => {
    const p = { x: e.clientX, y: e.clientY };
    press = { last: p, moved: 0 };
    strokes = [...strokes, [p, p]];
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') target = toLook(e);
    if (!press) return;
    const p = { x: e.clientX, y: e.clientY };
    strokes = [...strokes, [press.last, p]];
    press = { last: p, moved: press.moved + Math.hypot(p.x - press.last.x, p.y - press.last.y) };
  });

  const release = () => {
    if (press && press.moved < TAP_SLOP) onTap();
    press = null;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', () => { press = null; });
  canvas.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') target = { x: 0, y: 0 };
  });

  return {
    /** Smoothed head offset (-1..1 on each axis). */
    updateLook(dt) {
      const k = 1 - Math.exp(-LOOK_RATE * dt);
      look = { x: lerp(look.x, target.x, k), y: lerp(look.y, target.y, k) };
      return look;
    },
    takeStrokes() {
      const taken = strokes;
      strokes = [];
      return taken;
    },
  };
}
