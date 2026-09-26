/** Real seconds for one full in-game day (automatic day cycle). */
export const DAY_SECONDS = 300;

/** Night hours, when the snack cart rests and passengers doze. */
export const isNight = (dayTime) => dayTime > 0.9 || dayTime < 0.2;
