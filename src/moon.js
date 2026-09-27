import { hash, mod } from './utils.js';

export const LUNAR_DAYS = 8; // in-game days per lunar cycle (compressed so the phases show up)

/** Moon phase 0..1: 0 new, 0.25 first quarter, 0.5 full, 0.75 last quarter. */
export const moonPhase = (dayCount, dayTime) => mod((dayCount + dayTime) / LUNAR_DAYS, 1);

/** Share of the disc that is lit (0 new moon .. 1 full moon). */
export const moonFullness = (phase) => (1 - Math.cos(phase * Math.PI * 2)) / 2;

export function moonPhaseName(phase) {
  const names = ['Lua nova', 'Lua crescente', 'Quarto crescente', 'Lua gibosa crescente', 'Lua cheia', 'Lua gibosa minguante', 'Quarto minguante', 'Lua minguante'];
  return names[Math.round(phase * 8) % 8];
}

/** Some clear nights bring a meteor shower (seeded by the day, so the same night repeats it). */
export const meteorNight = (dayCount) => hash(dayCount, 2701) < 0.3;

/**
 * Draws the moon disc with its phase: the dark part in `shadow`, the lit part bounded by the
 * limb on one side and an elliptical terminator that sweeps across as the phase changes.
 */
export function drawMoonDisc(ctx, x, y, r, phase, lit, shadow) {
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  const fullness = moonFullness(phase);
  if (fullness < 0.01) return;
  const waxing = phase < 0.5;
  const k = Math.cos(phase * Math.PI * 2); // 1 = new, -1 = full
  const throughLeft = (waxing && k < 0) || (!waxing && k > 0);
  ctx.fillStyle = lit;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, !waxing);
  ctx.ellipse(x, y, r * Math.abs(k), r, 0, Math.PI / 2, throughLeft ? Math.PI * 1.5 : -Math.PI / 2, !throughLeft);
  ctx.fill();
}
