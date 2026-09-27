import { LINES, lineAt } from './biomes.js';
import { DWELL, linesOf, stationOnLine } from './stations.js';

export const TRANSFER_STATION = 'Nexus';

/** The train can be changed while standing at the Nexus station (not while holding at a destination). */
export const canTransfer = (state) => state.dwell > 0 && state.served?.name === TRANSFER_STATION && !state.holding;

/** Heading to a station that is only on the other line (so she must change at Nexus). */
export const needsChange = (state) => Boolean(state.destination) && !linesOf(state.destination).includes(lineAt(state.distance));

/** The line on the other side of the Nexus platform. */
export const otherLine = (state) => (lineAt(state.distance) + 1) % LINES.length;

/**
 * Changing trains at Nexus: she steps onto the other line's train, which then waits a full
 * dwell before leaving. A trip in progress keeps its traveled distance across the jump.
 */
export function transferState(state) {
  if (!canTransfer(state)) return {};
  const st = stationOnLine(otherLine(state), TRANSFER_STATION);
  if (!st) return {};
  const shift = st.stopAt - state.distance;
  return {
    distance: st.stopAt,
    speed: 0,
    dwell: DWELL,
    served: { id: st.id, name: st.name },
    companion: null,
    companionSpeech: null,
    transfers: (state.transfers ?? 0) + 1,
    tripStart: state.tripStart ? { ...state.tripStart, distance: state.tripStart.distance + shift } : null,
  };
}
