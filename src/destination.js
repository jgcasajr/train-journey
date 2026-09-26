import { nextStationNamed } from './stations.js';

const WAVE_SECONDS = 6;

/**
 * Destination state follows the panel choice (`input.destination`, '' = free trip).
 * Choosing a new destination starts a new trip (for the arrival summary).
 */
export function updateDestination(state, input) {
  const destination = input.destination || null;
  if (destination === state.destination) return {};
  const release = state.holding ? { holding: false, arrivedAt: null, dwell: Math.min(state.dwell, 2) } : {};
  return {
    destination,
    tripStart: destination ? { distance: state.distance, time: state.time } : null,
    ...release,
  };
}

/** The station the train is heading to, or null on a free trip. */
export function destinationStation(state) {
  return state.destination ? nextStationNamed(state.distance, state.destination, state.served?.id) : null;
}

/** Remaining distance and a time estimate at the chosen cruising speed. */
export function eta(state, targetKmh) {
  const station = destinationStation(state);
  if (!station) return null;
  const meters = Math.max(0, station.stopAt - state.distance);
  const speed = Math.max(5, Math.min(targetKmh / 3.6, 60));
  return { name: station.name, km: meters / 1000, minutes: Math.ceil(meters / speed / 60) };
}

/** Called on a station arrival: at the destination the train holds and she celebrates. */
export function arrivalAtDestination(state, station) {
  if (!state.destination || station.name !== state.destination) return {};
  const start = state.tripStart ?? { distance: state.distance, time: state.time };
  return {
    holding: true,
    arrivedAt: {
      name: station.name,
      time: state.time,
      km: (station.stopAt - start.distance) / 1000,
      minutes: (state.time - start.time) / 60,
    },
    speech: { text: `Chegamos a ${station.name}!`, until: state.time + 4 },
  };
}

/** She waves happily for a few seconds after arriving. */
export const celebrating = (state) => state.holding && state.arrivedAt && state.time - state.arrivedAt.time < WAVE_SECONDS;
