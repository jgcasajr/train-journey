import { LIGHTHOUSE_DEPTH, lighthousesInView } from './coast.js';
import { companionBox } from './companionView.js';
import { layerFrame, trackX } from './frame.js';
import { passingCoverage } from './passingTrain.js';
import { tunnelsBetween } from './tunnel.js';
import { cordPosition, curtainBoxes, lampPosition } from './interior.js';
import { FIELDS_DEPTH, farmPropsInView } from './landscape.js';
import { passengerOrigin } from './passenger.js';
import { balloonsInView, flockBirds } from './skylife.js';

const ANIMALS = {
  cows: { text: 'Muuu!', sound: 'moo' },
  sheep: { text: 'Béééé!', sound: 'baa' },
  horses: { text: 'Hiiiin!', sound: 'neigh' },
};

const inBox = (p, b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
const near = (p, q, r) => Math.hypot(p.x - q.x, p.y - q.y) <= r;

/** Cabin objects, in screen coordinates (the passenger is shifted by the head-look parallax). */
function cabinTarget(view, state, p) {
  const { u, win } = view;
  const cord = cordPosition(view);
  if (inBox(p, { x: cord.x - u * 2, y: cord.top, w: u * 4, h: cord.handle - cord.top + u * 2 })) return { type: 'brake', sound: 'brake' };
  if (near(p, lampPosition(view), u * 3.5)) return { type: 'lamp', sound: 'click' };
  const o = passengerOrigin(view);
  const shifted = { x: p.x + view.lookX * u * 4, y: p.y + view.lookY * u * 2 };
  const cupX = o.x + u * 22;
  const ledgeY = win.y + win.h + u * 1.2;
  if (inBox(p, { x: cupX - u * 3.5, y: ledgeY - u * 6, w: u * 7, h: u * 7 })) return { type: 'sip' };
  if (inBox(shifted, { x: o.x - u * 9, y: o.y - u * 50, w: u * 22, h: u * 50 })) return { type: 'talk' };
  if (state.companion?.status === 'seated' && inBox(shifted, companionBox(view))) return { type: 'companion' };
  if (curtainBoxes(view, state.curtains).some((b) => inBox(p, b))) return { type: 'curtain', sound: 'swish' };
  return null;
}

/** Things outside the window; `q` is the click in outside-view coordinates. */
function outsideTarget(view, state, env, q) {
  const { u } = view;
  if (flockBirds(view, state, env).some((b) => near(q, b, u * 3))) return { type: 'scatter', sound: 'flutter' };
  const balloon = balloonsInView(view, state, env).find((b) => near(q, { x: b.x, y: b.y + b.s * 0.4 }, b.s * 1.3));
  if (balloon) return { type: 'wave', id: balloon.i, sound: 'cheer' };
  const animal = farmPropsInView(view, state).find((f) => ANIMALS[f.prop]
    && Math.abs(q.x - f.x) < f.s * 0.55 && q.y > f.y - f.s * 0.35 && q.y < f.y + f.s * 0.05);
  if (animal) {
    const { text, sound } = ANIMALS[animal.prop];
    return { type: 'float', text, sound, depth: FIELDS_DEPTH, wx: animal.wx, y: animal.y - animal.s * 0.3 };
  }
  const hills = layerFrame(view, state, LIGHTHOUSE_DEPTH);
  const tower = lighthousesInView(view, hills).find((l) => Math.abs(q.x - l.x) < u * 3
    && q.y > view.horizon - view.win.h * 0.35 && q.y < view.horizon + view.win.h * 0.2);
  return tower ? { type: 'flash', at: tower.at, sound: 'chime' } : null;
}

/**
 * What the viewer clicked, as an event for the simulation (or null for empty space).
 * `view` is the layout with lookX/lookY; `bob` is the carriage sway applied to the outside view.
 */
export function hitTest(view, state, env, bob, p) {
  const cabin = cabinTarget(view, state, p);
  if (cabin) return cabin;
  const { win, u } = view;
  const inWindow = inBox(p, { x: win.x, y: win.y, w: win.w, h: win.h });
  if (!inWindow || state.curtains > 0.6) return null;
  const q = { x: p.x - view.lookX * u * 8, y: p.y - bob - view.lookY * u * 3 };
  return viewBlockedAt(view, state, q.x) ? null : outsideTarget(view, state, env, q);
}

/** A tunnel wall or the opposing train right outside hides everything behind it. */
function viewBlockedAt(view, state, x) {
  const toX = trackX(view, state);
  const inTunnel = tunnelsBetween(state.distance - 50, state.distance + view.win.w / view.px + 50)
    .some((t) => x >= toX(t.start) && x <= toX(t.end));
  return inTunnel || passingCoverage(view, state) > 0.3;
}
