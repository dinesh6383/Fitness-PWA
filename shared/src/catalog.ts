import type { Equipment, ExerciseConfig, ExerciseKind } from "./types";

export interface CatalogEntry {
  name: string;
  equipment: Equipment;
  kind: ExerciseKind;
  /**
   * Beginner working weight as a fraction of bodyweight.
   * Dumbbells: per hand. Barbell: total bar load. Machines/cables: stack weight.
   * These are conservative heuristics for the first calibration session only.
   */
  ratio: number;
  repMin: number;
  repMax: number;
  sets: number;
}

const compound = { kind: "compound" as const, repMin: 8, repMax: 12, sets: 3 };
const isolation = { kind: "isolation" as const, repMin: 10, repMax: 15, sets: 3 };

export const CATALOG: Record<string, CatalogEntry> = {
  barbell_bench_press: { name: "Barbell bench press", equipment: "barbell", ratio: 0.5, ...compound },
  incline_barbell_press: { name: "Incline barbell press", equipment: "barbell", ratio: 0.4, ...compound },
  overhead_press: { name: "Overhead press", equipment: "barbell", ratio: 0.3, ...compound },
  barbell_row: { name: "Barbell row", equipment: "barbell", ratio: 0.45, ...compound },
  back_squat: { name: "Back squat", equipment: "barbell", ratio: 0.6, ...compound },
  romanian_deadlift: { name: "Romanian deadlift", equipment: "barbell", ratio: 0.6, ...compound },
  incline_dumbbell_press: { name: "Incline dumbbell press", equipment: "dumbbell", ratio: 0.12, ...compound },
  dumbbell_bench_press: { name: "Dumbbell bench press", equipment: "dumbbell", ratio: 0.14, ...compound },
  dumbbell_shoulder_press: { name: "Dumbbell shoulder press", equipment: "dumbbell", ratio: 0.1, ...compound },
  lat_pulldown: { name: "Lat pulldown", equipment: "cable", ratio: 0.55, ...compound },
  seated_cable_row: { name: "Seated cable row", equipment: "cable", ratio: 0.5, ...compound },
  leg_press: { name: "Leg press", equipment: "machine", ratio: 1.2, ...compound },
  lateral_raise: { name: "Dumbbell lateral raise", equipment: "dumbbell", ratio: 0.04, ...isolation },
  dumbbell_curl: { name: "Dumbbell curl", equipment: "dumbbell", ratio: 0.07, ...isolation },
  triceps_pushdown: { name: "Triceps pushdown", equipment: "cable", ratio: 0.2, ...isolation },
  leg_extension: { name: "Leg extension", equipment: "machine", ratio: 0.4, ...isolation },
  leg_curl: { name: "Leg curl", equipment: "machine", ratio: 0.3, ...isolation },
  pull_up: { name: "Pull-up", equipment: "bodyweight", ratio: 0, kind: "compound", repMin: 6, repMax: 12, sets: 3 },
  push_up: { name: "Push-up", equipment: "bodyweight", ratio: 0, kind: "compound", repMin: 10, repMax: 20, sets: 3 },
  dip: { name: "Dip", equipment: "bodyweight", ratio: 0, kind: "compound", repMin: 6, repMax: 12, sets: 3 },
};

/** Build an ExerciseConfig from a catalog entry, with optional overrides. */
export function createExerciseFromCatalog(
  key: string,
  overrides: Partial<ExerciseConfig> = {},
): ExerciseConfig {
  const entry = CATALOG[key];
  if (!entry) throw new Error(`Unknown catalog exercise: ${key}`);
  return {
    id: key,
    name: entry.name,
    kind: entry.kind,
    equipment: entry.equipment,
    repMin: entry.repMin,
    repMax: entry.repMax,
    targetSets: entry.sets,
    catalogKey: key,
    ...overrides,
  };
}
