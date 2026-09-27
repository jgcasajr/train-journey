/** The cars she can walk to, from the panel. */
export const CARS = ['passenger', 'dining', 'panorama', 'baggage', 'cab'];

export const validCar = (car) => (CARS.includes(car) ? car : 'passenger');

/** Cars with her own seat by the window (passenger, companion, cup, radio...). */
export const seatedCar = (car) => car === 'passenger' || car === 'dining';

/**
 * The opening to the outside in each car: the panorama window runs up into the glass roof,
 * the baggage car only has its sliding door half open. The horizon stays where it was, so
 * a taller window simply shows more sky.
 */
export function carLayout(layout, car) {
  const { win, u, W } = layout;
  if (car === 'panorama') {
    const top = u * 1.5;
    return { ...layout, win: { ...win, y: top, h: win.y + win.h - top } };
  }
  if (car === 'baggage') {
    const w = Math.min(win.w * 0.42, W * 0.36);
    return { ...layout, win: { x: W * 0.52, y: win.y + win.h * 0.02, w, h: win.h * 0.98, r: u * 0.6 } };
  }
  return layout;
}
