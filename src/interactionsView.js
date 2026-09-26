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

/** What she says when clicked (hidden while an aisle visitor's scene is playing). */
export function drawSpeech(ctx, layout, state) {
  if (!state.speech) return;
  if (beatAt(aisleEventAt(state.time, state.dayTime))) return;
  drawBubble(ctx, state.speech.text, passengerHead(layout), layout.u, layout.W, 'passenger');
}
