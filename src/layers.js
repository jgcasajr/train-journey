import { biomeAt } from './biomes.js';
import { riverAt } from './rivers.js';
import { crossingAt } from './roads.js';
import { hash } from './utils.js';

export const STEP = 4;
export { LOOK_FAR, layerFrame, trackX } from './frame.js';

export function traceRidge(win, lf, heightAt) {
  const pts = [];
  const margin = lf.margin ?? STEP;
  for (let sx = -margin; sx <= win.w + margin; sx += STEP) {
    const wx = sx + lf.offset;
    const bm = biomeAt(wx / lf.px);
    pts.push({ x: win.x + sx, y: heightAt(wx, bm), wx, bm });
  }
  return pts;
}

export function fillRidge(ctx, pts, bottom, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, bottom);
  pts.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, bottom);
  ctx.closePath();
  ctx.fill();
}

export function acrossGradient(ctx, win, lf, colorAt) {
  const g = ctx.createLinearGradient(win.x, 0, win.x + win.w, 0);
  const stops = 8;
  for (let i = 0; i <= stops; i++) {
    const wx = lf.offset + (win.w * i) / stops;
    g.addColorStop(i / stops, colorAt(biomeAt(wx / lf.px)));
  }
  return g;
}

/** Visits jittered object slots of a layer that can be visible; `margin` covers wide objects. */
export function forEachSlot(win, lf, spacing, objectMargin, seed, fn) {
  const margin = objectMargin + (lf.margin ?? 0);
  const first = Math.floor((lf.offset - margin) / spacing) - 1;
  const last = Math.floor((lf.offset + win.w + margin) / spacing) + 1;
  for (let i = first; i <= last; i++) {
    const wx = (i + hash(i, seed) * 0.8) * spacing;
    if (riverAt(wx / lf.px) || crossingAt(wx / lf.px)) continue;
    fn(i, win.x + wx - lf.offset, wx, biomeAt(wx / lf.px));
  }
}

/** Visits regular (unjittered) segments [wx0, wx0 + spacing) of a layer. */
export function forEachSegment(win, lf, spacing, fn) {
  const margin = lf.margin ?? 0;
  const first = Math.floor((lf.offset - margin) / spacing) - 1;
  const last = Math.floor((lf.offset + win.w + margin) / spacing) + 1;
  for (let i = first; i <= last; i++) {
    const wx0 = i * spacing;
    const mid = (wx0 + spacing / 2) / lf.px;
    if (riverAt(mid) || crossingAt(mid)) continue;
    fn(i, wx0, win.x + wx0 - lf.offset, biomeAt(mid));
  }
}
