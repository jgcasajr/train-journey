import { LINES } from './biomes.js';
import { t } from './i18n.js';
import { canTransfer, needsChange, otherLine } from './lineChange.js';
import { DWELL } from './stations.js';

const FADE_MS = 500;
const AUTO_AFTER = 3; // seconds at the platform before changing trains on her own

function element(doc, id) {
  const node = doc.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node;
}

/** The "change trains" button shown at the Nexus platform; fades the view while she crosses. */
export function createTransfer(doc, { onTransfer }) {
  const button = element(doc, 'transfer-btn');
  const fade = element(doc, 'car-fade');
  let busy = false;
  let label = '';
  function change() {
    if (busy) return;
    busy = true;
    fade.classList.add('on');
    setTimeout(() => {
      onTransfer();
      fade.classList.remove('on');
      busy = false;
    }, FADE_MS);
  }
  button.addEventListener('click', (e) => { e.stopPropagation(); change(); });
  return {
    /** Called every frame: shows the button while a transfer is possible. */
    update(state) {
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
