// Pomodoro timer as plain data; `now` is wall-clock milliseconds (Date.now()).

export const DEFAULT_DURATIONS = { focus: 25, rest: 5 }; // minutes

export function startPomodoro(now, durations = DEFAULT_DURATIONS) {
  return { phase: 'focus', endsAt: now + durations.focus * 60000, cycle: 1, durations };
}

/** Advances to the next phase when the current one ends. */
export function tickPomodoro(p, now) {
  if (!p || now < p.endsAt) return { pomodoro: p, switched: false };
  const phase = p.phase === 'focus' ? 'rest' : 'focus';
  return {
    pomodoro: {
      ...p,
      phase,
      endsAt: now + p.durations[phase] * 60000,
      cycle: p.cycle + (phase === 'focus' ? 1 : 0),
    },
    switched: true,
  };
}

export function pomodoroLabel(p, now) {
  const seconds = Math.max(0, Math.ceil((p.endsAt - now) / 1000));
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${p.phase === 'focus' ? 'Foco' : 'Pausa'} ${mm}:${ss} · #${p.cycle}`;
}

/** Durations from URL params (?foco=50&pausa=10), falling back to 25/5 on invalid input. */
export function durationsFromParams(params) {
  const minutes = (key, fallback) => {
    const v = Number(params.get(key));
    return Number.isFinite(v) && v > 0 && v <= 180 ? v : fallback;
  };
  return { focus: minutes('foco', DEFAULT_DURATIONS.focus), rest: minutes('pausa', DEFAULT_DURATIONS.rest) };
}
