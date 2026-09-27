import { biomeAt, num } from './biomes.js';
import { initialCabin, updateCabin } from './cabin.js';
import { DAY_SECONDS } from './clock.js';
import { arrivalAtDestination, destinationStation, updateDestination } from './destination.js';
import { initialDining, updateDining } from './dining.js';
import { initialCompanion, updateCompanion } from './companion.js';
import { EMERGENCY_DECEL, applyEvents, initialInteraction, updateInteraction } from './events.js';
import { createDrops, updateDrops } from './glass.js';
import { initialPassersby, updatePassersby } from './passersby.js';
import { initialPassing, updatePassing } from './passingTrain.js';
import { seasonWeights } from './seasons.js';
import { DWELL, nextStation } from './stations.js';
import { approach } from './utils.js';
import { initialWeather, updateWeather } from './weather.js';

export const RAIL_LENGTH = 25; // meters between rail joints ("clack")
const ACCEL = 2.2; // m/s²
const BRAKE = 0.9; // m/s², comfortable service braking into stations
const START_DISTANCE = 600;
const START_DAY = 2; // the trip starts with a waxing moon
const DROP_COUNT = 140;

export function initialState(input, startKm) {
  const distance = Number.isFinite(startKm) && startKm >= 0 ? startKm * 1000 : START_DISTANCE;
  return {
    time: 0,
    distance,
    speed: input.targetKmh / 3.6,
    dayTime: input.dayTime,
    dayCount: START_DAY,
    ...initialWeather(input),
    jolt: 0,
    joint: Math.floor(distance / RAIL_LENGTH),
    crossedJoint: false,
    dwell: 0,
    served: null,
    arrived: false,
    departed: false,
    fog: initialWeather(input).rain * 0.85,
    drops: createDrops(DROP_COUNT),
    ...initialPassing(),
    ...initialCabin(),
    ...initialInteraction(),
    ...initialCompanion(),
    ...initialPassersby(),
    ...initialDining(),
    destination: null,
    tripStart: null,
    holding: false,
    arrivedAt: null,
  };
}

/** Glass condensation: rain fogs the window, and so does cold air (mountains, winter). */
function fogTarget(state) {
  const cold = Math.max(num(biomeAt(state.distance), 'snow') * 0.6, seasonWeights(state.seasonPhase).winter * 0.5);
  return Math.max(state.rain > 0.3 ? 0.85 : 0, cold);
}

/** Time of day; counts whole days as midnight passes (for the moon phases). */
function nextDay(state, dt, input) {
  if (!input.autoDay) return { dayTime: input.dayTime };
  const raw = state.dayTime + dt / DAY_SECONDS;
  return { dayTime: raw % 1, dayCount: state.dayCount + (raw >= 1 ? 1 : 0) };
}

/** Fields that evolve the same way whether the train is moving or standing. */
function ambient(state, dt, input) {
  return {
    time: state.time + dt,
    ...nextDay(state, dt, input),
    ...updateWeather(state, dt, input),
    fog: approach(state.fog, fogTarget(state), dt * 0.05),
    drops: updateDrops(state.drops, dt, state.speed),
    ...updatePassing(state, dt, state.speed),
    ...updateCabin(state, dt),
  };
}

/** Rail joints give a small jolt; the pressure wave of a passing train a bigger one. */
function nextJolt(state, dt, crossedJoint, speed, passStarted) {
  const decayed = state.jolt * Math.exp(-dt * 7);
  if (passStarted) return Math.max(decayed, 0.8);
  return crossedJoint ? Math.min(1, 0.3 + speed / 45) : decayed;
}

function standing(state, dt, input) {
  // At the destination the train waits (holding) until the viewer decides what to do next.
  const dwell = state.holding ? state.dwell : (input.stops ? Math.max(0, state.dwell - dt) : 0);
  const amb = ambient(state, dt, input);
  return {
    ...state,
    ...amb,
    speed: 0,
    dwell,
    jolt: nextJolt(state, dt, false, 0, amb.passStarted),
    crossedJoint: false,
    arrived: false,
    departed: dwell === 0,
  };
}

/** Max speed that still lets the train stop at the next station with BRAKE deceleration. */
function stationLimit(state, input) {
  const station = input.stops ? nextStation(state.distance, state.served?.id) : destinationStation(state);
  if (!station) return { station: null, limit: Infinity };
  return { station, limit: Math.sqrt(2 * BRAKE * Math.max(0, station.stopAt - state.distance)) };
}

/** Speed after dt: emergency braking to a halt if the cord was pulled, otherwise normal driving. */
function nextSpeed(state, dt, input, limit) {
  if (state.time < state.brakeUntil) return approach(state.speed, 0, EMERGENCY_DECEL * dt);
  return approach(state.speed, Math.min(input.targetKmh / 3.6, limit), ACCEL * dt);
}

function moving(state, dt, input) {
  const { station, limit } = stationLimit(state, input);
  const cruise = nextSpeed(state, dt, input, limit);
  const moved = state.distance + cruise * dt;
  const arrived = station !== null && moved >= station.stopAt - 0.3;
  const distance = arrived ? station.stopAt : moved;
  const joint = Math.floor(distance / RAIL_LENGTH);
  const crossedJoint = joint !== state.joint;
  const amb = ambient(state, dt, input);
  return {
    ...state,
    ...amb,
    distance,
    speed: arrived ? 0 : cruise,
    joint,
    crossedJoint,
    jolt: nextJolt(state, dt, crossedJoint, cruise, amb.passStarted),
    dwell: arrived ? DWELL : 0,
    served: arrived ? { id: station.id, name: station.name } : state.served,
    arrived,
    departed: false,
    ...(arrived ? arrivalAtDestination(state, station) : {}),
  };
}

/**
 * Pure simulation step: returns a new state, never mutates the previous one.
 * `input.events` are the viewer's clicks this frame (see events.js).
 */
export function step(prev, dt, input) {
  const afterEvents = applyEvents(prev, input.events ?? []);
  const state = { ...afterEvents, ...updateDestination(afterEvents, input) };
  const next = state.dwell > 0 ? standing(state, dt, input) : moving(state, dt, input);
  return {
    ...next,
    ...updateInteraction(next, dt),
    ...updateCompanion(next),
    ...updatePassersby(next),
    ...updateDining(next, dt, input),
    jolt: state.brakeStarted ? 1 : next.jolt,
  };
}

/** Text for the destination board: current or next station. */
export function stationInfo(state, stops) {
  if (state.dwell > 0 && state.served) {
    const { name } = state.served;
    return name.startsWith('Estação') ? name : `Estação ${name}`;
  }
  if (!stops) return '';
  const next = nextStation(state.distance, state.served?.id);
  return next ? `Próx.: ${next.name} ${((next.stopAt - state.distance) / 1000).toFixed(1)} km` : '';
}

/** Vertical sway of the carriage, in pixels. */
export function trainBob(state, u) {
  const k = Math.min(1, state.speed / 25);
  return u * (
    0.18 * k * Math.sin(state.time * 2.1)
    + 0.08 * k * Math.sin(state.time * 5.3)
    + 0.25 * state.jolt * Math.sin(state.time * 38)
  );
}
