import { lit } from './interior.js';
import { circle, hash, hex, mix, rgba } from './utils.js';

const PLANK = hex('#5a4030');
const PLANK_DARK = hex('#3e2b20');
const DOOR = hex('#6d5a48');
const CRATE = hex('#9a7348');
const CRATE_EDGE = hex('#6b4c2c');
const CASES = ['#7a2331', '#2f4f6f', '#3f6b4a', '#b07a36'].map(hex);
const CAT = hex('#e08a3c');
const CAT_DARK = hex('#a85f22');
const LAMP = hex('#ffd28c');
const PET_SECONDS = 3.5;
const NAP_CYCLE = 45; // seconds: mostly asleep, sitting up for a while each cycle

/** Where the cat sleeps (on the big trunk), for clicks. */
export function catBox(layout) {
  const { W, H, u } = layout;
  return { x: W * 0.18, y: H * 0.62 - u * 9, w: u * 18, h: u * 10 };
}

function drawPlanks(ctx, layout, L) {
  const { W, H, u } = layout;
  ctx.fillStyle = rgba(lit(PLANK, L));
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = rgba(lit(PLANK_DARK, L));
  for (let y = u * 5; y < H; y += u * 5) ctx.fillRect(0, y, W, u * 0.35);
  ctx.fillRect(0, H * 0.8, W, H * 0.2);
}

/** The sliding door frame around the opening, with the door leaf pushed aside. */
function drawDoor(ctx, layout, L) {
  const { win, u } = layout;
  ctx.fillStyle = rgba(lit(DOOR, L));
  ctx.fillRect(win.x + win.w, win.y - u, win.w * 0.9, win.h + u * 2);
  ctx.strokeStyle = rgba(lit(PLANK_DARK, L));
  ctx.lineWidth = u * 1.2;
  ctx.strokeRect(win.x, win.y, win.w, win.h);
  ctx.fillStyle = rgba(lit(hex('#2a2a2a'), L));
  ctx.fillRect(win.x - u, win.y - u * 2, win.w * 1.95, u);
}

function drawCargo(ctx, layout, L) {
  const { W, H, u } = layout;
  const floor = H * 0.8;
  [[0.02, 16, 14], [0.02, 12, 11, 14], [0.36, 12, 10]].forEach(([fx, w, h, lift = 0]) => {
    const x = W * fx + (lift ? u * 2 : 0);
    const y = floor - h * u - lift * u;
    ctx.fillStyle = rgba(lit(CRATE, L));
    ctx.fillRect(x, y, w * u, h * u);
    ctx.strokeStyle = rgba(lit(CRATE_EDGE, L));
    ctx.lineWidth = u * 0.5;
    ctx.strokeRect(x, y, w * u, h * u);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w * u, y + h * u);
    ctx.stroke();
  });
  // The big trunk the cat sleeps on, and suitcases around it.
  const trunk = catBox(layout);
  ctx.fillStyle = rgba(lit(hex('#4a3526'), L));
  ctx.fillRect(trunk.x - u, trunk.y + trunk.h - u, trunk.w + u * 2, floor - trunk.y - trunk.h + u);
  CASES.forEach((c, i) => {
    ctx.fillStyle = rgba(lit(c, L));
    ctx.beginPath();
    ctx.roundRect(W * (0.62 + i * 0.08), floor - u * (7 + hash(i, 3301) * 5), u * 7, u * (7 + hash(i, 3301) * 5), u);
    ctx.fill();
  });
}

/** Orange tabby: curled up asleep, sitting up now and then, purring with hearts when petted. */
function drawCat(ctx, layout, L, time, petAt) {
  const b = catBox(layout);
  const { u } = layout;
  const petted = time - petAt < PET_SECONDS;
  const awake = petted || (time % NAP_CYCLE) > NAP_CYCLE - 8;
  const x = b.x + b.w * 0.5;
  const base = b.y + b.h - u;
  const fur = rgba(lit(CAT, L));
  ctx.fillStyle = fur;
  ctx.beginPath();
  if (awake) ctx.ellipse(x, base - u * 3.5, u * 3.2, u * 4, 0, 0, Math.PI * 2);
  else ctx.ellipse(x, base - u * 2, u * 6, u * 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  const head = awake ? { x: x + u * 0.5, y: base - u * 8.5 } : { x: x + u * 4.6, y: base - u * 2.6 };
  ctx.beginPath();
  circle(ctx, head.x, head.y, u * 2.3);
  ctx.fill();
  [-1, 1].forEach((s) => {
    ctx.beginPath();
    ctx.moveTo(head.x + s * u * 0.8, head.y - u * 1.6);
    ctx.lineTo(head.x + s * u * 2, head.y - u * 3.4);
    ctx.lineTo(head.x + s * u * 2.2, head.y - u * 1);
    ctx.fill();
  });
  ctx.strokeStyle = rgba(lit(CAT_DARK, L));
  ctx.lineWidth = u * 0.9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const sway = Math.sin(time * (awake ? 3 : 0.8)) * u * 2;
  ctx.moveTo(x - u * (awake ? 2.5 : 5.5), base - u);
  ctx.quadraticCurveTo(x - u * 8, base - u * 2 + sway, x - u * 7, base - u * (awake ? 7 : 4) + sway);
  ctx.stroke();
  drawCatFace(ctx, head, u, awake && !petted, L);
  if (petted) drawHearts(ctx, head, u, time - petAt);
}

function drawCatFace(ctx, head, u, eyesOpen, L) {
  ctx.fillStyle = rgba(lit(hex('#2a2016'), L));
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = u * 0.35;
  [-0.8, 0.8].forEach((dx) => {
    ctx.beginPath();
    if (eyesOpen) circle(ctx, head.x + dx * u, head.y - u * 0.2, u * 0.4);
    else {
      ctx.moveTo(head.x + dx * u - u * 0.5, head.y - u * 0.1);
      ctx.quadraticCurveTo(head.x + dx * u, head.y + u * 0.4, head.x + dx * u + u * 0.5, head.y - u * 0.1);
    }
    if (eyesOpen) ctx.fill();
    else ctx.stroke();
  });
}

function drawHearts(ctx, head, u, age) {
  ctx.fillStyle = `rgba(230,70,90,${Math.max(0, 1 - age / PET_SECONDS)})`;
  ctx.font = `${u * 2.4}px serif`;
  ctx.textAlign = 'center';
  [0, 1, 2].forEach((k) => ctx.fillText('♥', head.x + (k - 1) * u * 2.5 + Math.sin(age * 3 + k) * u, head.y - u * 4 - age * u * 2.5 - k * u));
}

function drawHangingLamp(ctx, layout, L, time) {
  const { W, u } = layout;
  const swing = Math.sin(time * 1.3) * 0.12;
  const x = W * 0.3 + Math.sin(swing) * u * 10;
  const y = u * 10;
  ctx.strokeStyle = rgba(lit(hex('#222222'), L));
  ctx.lineWidth = u * 0.3;
  ctx.beginPath();
  ctx.moveTo(W * 0.3, 0);
  ctx.lineTo(x, y);
  ctx.stroke();
  const g = ctx.createRadialGradient(x, y + u, 0, x, y + u, u * 30);
  g.addColorStop(0, rgba(LAMP, 0.35));
  g.addColorStop(1, rgba(LAMP, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - u * 30, y - u * 29, u * 60, u * 60);
  ctx.fillStyle = rgba(mix(LAMP, hex('#ffffff'), 0.3));
  ctx.beginPath();
  circle(ctx, x, y + u, u * 1.2);
  ctx.fill();
}

/** Baggage car walls and door, drawn before the outside view (which only shows through the door). */
export function drawBaggageRoom(ctx, layout, L) {
  drawPlanks(ctx, layout, L);
}

/**
 * Everything in front of the door opening: frame, cargo, the cat and the swinging lamp.
 * `view` is the car layout whose `win` is the half-open door (see carLayout).
 */
export function drawBaggageFront(ctx, layout, view, L, state) {
  drawDoor(ctx, view, L);
  drawCargo(ctx, layout, L);
  drawCat(ctx, layout, L, state.time, state.catPetAt ?? -99);
  drawHangingLamp(ctx, layout, L, state.time);
}
