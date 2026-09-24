/** Head-movement parallax, in layout units: the whole outside view shifts by LOOK_FAR... */
export const LOOK_FAR = 8;
/** ...minus this much per unit of depth, so nearby layers move less relative to the window frame. */
const LOOK_NEAR_CORRECTION = 5.6;

/**
 * Parallax frame for a layer. `depth` 1 = trackside, near 0 = horizon.
 * World x in pixels divided by `px` gives meters along the track, which selects the biome.
 * `layout.lookX` (-1..1) is the viewer's head offset; `margin` keeps shifted edges covered.
 */
export function layerFrame(layout, state, depth) {
  const px = layout.px * depth;
  const lookX = Number.isFinite(layout.lookX) ? layout.lookX : 0;
  const look = lookX * layout.u * LOOK_NEAR_CORRECTION * Math.min(depth, 1);
  return { px, offset: state.distance * px + look, margin: layout.u * (LOOK_FAR + 4) };
}

/** Screen x of a track position (meters) on the trackside layer. */
export function trackX(layout, state) {
  const lf = layerFrame(layout, state, 1);
  return (m) => layout.win.x + m * lf.px - lf.offset;
}
