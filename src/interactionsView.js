import { drawBubble } from './aisle.js';
import { aisleEventAt, beatAt } from './cabin.js';
import { layerFrame } from './frame.js';
import { passengerHead } from './passenger.js';

const FLOAT_SECONDS = 1.8;

/** Sounds made by things outside ("Muuu!") rising from where they were clicked. */
export function drawFloats(ctx, layout, state) {
  const { win, u } = layout;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${u * 2.6}px system-ui, sans-serif`;
  state.effects.filter((e) => e.kind === 'float').forEach((e) => {
    const age = state.time - e.born;
    if (age > FLOAT_SECONDS) return;
    const lf = layerFrame(layout, state, e.depth);
    const x = win.x + e.wx - lf.offset;
    const y = e.y - age * u * 3;
    const alpha = 1 - age / FLOAT_SECONDS;
    ctx.lineWidth = u * 0.5;
    ctx.strokeStyle = `rgba(40,30,20,${alpha * 0.6})`;
    ctx.strokeText(e.text, x, y);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillText(e.text, x, y);
  });
}

/** A thought bubble (cloud with trailing dots) above her head: things she thinks on her own. */
export function drawThought(ctx, layout, text) {
  const { u, W } = layout;
  const head = passengerHead(layout);
  ctx.font = `italic 500 ${u * 2}px Georgia, serif`;
  const w = ctx.measureText(text).width + u * 3;
  const h = u * 4;
  const x = Math.min(Math.max(u, head.x - w / 2 + u * 6), W - w - u);
  const y = head.y - h - u * 3;
  ctx.fillStyle = 'rgba(255,255,255,0.93)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  [[1.2, 1], [0.7, 2.6]].forEach(([r, k]) => {
    ctx.beginPath();
    ctx.arc(head.x + u * (1 + k), y + h + u * k * 0.9, u * r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#4a3a2a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2);
}

/** What she says when clicked (hidden while an aisle visitor's scene is playing). */
export function drawSpeech(ctx, layout, state) {
  if (!state.speech) return;
  if (beatAt(aisleEventAt(state.time, state.dayTime))) return;
  drawBubble(ctx, state.speech.text, passengerHead(layout), layout.u, layout.W, 'passenger');
}
