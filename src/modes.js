import { lineKm } from './biomes.js';
import { createLineMap } from './lineMap.js';
import { makePostcard } from './postcard.js';
import { onLangChange } from './i18n.js';


function element(doc, id) {
  const node = doc.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node;
}

const setPressed = (button, on) => button.setAttribute('aria-pressed', String(on));

/** Downloads a canvas as a PNG and flashes the screen like a camera. */
function saveCanvas(canvas, filename, flash) {
  canvas.toBlob((blob) => {
    if (!blob) {
      console.error('Photo failed: canvas produced no image');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
  flash.classList.remove('flashing');
  void flash.offsetWidth; // restart the CSS animation
  flash.classList.add('flashing');
}

/**
 * Relax mode (fullscreen, hidden UI, ambient music), line map, photo and postcard.
 */
export function createModes(doc, { canvas, panel, radio, describe, onPostcard }) {
  const ui = {
    relax: element(doc, 'relax'),
    map: element(doc, 'map-btn'),
    photo: element(doc, 'photo'),
    postcard: element(doc, 'postcard'),
    lineMap: element(doc, 'line-map'),
    flash: element(doc, 'photo-flash'),
  };
  const lineMap = createLineMap(element(doc, 'map-svg'), element(doc, 'map-lap'));
  onLangChange(() => lineMap.invalidate());
  let distanceKm = 0;
  let relaxTurnedRadioOn = false; // relax mode switches the radio to ambient only if it was off

  async function setRelax(on) {
    doc.body.classList.toggle('relax', on);
    setPressed(ui.relax, on);
    if (on) {
      panel.classList.add('hidden');
      await doc.documentElement.requestFullscreen?.().catch((err) => console.warn('Fullscreen unavailable:', err));
      relaxTurnedRadioOn = radio.station === 'off';
      if (relaxTurnedRadioOn) await radio.tune('ambient').catch((err) => console.error('Radio unavailable:', err));
      return;
    }
    if (relaxTurnedRadioOn) radio.tune('off');
    relaxTurnedRadioOn = false;
    if (doc.fullscreenElement) await doc.exitFullscreen().catch(() => {});
  }

  const stop = (e) => e.stopPropagation();
  ui.relax.addEventListener('click', (e) => { stop(e); setRelax(!doc.body.classList.contains('relax')); });
  doc.addEventListener('fullscreenchange', () => {
    if (!doc.fullscreenElement && doc.body.classList.contains('relax')) setRelax(false);
  });
  ui.map.addEventListener('click', (e) => {
    stop(e);
    const visible = ui.lineMap.classList.toggle('hidden') === false;
    setPressed(ui.map, visible);
  });
  ui.photo.addEventListener('click', (e) => {
    stop(e);
    saveCanvas(canvas, `train-journey-km${distanceKm.toFixed(1)}.png`, ui.flash);
  });
  /** Saves the view as a postcard; `extra` can replace its title and message. */
  function postcard(extra = {}) {
    try {
      const card = makePostcard(doc, canvas, { ...describe(), km: distanceKm, ...extra });
      saveCanvas(card, `cartao-postal-km${distanceKm.toFixed(1)}.png`, ui.flash);
      onPostcard();
    } catch (err) {
      console.error('Postcard failed:', err);
    }
  }
  ui.postcard.addEventListener('click', (e) => { stop(e); postcard(); });

  return {
    postcard,
    /** Called every frame with the simulation distance (meters). */
    tick(distance, destination) {
      distanceKm = lineKm(distance);
      if (!ui.lineMap.classList.contains('hidden')) lineMap.update(distance, destination);
    },
  };
}
