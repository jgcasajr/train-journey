import { clamp, lerp } from './utils.js';

const LOOK_RATE = 2.5; // head easing toward the pointer (1/s)
const TAP_SLOP = 6; // px of movement below which a press counts as a tap
const TILT_RANGE = 25; // degrees of phone tilt for a full head turn

/**
 * Pointer input: hovering the mouse moves the viewer's head (look), dragging draws
 * strokes (used to wipe the fogged glass), a short tap calls onTap(point), and
 * onHover(point) reports the mouse position (for the hand cursor over clickable things).
 * On touch screens, dragging a finger or tilting the phone moves the head instead of hovering.
 */
export function createPointer(canvas, { onTap, onHover = () => {} }) {
  let target = { x: 0, y: 0 };
  let look = { x: 0, y: 0 };
  let press = null; // { last, moved } while a button/finger is down
  let strokes = [];

  const axis = (pos, size) => (size > 0 && Number.isFinite(pos) ? clamp((pos / size) * 2 - 1, -1, 1) : 0);
  const toLook = (e) => ({ x: axis(e.clientX, window.innerWidth), y: axis(e.clientY, window.innerHeight) });

  let tiltBase = null; // phone orientation when tilt started, so "straight ahead" is how it is held
  let tilt = null;

  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') enableTilt();
    const p = { x: e.clientX, y: e.clientY };
    press = { last: p, moved: 0 };
    strokes = [...strokes, [p, p]];
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') {
      target = toLook(e);
      onHover({ x: e.clientX, y: e.clientY });
    }
    if (!press) return;
    if (e.pointerType !== 'mouse') target = toLook(e);
    const p = { x: e.clientX, y: e.clientY };
    strokes = [...strokes, [press.last, p]];
    press = { last: p, moved: press.moved + Math.hypot(p.x - press.last.x, p.y - press.last.y) };
  });

  const release = (e) => {
    if (press && press.moved < TAP_SLOP) onTap(press.last);
    if (e.pointerType !== 'mouse') target = tilt ?? { x: 0, y: 0 };
    press = null;
  };

  function onOrientation(e) {
    if (!Number.isFinite(e.gamma) || !Number.isFinite(e.beta)) return;
    tiltBase = tiltBase ?? { gamma: e.gamma, beta: e.beta };
    tilt = { x: clamp((e.gamma - tiltBase.gamma) / TILT_RANGE, -1, 1), y: clamp((e.beta - tiltBase.beta) / TILT_RANGE, -1, 1) };
    if (!press) target = tilt;
  }

  let tiltAsked = false;
  function enableTilt() {
    if (tiltAsked || typeof DeviceOrientationEvent === 'undefined') return;
    tiltAsked = true;
    const ask = DeviceOrientationEvent.requestPermission; // iOS asks on a user gesture
    const granted = ask ? ask.call(DeviceOrientationEvent) : Promise.resolve('granted');
    granted
      .then((state) => { if (state === 'granted') window.addEventListener('deviceorientation', onOrientation); })
      .catch((err) => console.warn('Tilt to look unavailable:', err));
  }
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
