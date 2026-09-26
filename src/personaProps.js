// Props and poses of each companion personality. Units are person units, facing right
// (toward the passenger), origin at the hip on the seat. `c(color)` applies cabin lighting.
import { circle, hex, mix } from './utils.js';

const REST = { elbow: [1, -13], hand: [10, -8] };

/** Arm pose, head tilt and dozing for the personality's current activity or line action. */
export function personaPose(persona, { time, action, doze }) {
  if (action === 'wide') return { elbow: [10, -26], hand: [20, -30], tilt: 0 };
  if (action === 'show') return { elbow: [8, -22], hand: [15, -30], tilt: -0.05 };
  switch (persona.activity) {
    case 'knit': return { elbow: [3, -14], hand: [10 + Math.sin(time * 6) * 0.8, -11], tilt: 0.12 };
    case 'study': return doze ? { ...REST, tilt: 0.45, dozing: true } : { elbow: [3, -14], hand: [11, -10], tilt: 0.22 };
    case 'rock': return { elbow: [6, -16], hand: [11, -19], tilt: 0.1 };
    case 'sketch': return { elbow: [4, -15], hand: [12 + Math.sin(time * 3) * 1.5, -11 + Math.cos(time * 4) * 0.6], tilt: 0.2 };
    case 'map': return { elbow: [3, -14], hand: [12, -10], tilt: 0.18 };
    default: return { ...REST, tilt: 0 };
  }
}

/** Things behind the body: the backpacker's rucksack, the fisherman's rod leaning on the seat. */
export function drawBackProps(ctx, c, persona, look) {
  if (persona.id === 'backpacker') {
    ctx.fillStyle = c(hex(look.backpack));
    ctx.beginPath();
    ctx.roundRect(-13, -36, 9, 26, 2.5);
    ctx.fill();
    ctx.fillStyle = c(mix(hex(look.backpack), [0, 0, 0], 0.3));
    ctx.fillRect(-12.5, -26, 8, 1.4);
    ctx.fillStyle = c(hex('#c9a24a'));
    ctx.fillRect(-13.5, -38, 10, 3);
  }
  if (persona.id === 'fisherman') {
    ctx.strokeStyle = c(hex('#6b4a2a'));
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-9, 8);
    ctx.lineTo(-3, -66);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(230,230,230,0.6)';
    ctx.lineWidth = 0.2;
    ctx.beginPath();
    ctx.moveTo(-3, -66);
    ctx.quadraticCurveTo(2, -50, -1, -34);
    ctx.stroke();
    ctx.fillStyle = c(hex('#3a3a44'));
    ctx.beginPath();
    circle(ctx, -7.4, -12, 1.4);
    ctx.fill();
  }
}

/** Shawl over the grandma's shoulders. */
export function drawShawl(ctx, c, look) {
  if (!look.shawl) return;
  ctx.fillStyle = c(hex(look.shawl));
  ctx.beginPath();
  ctx.moveTo(-6, -31);
  ctx.quadraticCurveTo(1, -36, 6, -31);
  ctx.lineTo(4, -20);
  ctx.lineTo(-7, -22);
  ctx.closePath();
  ctx.fill();
}

function drawBook(ctx, c, hand) {
  ctx.fillStyle = c(hex('#8a3a3a'));
  ctx.fillRect(hand[0] - 5, hand[1] + 0.6, 10, 1.2);
  ctx.fillStyle = c(hex('#f3ecd8'));
  ctx.beginPath();
  ctx.moveTo(hand[0] - 4.6, hand[1] + 0.6);
  ctx.quadraticCurveTo(hand[0] - 2, hand[1] - 1.6, hand[0], hand[1] + 0.4);
  ctx.quadraticCurveTo(hand[0] + 2, hand[1] - 1.6, hand[0] + 4.6, hand[1] + 0.6);
  ctx.fill();
  ctx.fillStyle = c(hex('#4a6fa5'));
  ctx.fillRect(hand[0] - 4, hand[1] + 1.8, 9, 1.6);
}

function drawBaby(ctx, c, look, time) {
  ctx.save();
  ctx.translate(9, -20);
  ctx.rotate(-0.45 + Math.sin(time * 2) * 0.05);
  ctx.fillStyle = c(hex(look.blanket));
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 3.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c(hex('#f1c9a5'));
  ctx.beginPath();
  circle(ctx, 4.8, -0.8, 2.5);
  ctx.fill();
  ctx.fillStyle = c(hex('#6b4a2a'));
  ctx.beginPath();
  ctx.arc(4.8, -0.8, 2.55, Math.PI * 1.1, Math.PI * 1.9);
  ctx.fill();
  ctx.restore();
}

function drawSketchbook(ctx, c, hand, showing) {
  const [x, y] = showing ? [hand[0] + 1, hand[1] - 3] : [hand[0] - 3, hand[1] + 1];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(showing ? 0 : -0.25);
  ctx.fillStyle = c(hex('#f7f1e1'));
  ctx.fillRect(-4, -3, 8, 6);
  if (showing) {
    ctx.fillStyle = c(hex('#8ec3e6'));
    ctx.fillRect(-3.4, -2.4, 6.8, 2.6);
    ctx.fillStyle = c(hex('#7fae4a'));
    ctx.fillRect(-3.4, 0.2, 6.8, 2.2);
    ctx.fillStyle = c(hex('#ffd166'));
    ctx.beginPath();
    circle(ctx, 1.8, -1.4, 0.6);
    ctx.fill();
  } else {
    ctx.strokeStyle = c(hex('#6a6a6a'));
    ctx.lineWidth = 0.15;
    ctx.beginPath();
    ctx.moveTo(-3, 1);
    ctx.quadraticCurveTo(-1, -1.5, 3, 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMap(ctx, c) {
  ctx.fillStyle = c(hex('#efe3c2'));
  ctx.beginPath();
  ctx.moveTo(4, -9);
  ctx.lineTo(19, -10);
  ctx.lineTo(19, -5);
  ctx.lineTo(4, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = c(hex('#b3261e'));
  ctx.lineWidth = 0.3;
  ctx.setLineDash([0.8, 0.6]);
  ctx.beginPath();
  ctx.moveTo(6, -6);
  ctx.quadraticCurveTo(11, -9, 17, -7);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawKnitting(ctx, c, hand, time) {
  ctx.fillStyle = c(hex('#e07a9a'));
  ctx.beginPath();
  circle(ctx, 15, -4, 2.4);
  ctx.fill();
  ctx.fillRect(hand[0] - 3, hand[1] + 0.2, 6, 2.4);
  ctx.strokeStyle = c(hex('#c9c9c9'));
  ctx.lineWidth = 0.3;
  const a = Math.sin(time * 6) * 0.3;
  ctx.beginPath();
  ctx.moveTo(hand[0] - 4, hand[1] + 2 + a);
  ctx.lineTo(hand[0] + 4, hand[1] - 3);
  ctx.moveTo(hand[0] - 3, hand[1] - 3);
  ctx.lineTo(hand[0] + 5, hand[1] + 2 - a);
  ctx.stroke();
}

/** Things on the lap or in the hands, drawn in front of the torso (before the arm). */
export function drawFrontProps(ctx, c, persona, look, { hand, time, action }) {
  if (persona.id === 'grandma') drawKnitting(ctx, c, hand, time);
  if (persona.id === 'student') drawBook(ctx, c, [11, -10]);
  if (persona.id === 'mother') drawBaby(ctx, c, look, time);
  if (persona.id === 'artist') drawSketchbook(ctx, c, hand, action === 'show');
  if (persona.id === 'backpacker') drawMap(ctx, c);
  if (persona.id === 'fisherman') {
    ctx.fillStyle = c(hex('#2f6f98'));
    ctx.fillRect(21, 16, 9, 7);
    ctx.fillStyle = c(hex('#f4f1ea'));
    ctx.fillRect(21, 15, 9, 2);
  }
}

/** Extra hair/face styles for personalities: beret, cap and a beard. */
export function drawHeadExtras(ctx, c, look) {
  if (look.style === 'beret') {
    ctx.fillStyle = c(hex(look.beret));
    ctx.beginPath();
    ctx.ellipse(-0.5, -5.6, 6.2, 2.2, -0.15, 0, Math.PI * 2);
    ctx.fill();
  }
  if (look.style === 'cap') {
    ctx.fillStyle = c(hex('#2f5d8a'));
    ctx.beginPath();
    ctx.arc(0, -1.5, 6.4, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(3, -2.2, 5, 1.1);
  }
  if (look.beard) {
    ctx.fillStyle = c(hex(look.beard));
    ctx.beginPath();
    ctx.moveTo(-1, 2);
    ctx.quadraticCurveTo(3, 7.5, 6.2, 2.6);
    ctx.lineTo(5.5, 1.5);
    ctx.quadraticCurveTo(3, 4, 0, 1.2);
    ctx.fill();
  }
}
