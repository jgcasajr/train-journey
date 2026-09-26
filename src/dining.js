import { aisleEventAt } from './aisleSchedule.js';
import { hash } from './utils.js';

const BITE_SLOT = 18; // seconds between bites
const BITE_SECONDS = 3.5;
const BITE = 0.2; // share of the plate eaten per bite

/** The menu. `colors` paint the food on the plate: [main, side, garnish]. */
export const DISHES = [
  { id: 'feijoada', name: 'Feijoada', colors: ['#3b2418', '#f4f1ea', '#f29e38'] },
  { id: 'moqueca', name: 'Moqueca de peixe', colors: ['#e07a2a', '#f4f1ea', '#4f8f3f'] },
  { id: 'risoto', name: 'Risoto de cogumelos', colors: ['#e8dcb8', '#7a5a3a', '#4f8f3f'] },
  { id: 'salada', name: 'Salada tropical', colors: ['#6fbf4a', '#e63946', '#ffd166'] },
  { id: 'macarrao', name: 'Macarrão ao sugo', colors: ['#e8c07a', '#c0392b', '#4f8f3f'] },
  { id: 'pudim', name: 'Pudim de leite', colors: ['#f2d49b', '#8a4a1e', '#8a4a1e'] },
];

/** Dish of the day for waiter visit k. */
export const dishFor = (k) => DISHES[Math.floor(hash(k, 2601) * DISHES.length)];

export const initialDining = () => ({ car: 'passenger', meal: null, servedVisit: null });

/** The waiter hands the plate over at the same moment the snack cart would hand over the coffee. */
function servedNow(state) {
  const ev = aisleEventAt(state.time, state.dayTime);
  const handing = ev?.kind === 'cart' && ev.phase === 'stop' && ev.t >= 7.4 && ev.t < 9.2;
  return handing && state.servedVisit !== ev.k ? ev : null;
}

/** Is she taking a bite right now (fork to mouth)? */
export function biting(state) {
  if (state.car !== 'dining' || !state.meal || state.meal.level <= 0.02) return false;
  const t = state.time - state.meal.servedAt;
  return t > 4 && t % BITE_SLOT < BITE_SECONDS;
}

/** Pure dining step: follows the car chosen in the panel, serves plates and eats them bit by bit. */
export function updateDining(state, dt, input) {
  const car = input.car === 'dining' ? 'dining' : 'passenger';
  if (car !== 'dining') return { car, meal: state.meal };
  const served = servedNow(state);
  if (served) {
    return { car, servedVisit: served.k, meal: { dish: dishFor(served.k).id, level: 1, servedAt: state.time } };
  }
  const eating = biting(state);
  const meal = state.meal && eating
    ? { ...state.meal, level: Math.max(0, state.meal.level - (BITE / BITE_SECONDS) * dt) }
    : state.meal;
  return { car, meal };
}
