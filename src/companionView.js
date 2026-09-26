import { drawBubble } from './aisle.js';
import { isNight } from './clock.js';
import { BOARD, LEAVE, companionLine, companionLook, companionPersona } from './companion.js';
import { lit } from './interior.js';
import { drawBackProps, drawFrontProps, drawHeadExtras, drawShawl, personaPose } from './personaProps.js';
import { passengerHead, passengerOrigin } from './passenger.js';
import { nextStation } from './stations.js';
import { circle, clamp, hex, lerp, mix, rgba } from './utils.js';

const SEAT = hex('#6e1f2c');
const SEAT_BASE = hex('#4a121b');
const COVER = hex('#e9e2d2');
const TROUSERS = hex('#2b2f38');
const BAG = hex('#7a5230');

/** Screen position of the facing seat's hip point (mirror image of the passenger's seat). */
export function companionOrigin(layout) {
  const o = passengerOrigin(layout);
  return { x: layout.win.x + layout.win.w * 0.88, y: o.y };
}

/** Screen box of the companion (for clicks). */
export function companionBox(layout) {
  const { x, y } = companionOrigin(layout);
  const { u } = layout;
  return { x: x - u * 20, y: y - u * 50, w: u * 36, h: u * 58 };
}

// Drawing below is in person units (1 = layout.u), facing right, origin at the hip.

function drawSeat(ctx, L) {
  ctx.fillStyle = rgba(lit(SEAT, L));
  ctx.beginPath();
  ctx.roundRect(-15, -52, 9, 56, 3);
  ctx.roundRect(-16, -60, 11, 11, 3);
  ctx.roundRect(-15, 0, 32, 8, 2.5);
  ctx.fill();
  ctx.fillStyle = rgba(lit(SEAT_BASE, L));
  ctx.fillRect(-15, 6, 32, 60);
  ctx.fillStyle = rgba(lit(COVER, L));
  ctx.beginPath();
  ctx.roundRect(-15.5, -59, 10, 6, 2);
  ctx.fill();
}

function drawHair(ctx, look, c) {
  ctx.fillStyle = c(hex(look.hair));
  ctx.beginPath();
  ctx.arc(-0.3, -1, 6.6, Math.PI * 0.85, Math.PI * 1.92);
  ctx.closePath();
  if (look.style === 'bun') circle(ctx, -5.6, -4.2, 2.4);
  ctx.fill();
  if (look.style === 'long') {
    ctx.beginPath();
    ctx.moveTo(-6.4, -2);
    ctx.quadraticCurveTo(-7.5, 6, -4.5, 10);
    ctx.lineTo(-1.5, 8);
    ctx.quadraticCurveTo(-4, 3, -2.5, -2);
    ctx.fill();
  }
  if (look.style !== 'hat') return;
  ctx.fillStyle = c(mix(hex(look.coat), [0, 0, 0], 0.35));
  ctx.beginPath();
  ctx.ellipse(0, -5.2, 8.2, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-4.8, -11, 9.6, 6);
}

/** Head in profile facing right: eye, nose, mouth (moving while talking), optional glasses. */
function drawHead(ctx, look, c, { mouth, dozing, tilt = 0 }) {
  ctx.save();
  ctx.translate(1.4, -42 + (dozing ? 1 : 0));
  ctx.rotate(dozing ? Math.max(0.25, tilt) : tilt);
  const skin = c(hex(look.skin));
  ctx.fillStyle = skin;
  ctx.fillRect(-1.8, 3, 3.6, 5);
  ctx.beginPath();
  ctx.arc(0, 0, 6.2, 0, Math.PI * 2);
  ctx.moveTo(5.6, -1.2);
  ctx.quadraticCurveTo(7.6, 0.6, 5.9, 1.5);
  ctx.fill();
  drawHair(ctx, look, c);
  drawHeadExtras(ctx, c, look);
  ctx.fillStyle = c(hex('#2a1c14'));
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  if (dozing) {
    ctx.moveTo(3.2, -1.1);
    ctx.lineTo(4.6, -1.1);
    ctx.stroke();
  } else {
    ctx.ellipse(3.9, -1.3, 0.55, 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = c(hex('#6a2a22'));
  ctx.beginPath();
  ctx.ellipse(4.9, 3.1, 0.6, 0.15 + mouth * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  if (look.glasses) {
    ctx.strokeStyle = c(hex('#222222'));
    ctx.beginPath();
    ctx.arc(3.9, -1.3, 1.4, 0, Math.PI * 2);
    ctx.moveTo(2.5, -1.3);
    ctx.lineTo(-0.5, -1.8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTorso(ctx, look, c) {
  ctx.fillStyle = c(hex(look.coat));
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.bezierCurveTo(-8, -12, -8, -24, -4, -31);
  ctx.bezierCurveTo(-2, -35, 3, -35, 5, -32);
  ctx.bezierCurveTo(8, -26, 9, -14, 8, -6);
  ctx.bezierCurveTo(7, -2, 5, 0, 2, 1);
  ctx.closePath();
  ctx.fill();
}

function drawArm(ctx, look, c, elbow, hand) {
  ctx.strokeStyle = c(mix(hex(look.coat), [0, 0, 0], 0.18));
  ctx.lineWidth = 4.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-2, -29);
  ctx.lineTo(elbow[0], elbow[1]);
  ctx.lineTo(hand[0], hand[1]);
  ctx.stroke();
  ctx.fillStyle = c(hex(look.skin));
  ctx.beginPath();
  circle(ctx, hand[0] + 1.4, hand[1], 1.7);
  ctx.fill();
}

/** Seated, doing their personality's activity (knitting, studying, rocking the baby...). */
function drawSeated(ctx, look, c, talk, persona, extra) {
  const pose = personaPose(persona, extra);
  if (persona.activity === 'rock') ctx.rotate(Math.sin(extra.time * 2) * 0.03);
  drawBackProps(ctx, c, persona, look);
  ctx.strokeStyle = c(TROUSERS);
  ctx.lineCap = 'round';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(-2, -3);
  ctx.lineTo(17, -2);
  ctx.stroke();
  ctx.lineWidth = 7.5;
  ctx.beginPath();
  ctx.moveTo(17, -2);
  ctx.lineTo(19, 30);
  ctx.stroke();
  drawTorso(ctx, look, c);
  drawShawl(ctx, c, look);
  drawHead(ctx, look, c, { ...talk, tilt: pose.tilt, dozing: talk.dozing || pose.dozing });
  const props = () => drawFrontProps(ctx, c, persona, look, { hand: pose.hand, time: extra.time, action: extra.action });
  const held = persona.activity === 'rock'; // the baby is cradled in front of the arm
  if (!held) props();
  drawArm(ctx, look, c, pose.elbow, pose.hand);
  if (held) props();
  if (pose.dozing) drawZ(ctx, extra.time);
}

function drawZ(ctx, time) {
  ctx.fillStyle = 'rgba(240,240,255,0.85)';
  ctx.font = '600 3px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const t = (time * 0.5) % 1;
  ctx.globalAlpha = 1 - t;
  ctx.fillText('z', 2 + t * 5, -52 - t * 8);
  ctx.globalAlpha = 1;
}

/** Standing and walking with a small suitcase; `stride` swings the legs. */
function drawStanding(ctx, look, c, stride) {
  ctx.strokeStyle = c(TROUSERS);
  ctx.lineCap = 'round';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.lineTo(stride * 5, 30);
  ctx.moveTo(0, -2);
  ctx.lineTo(-stride * 5, 30);
  ctx.stroke();
  drawTorso(ctx, look, c);
  drawHead(ctx, look, c, { mouth: 0, dozing: false });
  ctx.fillStyle = c(BAG);
  ctx.beginPath();
  ctx.roundRect(7, -4, 7, 6, 1);
  ctx.fill();
  drawArm(ctx, look, c, [2, -15], [9, -5]);
}

/**
 * Where the companion is and how: seated (0..1 blend), screen x, facing and stride,
 * following the boarding/leaving timelines.
 */
function placement(c, time, layout) {
  const seat = companionOrigin(layout);
  const aisleX = layout.W + layout.u * 25;
  const t = time - c.since;
  if (c.status === 'boarding') {
    const walk = clamp((t - BOARD.walkFrom) / (BOARD.walkTo - BOARD.walkFrom));
    const sit = clamp((t - BOARD.walkTo) / (BOARD.sitTo - BOARD.walkTo));
    return { x: lerp(aisleX, seat.x, walk), seated: sit, faceLeft: true, stride: walk > 0 && walk < 1 ? Math.sin(time * 7) : 0 };
  }
  if (c.status === 'leaving') {
    const stand = clamp(t / LEAVE.standTo);
    const walk = clamp((t - LEAVE.standTo) / (LEAVE.walkTo - LEAVE.standTo));
    return { x: lerp(seat.x, aisleX, walk), seated: 1 - stand, faceLeft: walk === 0, stride: walk > 0 ? Math.sin(time * 7) : 0 };
  }
  return { x: seat.x, seated: 1, faceLeft: true, stride: 0 };
}

/** The companion's destination, for "Desço em ..." lines. */
function destinationName(state) {
  const hops = Array.from({ length: Math.max(0, (state.companion?.stopsLeft ?? 1) - 1) });
  const dest = hops.reduce((s) => (s ? nextStation(s.stopAt + 1, s.id) : null), nextStation(state.distance, state.served?.id));
  return dest?.name;
}

/** Facing seat, the companion (seated or walking) and their conversation bubbles. */
export function drawCompanion(ctx, layout, state, L) {
  const { u, W } = layout;
  const seat = companionOrigin(layout);
  const c = (color) => rgba(lit(color, L));
  ctx.save();
  ctx.translate(seat.x, seat.y);
  ctx.scale(-u, u);
  drawSeat(ctx, L);
  ctx.restore();
  const comp = state.companion;
  if (!comp) return;
  const look = companionLook(comp.seed);
  const persona = companionPersona(comp.seed);
  const place = placement(comp, state.time, layout);
  const line = companionLine(state, destinationName(state));
  const talk = { mouth: line?.who === 'c' ? Math.abs(Math.sin(state.time * 11)) : 0, dozing: isNight(state.dayTime) && comp.status === 'seated' };
  const extra = { time: state.time, action: line?.action ?? null, doze: studentDozing(comp, persona, state, line) };
  ctx.save();
  ctx.translate(place.x, seat.y);
  ctx.scale(place.faceLeft ? -u : u, u);
  if (place.seated > 0) {
    ctx.globalAlpha = place.seated;
    drawSeated(ctx, look, c, talk, persona, extra);
  }
  if (place.seated < 1) {
    ctx.globalAlpha = 1 - place.seated;
    ctx.translate(0, -4);
    drawStanding(ctx, look, c, place.stride);
  }
  ctx.restore();
  const speech = state.companionSpeech ? { who: 'c', text: state.companionSpeech.text } : line;
  if (!speech) return;
  if (speech.who === 'c') drawBubble(ctx, speech.text, { x: place.x - u * 3, y: seat.y - u * 51 }, u, W, 'staff');
  else if (speech.who === 'b') drawBubble(ctx, speech.text, { x: place.x - u * 10, y: seat.y - u * 25 }, u, W, 'staff');
  else drawBubble(ctx, speech.text, passengerHead(layout), u, W, 'passenger');
}

/** The student sometimes nods off over the books between chats. */
function studentDozing(comp, persona, state, line) {
  if (persona.id !== 'student' || comp.status !== 'seated' || line) return false;
  const t = (state.time - comp.seatedAt) % 75;
  return t > 40 && t < 60;
}
