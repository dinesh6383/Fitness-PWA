import type { Equipment, ExerciseConfig } from "./types";

export const DEFAULT_INCREMENT_KG: Record<Equipment, number> = {
  barbell: 2.5,
  dumbbell: 2.5,
  machine: 5,
  cable: 2.5,
  bodyweight: 2.5, // external load added to bodyweight movements
};

export function incrementFor(config: ExerciseConfig): number {
  return config.incrementKg ?? DEFAULT_INCREMENT_KG[config.equipment];
}

/** Round to the nearest multiple of `inc` (halves round up). */
export function roundToIncrement(value: number, inc: number): number {
  if (inc <= 0) return value;
  return Number((Math.round(value / inc) * inc).toFixed(3));
}

/** Middle of the rep range, rounded up. 8-12 gives 10. */
export function midReps(config: ExerciseConfig): number {
  return config.repMin + Math.ceil((config.repMax - config.repMin) / 2);
}

/** Estimated one-rep max (Epley). Useful for charts, not used for decisions. */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  return Number((weightKg * (1 + reps / 30)).toFixed(1));
}
