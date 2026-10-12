// Special days of the real calendar (the viewer's clock): the trip dresses up for them.
// `?data=2026-12-24` in the address pretends it is another day (to preview or share).

const DAY_MS = 24 * 3600 * 1000;

export const HOLIDAYS = {
  natal: { icon: '🎄', title: 'Natal no trem', greeting: 'Feliz Natal! O trem está todo enfeitado.' },
  anoNovo: { icon: '🎆', title: 'Ano Novo', greeting: 'Feliz Ano Novo! Fogos em todo o caminho esta noite.' },
  carnaval: { icon: '🎭', title: 'Carnaval', greeting: 'É Carnaval! Confete e serpentina nas estações.' },
  junina: { icon: '🌽', title: 'Mês de festa junina', greeting: 'Junho: bandeirinhas e fogueira nas estações do interior.' },
  criancas: { icon: '🪁', title: 'Dia das Crianças', greeting: 'Dia das Crianças! Olhe as pipas no céu.' },
};

/** Easter Sunday of a year (anonymous Gregorian algorithm), as a local date at noon. */
export function easter(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12);
}

/** Whole days from `a` to `b` (local calendar days). */
const daysBetween = (a, b) => Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate(), 12) - new Date(a.getFullYear(), a.getMonth(), a.getDate(), 12)) / DAY_MS);

/** Which special day a date is, or null. Carnival runs Saturday to Ash Wednesday. */
export function holidayFor(date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if ((month === 12 && day === 31) || (month === 1 && day === 1)) return 'anoNovo';
  if (month === 12) return 'natal';
  if (month === 10 && day === 12) return 'criancas';
  if (month === 6) return 'junina';
  const toEaster = daysBetween(date, easter(date.getFullYear()));
  if (toEaster >= 46 && toEaster <= 50) return 'carnaval';
  return null;
}

/** "2026-12-24" → local Date at noon, or null. */
export function parseDay(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text ?? '');
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return date.getMonth() === Number(m[2]) - 1 ? date : null;
}

/** Today's special day (re-checked once a minute, so midnight is noticed), with an optional date override. */
export function createCalendar(params, now = () => new Date()) {
  const fixed = parseDay(params.get('data'));
  let cached = null;
  let checkedAt = -Infinity;
  return {
    current() {
      const t = Date.now();
      if (t - checkedAt > 60000) {
        cached = holidayFor(fixed ?? now());
        checkedAt = t;
      }
      return cached;
    },
  };
}
