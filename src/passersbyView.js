import { drawBubble } from './aisle.js';
import { lit } from './interior.js';
import { passengerHead, passengerOrigin } from './passenger.js';
import { cueAge, passerbyAt, passerbyLine } from './passersby.js';
import { circle, hex, lerp, mix, rgba } from './utils.js';

const SHOULDER_FRONT = [-4.5, -18];
const SHOULDER_BACK = [3.5, -18];
const PARTNER = { coat: '#c9567a', pants: '#2b2f38', skin: '#e0b18f', hair: '#6b3a1e', style: 'long' };

/** Screen x and facing of the passer-by. Walkers face where they go; stopped ones face her. */
function placement(ev, layout) {
  const { W, u } = layout;
  const margin = u * 70;
  const from = ev.dir < 0 ? W + margin : -margin;
  const to = ev.dir < 0 ? -margin : W + margin;
  if (ev.phase === 'cross') return { x: lerp(from, to, ev.p), facing: ev.dir, walking: true };
  const stopX = passengerOrigin(layout).x + u * 50;
  if (ev.phase === 'in') return { x: lerp(from, stopX, 1 - (1 - ev.p) ** 2), facing: ev.dir, walking: true };
  if (ev.phase === 'out') return { x: lerp(stopX, to, ev.p ** 2), facing: ev.dir, walking: true };
  return { x: stopX, facing: -1, walking: false };
}

function drawHair(ctx, c, look) {
  ctx.fillStyle = c(hex(look.hair));
  ctx.beginPath();
  ctx.arc(0.6, -28.2, 4.4, Math.PI * 1.2, Math.PI * 2.3);
  ctx.closePath();
  if (look.style === 'bun') circle(ctx, 3.8, -31, 1.7);
  ctx.fill();
  if (look.style === 'long') {
    ctx.beginPath();
    ctx.moveTo(4.4, -28);
    ctx.quadraticCurveTo(6, -21, 3.5, -18);
    ctx.lineTo(1.5, -21);
    ctx.fill();
  }
  const dark = c(mix(hex(look.coat), [0, 0, 0], 0.35));
  if (look.style === 'cap') {
    ctx.fillStyle = dark;
    ctx.fillRect(-4.6, -32.2, 9.2, 2.6);
    ctx.fillRect(-7.6, -30.2, 4, 0.9);
  }
  if (look.style === 'tophat') {
    ctx.fillStyle = c(hex('#111111'));
    ctx.fillRect(-3.6, -41, 7.2, 9);
    ctx.fillRect(-5.8, -32.4, 11.6, 1.1);
    ctx.fillStyle = c(hex('#a8322d'));
    ctx.fillRect(-3.6, -34, 7.2, 1.2);
  }
}

/** A person in the foreground aisle, facing left (-x), origin at the waist, in body units. */
function drawFigure(ctx, c, look, { front, back, stride, mouth }) {
  const skin = c(hex(look.skin));
  const coat = c(hex(look.coat));
  ctx.fillStyle = c(hex(look.pants));
  ctx.fillRect(-4.2 + stride, 0, 3.8, 40);
  ctx.fillRect(0.6 - stride, 0, 3.8, 40);
  ctx.strokeStyle = c(mix(hex(look.coat), [0, 0, 0], 0.2));
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(...SHOULDER_BACK);
  ctx.lineTo(...back);
  ctx.stroke();
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.roundRect(-6, -21, 12, 23, 3);
  ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath();
  circle(ctx, 0, -27, 4.2);
  circle(ctx, -4, -27, 0.8);
  circle(ctx, ...back, 1.2);
  ctx.fill();
  drawHair(ctx, c, look);
  ctx.fillStyle = c(hex('#2a1c14'));
  ctx.beginPath();
  circle(ctx, -2.3, -27.8, 0.45);
  ctx.fill();
  ctx.fillStyle = c(hex('#6a2a22'));
  ctx.beginPath();
  ctx.ellipse(-2.9, -24.7, 0.6, 0.12 + mouth * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = coat;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(...SHOULDER_FRONT);
  ctx.lineTo(...front);
  ctx.stroke();
  ctx.fillStyle = skin;
  ctx.beginPath();
  circle(ctx, ...front, 1.25);
  ctx.fill();
}

/** Arm targets per prop (front hand, back hand), given the scene state. */
function arms(prop, { walking, time, playing }) {
  const swing = walking ? Math.sin(time * 7) * 2 : 0;
  const relaxed = { front: [-5 + swing, -4], back: [4 - swing, -4] };
  switch (prop) {
    case 'balloon': return { front: [-7, -20], back: relaxed.back };
    case 'violin': return playing ? { front: [-6 + Math.sin(time * 5) * 3.5, -17], back: [-9, -23] } : relaxed;
    case 'basket': return { front: [-8, -7], back: relaxed.back };
    case 'phone': return { front: relaxed.front, back: [1.6, -26.5] }; // phone held at the ear
    case 'camera': return { front: [-8, -26], back: [-6, -25] };
    case 'tray': return { front: [-8, -11], back: [-2, -11] };
    case 'wand': return { front: [-11, -17], back: relaxed.back };
    case 'partner': return { front: relaxed.front, back: [7, -5] };
    default: return relaxed;
  }
}

function drawProp(ctx, c, prop, { front, back }, info) {
  const { time, magicAge } = info;
  if (prop === 'balloon') {
    const bx = -9 + Math.sin(time * 1.5) * 1.2;
    const by = -52 + Math.sin(time * 2) * 0.8;
    ctx.strokeStyle = c(hex('#dddddd'));
    ctx.lineWidth = 0.25;
    ctx.beginPath();
    ctx.moveTo(...front);
    ctx.quadraticCurveTo(front[0] - 2, (front[1] + by) / 2, bx, by + 4);
    ctx.stroke();
    ctx.fillStyle = rgba(hex('#e63946'));
    ctx.beginPath();
    ctx.ellipse(bx, by, 3.4, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(bx - 1.1, by - 1.4, 0.8, 1.2, -0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (prop === 'violin') {
    ctx.fillStyle = c(hex('#8a4a1e'));
    ctx.save();
    ctx.translate(-5, -22);
    ctx.rotate(-0.45);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-7, -0.35, 5, 0.7);
    ctx.restore();
    ctx.strokeStyle = c(hex('#d9c9a0'));
    ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.moveTo(front[0] - 4, front[1] - 5);
    ctx.lineTo(front[0] + 4, front[1] + 1);
    ctx.stroke();
  } else if (prop === 'basket') {
    ctx.fillStyle = c(hex('#9a6a3a'));
    ctx.beginPath();
    ctx.ellipse(front[0] - 1, front[1] + 1.5, 4, 2.6, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = c(hex('#c0392b'));
    ctx.beginPath();
    [-2.4, -0.2, 2].forEach((dx) => circle(ctx, front[0] - 1 + dx, front[1] + 0.6, 1.1));
    ctx.fill();
  } else if (prop === 'phone') {
    ctx.fillStyle = c(hex('#1a1a1f'));
    ctx.fillRect(back[0] - 0.4, back[1] - 2.2, 1, 2.4);
  } else if (prop === 'camera') {
    ctx.fillStyle = c(hex('#1a1a1f'));
    ctx.fillRect(front[0] - 3, front[1] - 2, 4.6, 3);
    ctx.fillStyle = c(hex('#4a5a6e'));
    ctx.beginPath();
    circle(ctx, front[0] - 3.2, front[1] - 0.5, 1);
    ctx.fill();
  } else if (prop === 'tray') {
    ctx.fillStyle = c(hex('#8a5a34'));
    ctx.fillRect(-10, -12.5, 9, 3);
    ['#e63946', '#ffd166', '#6be38a', '#5ab0ff', '#f4a261'].forEach((col, k) => {
      ctx.fillStyle = c(hex(col));
      ctx.beginPath();
      circle(ctx, -9 + k * 1.8, -13, 0.7);
      ctx.fill();
    });
  } else if (prop === 'wand') {
    ctx.strokeStyle = c(hex('#111111'));
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(...front);
    ctx.lineTo(front[0] - 5, front[1] - 4);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(front[0] - 5.6, front[1] - 4.6, 1.1, 1.1);
    if (magicAge < 1.4) {
      const k = magicAge / 1.4;
      ctx.fillStyle = `rgba(255,236,150,${1 - k})`;
      for (let s = 0; s < 8; s++) {
        const a = (s / 8) * Math.PI * 2;
        ctx.beginPath();
        circle(ctx, front[0] - 5 + Math.cos(a) * (1 + k * 6), front[1] - 4 + Math.sin(a) * (1 + k * 6), 0.5);
        ctx.fill();
      }
    }
  } else if (prop === 'headphones') {
    ctx.strokeStyle = c(hex('#1a1a1f'));
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(0, -27, 4.9, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.fillStyle = c(hex('#e63946'));
    ctx.fillRect(-5.4, -28.5, 1.4, 2.6);
  } else if (prop === 'backpack') {
    ctx.fillStyle = c(hex('#3a6b4a'));
    ctx.beginPath();
    ctx.roundRect(5.5, -19, 4, 12, 1.2);
    ctx.fill();
  }
}

/** The runaway dog, trotting ahead of its owner near the floor (screen coordinates). */
function drawDog(ctx, c, x, y, v, moveDir, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-moveDir * v, v);
  const run = Math.sin(time * 14);
  ctx.fillStyle = c(hex('#b07a3a'));
  [-3, -1.8, 1.8, 3].forEach((lx, k) => ctx.fillRect(lx + (k % 2 ? run : -run) * 0.6, 0, 0.8, 3.2));
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.2, 2, 0, 0, Math.PI * 2);
  ctx.ellipse(-4.6, -1.8, 1.8, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c(hex('#6b4a2a'));
  ctx.beginPath();
  ctx.ellipse(-4.2, -3.1, 0.6, 1.2, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = c(hex('#b07a3a'));
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(4, -0.6);
  ctx.lineTo(6, -2.6 + Math.sin(time * 20) * 0.8);
  ctx.stroke();
  ctx.restore();
}

/** Floating hearts (couple) or music notes (violin, headphones) above the figure. */
function drawFloaters(ctx, x, top, u, time, glyph, color) {
  ctx.font = `600 ${u * 1.8}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  [0, 1].forEach((k) => {
    const t = (time * 0.6 + k * 0.5) % 1;
    ctx.fillStyle = `rgba(${color},${0.9 * (1 - t)})`;
    ctx.fillText(glyph, x + Math.sin(time * 2 + k * 2) * u * 2, top - t * u * 8);
  });
}

/** Passer-by walking along the aisle in the foreground, with props, dialogue and effects. */
export function drawPasserby(ctx, layout, state, L) {
  const ev = passerbyAt(state.time, state.dayTime);
  if (!ev) return;
  const { H, W, u } = layout;
  const { ch } = ev;
  const scale = ch.scale ?? 1;
  const v = u * 1.8 * scale;
  const place = placement(ev, layout);
  const stride = place.walking ? Math.sin(state.time * (scale < 1 ? 11 : 7)) * 2.5 : 0;
  const waist = H * 0.8 + (1 - scale) * u * 30 + (place.walking ? Math.abs(stride) * v * 0.15 : 0);
  const c = (color) => rgba(lit(color, L));
  const line = passerbyLine(ev);
  const click = state.passerbySpeech?.k === ev.k ? state.passerbySpeech.text : null;
  const talking = (click || line?.who === 'x') ? Math.abs(Math.sin(state.time * 11)) : 0;
  const playing = ch.id === 'violinist' && ev.phase === 'stop' && ev.tStop > 1 && ev.tStop < 9;
  const [prop] = ch.props;
  const pose = arms(prop, { walking: place.walking, time: state.time, playing });
  if (ch.props.includes('dog')) drawDog(ctx, c, place.x + place.facing * u * 22, H * 0.93, u * 1.4, place.facing, state.time);
  ctx.save();
  ctx.translate(place.x, waist);
  ctx.scale(place.facing < 0 ? v : -v, v);
  if (ch.props.includes('partner')) {
    ctx.save();
    ctx.translate(11, 0);
    drawFigure(ctx, c, PARTNER, { front: [-6, -5], back: [4, -4], stride: -stride, mouth: 0 });
    ctx.restore();
  }
  if (ch.props.includes('backpack')) drawProp(ctx, c, 'backpack', pose, {});
  drawFigure(ctx, c, ch.look, { ...pose, stride, mouth: talking });
  ch.props.filter((p) => !['backpack', 'dog', 'partner'].includes(p))
    .forEach((p) => drawProp(ctx, c, p, pose, { time: state.time, magicAge: cueAge(ev, 'magic') }));
  ctx.restore();
  const headTop = waist - v * 34;
  if (ch.props.includes('partner')) drawFloaters(ctx, place.x - place.facing * v * 5, headTop, u, state.time, '♥', '230,80,110');
  if (playing || ch.props.includes('headphones')) drawFloaters(ctx, place.x, headTop, u, state.time, '♪', '255,236,190');
  const said = click ?? (line?.who === 'x' ? line.text : null);
  if (said) drawBubble(ctx, said, { x: place.x - place.facing * v * 2, y: headTop - u * 2 }, u, W, 'staff');
  else if (line?.who === 'p') drawBubble(ctx, line.text, passengerHead(layout), u, W, 'passenger');
  const flash = cueAge(ev, 'flash');
  if (flash < 0.4) {
    ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - flash / 0.4)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/** Screen box of the current passer-by (for clicks), or null. */
export function passerbyBox(layout, state) {
  const ev = passerbyAt(state.time, state.dayTime);
  if (!ev) return null;
  const { H, u } = layout;
  const scale = ev.ch.scale ?? 1;
  const v = u * 1.8 * scale;
  const { x } = placement(ev, layout);
  const top = H * 0.8 + (1 - scale) * u * 30 - v * 33;
  return { x: x - v * 8, y: top, w: v * 16, h: H - top };
}

