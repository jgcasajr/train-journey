// Vibration on phones that support it (Android browsers): the train felt in the hand —
// the double "clack" of the rail joints, the brakes, a passing train, close thunder.
// Off by default; never while the sleep timer runs or the page is hidden.

const MIN_JOINT_SPEED = 3; // m/s; no clacks while creeping into a station

/** The vibration pattern (ms on/off) for this frame of the trip, or null. Strongest event wins. */
export function hapticFor(state) {
  if (state.brakeStarted) return [90, 40, 140];
  if (state.lightningStarted && state.lightning && state.lightning.far < 0.4) return [160];
  if (state.passStarted) return [40, 30, 40, 30, 40];
  if (state.arrived) return [25, 70, 25];
  if (state.departed) return [15];
  if (state.crossedJoint && state.speed > MIN_JOINT_SPEED) return [6, 80, 6]; // two bogies over the joint
  return null;
}

/** The "Vibração" checkbox: hidden where the device cannot vibrate. */
export function createHaptics(doc, nav) {
  const box = doc.getElementById('haptics');
  if (!box) throw new Error('Missing element #haptics');
  const supported = typeof nav.vibrate === 'function';
  if (!supported) box.closest('label')?.classList.add('hidden');
  return {
    /** Called every frame after the simulation step. */
    play(state, { quiet = false } = {}) {
      if (!supported || !box.checked || quiet || doc.hidden) return;
      const pattern = hapticFor(state);
      if (!pattern) return;
      try {
        nav.vibrate(pattern);
      } catch (err) {
        console.warn('Vibration unavailable:', err);
      }
    },
  };
}
