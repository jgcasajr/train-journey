import { TRANSFER_STATION } from './lineChange.js';
import { nextStationNamed, stationsBetween } from './stations.js';

const WAVE_SECONDS = 6;

/**
 * Destination state follows the panel choice (`input.destination`, '' = free trip).
 * Choosing a new destination starts a new trip (for the arrival summary).
 */
export function updateDestination(state, input) {
  const destination = input.destination || null;
  const destinationAt = destination ? input.destinationAt ?? null : null; // a scheduled pass of the station
  if (destination === state.destination) return destinationAt === state.destinationAt ? {} : { destinationAt };
  const release = state.holding ? { holding: false, arrivedAt: null, dwell: Math.min(state.dwell, 2) } : {};
  return {
    destination,
    destinationAt,
    tripStart: destination ? { distance: state.distance, time: state.time } : null,
    ...release,
  };
}

/**
 * The station the train is heading to, or null on a free trip. A destination on the other
 * line means heading to Nexus first, to change trains there.
 */
export function destinationStation(state) {
  if (!state.destination) return null;
  if (state.destinationAt && state.destinationAt >= state.distance - 1) {
    const scheduled = stationsBetween(state.destinationAt - 1, state.destinationAt + 1).find((s) => s.name === state.destination);
    if (scheduled) return scheduled;
  }
  return nextStationNamed(state.distance, state.destination, state.served?.id)
    ?? nextStationNamed(state.distance, TRANSFER_STATION, state.served?.id);
}

/** Remaining distance and a time estimate at the chosen cruising speed. */
export function eta(state, targetKmh) {
  const station = destinationStation(state);
  if (!station) return null;
  const meters = Math.max(0, station.stopAt - state.distance);
  const speed = Math.max(5, Math.min(targetKmh / 3.6, 60));
  const via = station.name === state.destination ? null : station.name;
  return { name: state.destination, via, km: meters / 1000, minutes: Math.ceil(meters / speed / 60) };
}

/** Called on a station arrival: at the destination the train holds and she celebrates. */
export function arrivalAtDestination(state, station) {
  if (!state.destination || station.name !== state.destination) return {};
  // On a schedule, only the planned pass of the station counts (earlier ones are just stops).
  if (state.destinationAt && Math.abs(station.stopAt - state.destinationAt) > 1) return {};
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
