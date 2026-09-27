import { LINES, lineAt } from './biomes.js';
import { t } from './i18n.js';
import { canTransfer, needsChange, otherLine } from './lineChange.js';
import { SCENE_SECONDS } from './platformScene.js';
import { DWELL } from './stations.js';

const FADE_MS = 500;
const AUTO_AFTER = 3; // seconds at the platform before changing trains on her own

function element(doc, id) {
  const node = doc.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node;
}

/**
 * The "change trains" button shown at the Nexus platform. Changing fades to black, applies the
 * transfer and then plays the platform scene (she walks from one train to the other).
 */
export function createTransfer(doc, { onTransfer, onAnnounce }) {
  const button = element(doc, 'transfer-btn');
  const fade = element(doc, 'car-fade');
  let busy = false;
  let label = '';
  let scene = null; // { start (ms), from, to } while the platform scene plays
  let fromLine = 0;
  function change() {
    if (busy) return;
    busy = true;
    fade.classList.add('on');
    const to = (fromLine + 1) % LINES.length;
    setTimeout(() => {
      onTransfer();
      scene = { start: performance.now(), from: LINES[fromLine].id, to: LINES[to].id, toName: LINES[to].name };
      fade.classList.remove('on');
      onAnnounce();
    }, FADE_MS);
  }
  button.addEventListener('click', (e) => { e.stopPropagation(); change(); });
  return {
    /** Called every frame: shows the button while a transfer is possible. */
    /** The platform scene to draw now ({ t, from, to, announcement }), or null. */
    sceneAt(now) {
      if (!scene) return null;
      const sec = (now - scene.start) / 1000;
      if (sec <= SCENE_SECONDS) {
        return { t: sec, from: scene.from, to: scene.to, announcement: t(`Atenção: trem da ${scene.toName} na plataforma 2. Boa viagem!`) };
      }
      scene = null;
      busy = false;
      // Soft fade back into the cabin of the new train.
      fade.style.transition = 'none';
      fade.classList.add('on');
      void fade.offsetWidth; // commit the black frame before fading out
      fade.style.transition = '';
      fade.classList.remove('on');
      return null;
    },
    update(state) {
      if (!busy) fromLine = lineAt(state.distance);
      const show = canTransfer(state) && !busy;
      button.classList.toggle('hidden', !show);
      if (!show) return;
      // Heading to a station on the other line: she changes trains without being asked.
      if (needsChange(state) && DWELL - state.dwell > AUTO_AFTER) { change(); return; }
      const next = t(`Fazer baldeação: ${LINES[otherLine(state)].name}`);
      if (next !== label) {
        label = next;
        button.textContent = next;
      }
    },
  };
}
