const RES = 0.25; // fog bitmap resolution relative to the window size (blurry = realistic)
const REFOG_INTERVAL = 1; // seconds between re-fog steps
const REFOG_STEP = 0.06; // fraction of each wiped mark that fogs back per step

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

/**
 * Condensation on the glass that the viewer can wipe/draw on with the pointer.
 * `mask` holds wiped marks (opaque = clear glass); it slowly fades so the glass fogs back.
 * The canvases are the only mutable state and never leave this module.
 */
export function createFog() {
  let mask = null;
  let layer = null;
  let refogTimer = 0;

  function ensure(win) {
    const w = Math.max(16, Math.round(win.w * RES));
    const h = Math.max(16, Math.round(win.h * RES));
    if (mask && mask.width === w && mask.height === h) return;
    mask = makeCanvas(w, h);
    layer = makeCanvas(w, h);
  }

  function refog(dt) {
    refogTimer += dt;
    if (refogTimer < REFOG_INTERVAL) return;
    refogTimer = 0;
    const m = mask.getContext('2d');
    m.globalCompositeOperation = 'destination-out';
    m.fillStyle = `rgba(0,0,0,${REFOG_STEP})`;
    m.fillRect(0, 0, mask.width, mask.height);
    m.globalCompositeOperation = 'source-over';
  }

  return {
    /** segments: [[{x,y},{x,y}], ...] in canvas CSS pixels. */
    wipe(segments, layout) {
      const { win, u } = layout;
      ensure(win);
      const m = mask.getContext('2d');
      m.strokeStyle = '#000';
      m.lineCap = 'round';
      m.lineJoin = 'round';
      m.lineWidth = Math.max(2, u * 2.4 * RES);
      m.beginPath();
      segments.forEach(([a, b]) => {
        m.moveTo((a.x - win.x) * RES, (a.y - win.y) * RES);
        m.lineTo((b.x - win.x) * RES + 0.01, (b.y - win.y) * RES);
      });
      m.stroke();
    },

    draw(ctx, layout, amount, dt) {
      const { win } = layout;
      ensure(win);
      refog(dt);
      if (amount < 0.02) return;
      const l = layer.getContext('2d');
      l.clearRect(0, 0, layer.width, layer.height);
      const g = l.createLinearGradient(0, 0, 0, layer.height);
      g.addColorStop(0, `rgba(222,228,234,${amount * 0.35})`);
      g.addColorStop(1, `rgba(222,228,234,${amount * 0.58})`);
      l.fillStyle = g;
      l.fillRect(0, 0, layer.width, layer.height);
      l.globalCompositeOperation = 'destination-out';
      l.drawImage(mask, 0, 0);
      l.globalCompositeOperation = 'source-over';
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(layer, win.x, win.y, win.w, win.h);
      ctx.restore();
    },
  };
}
