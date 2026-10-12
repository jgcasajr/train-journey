// Battery saver: fewer frames (20 per second instead of up to 60) and a lower-resolution canvas,
// for leaving the window running for hours. "Automático" turns it on when the device runs on a
// low battery (where the browser reports it).

export const SAVER_FPS = 20;
const LOW_BATTERY = 0.25;

/** Whether this animation frame should be drawn (always, unless saving and it is too soon). */
export const shouldDraw = (now, lastDraw, saving) => !saving || now - lastDraw >= 1000 / SAVER_FPS - 2;

/** On, off, or automatic with the battery status ({ charging, level }; null when unknown). */
export function saverActive(mode, battery) {
  if (mode === 'on') return true;
  if (mode !== 'auto' || !battery) return false;
  return !battery.charging && battery.level <= LOW_BATTERY;
}

/**
 * The "Economia de bateria" select (off / auto / on). Calls onChange(active, { auto }) whenever
 * the saver turns on or off, `auto` telling whether the battery level did it.
 */
export function createBatterySaver(doc, nav, onChange) {
  const select = doc.getElementById('battery-saver');
  if (!select) throw new Error('Missing element #battery-saver');
  let battery = null;
  let active = false;

  function update() {
    const next = saverActive(select.value, battery);
    if (next === active) return;
    active = next;
    onChange(active, { auto: select.value === 'auto' });
  }

  select.addEventListener('change', update);
  if (typeof nav.getBattery === 'function') {
    nav.getBattery()
      .then((b) => {
        const read = () => { battery = { charging: b.charging, level: b.level }; update(); };
        b.addEventListener('levelchange', read);
        b.addEventListener('chargingchange', read);
        read();
      })
      .catch((err) => console.warn('Battery status unavailable:', err));
  }
  update();
  return { active: () => active };
}
