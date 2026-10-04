// Focus/break durations (minutes) for focus mode; see focus.js.

export const DEFAULT_DURATIONS = { focus: 25, rest: 5 }; // minutes

/** Durations from URL params (?foco=50&pausa=10), falling back to 25/5 on invalid input. */
export function durationsFromParams(params) {
  const minutes = (key, fallback) => {
    const v = Number(params.get(key));
    return Number.isFinite(v) && v > 0 && v <= 180 ? v : fallback;
  };
  return { focus: minutes('foco', DEFAULT_DURATIONS.focus), rest: minutes('pausa', DEFAULT_DURATIONS.rest) };
}
