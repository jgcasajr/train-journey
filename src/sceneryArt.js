import { lineAt, LINES } from './biomes.js';

const FILES = {
  aurora: '../assets/aurora-panorama.webp',
  horizonte: '../assets/horizonte-panorama.webp',
  estelar: '../assets/estelar-panorama.webp',
};
const images = {};

function load(id) {
  if (images[id] || typeof Image === 'undefined') return images[id];
  const image = new Image();
  image.decoding = 'async';
  image.src = new URL(FILES[id], import.meta.url).href;
  images[id] = image;
  return image;
}

/** Paint a moving crop of the generated panorama behind procedural foreground objects. */
export function drawSceneryArt(ctx, view, state, env) {
  const id = LINES[lineAt(state.distance)].id;
  const image = load(id);
  if (!image?.complete || !image.naturalWidth) return false;
  const { win } = view;
  const sourceWidth = Math.min(image.naturalWidth, image.naturalHeight * win.w / win.h);
  const room = image.naturalWidth - sourceWidth;
  const phase = (state.distance * 0.0003) % 2;
  const pan = room * (phase < 1 ? phase : 2 - phase);
  ctx.drawImage(image, pan, 0, sourceWidth, image.naturalHeight, win.x, win.y, win.w, win.h);
  if (id !== 'estelar') {
    const night = Math.max(0, Math.min(1, -env.sunElev * 1.8));
    if (night > 0) {
      ctx.fillStyle = `rgba(5,9,30,${night * 0.8})`;
      ctx.fillRect(win.x, win.y, win.w, win.h);
    }
  }
  if (env.rain > 0.1) {
    ctx.fillStyle = `rgba(47,55,69,${Math.min(0.4, env.rain * 0.35)})`;
    ctx.fillRect(win.x, win.y, win.w, win.h);
  }
  return true;
}
