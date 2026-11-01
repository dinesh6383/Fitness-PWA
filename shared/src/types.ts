export type Experience = "beginner" | "intermediate" | "advanced";
export type Goal = "cut" | "bulk" | "maintain";
export type Equipment = "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight";
export type ExerciseKind = "compound" | "isolation";

export interface UserProfile {
  bodyWeightKg: number;
  experience: Experience;
  goal: Goal;
  /** True when the user is restarting after a long break (lowers cold-start loads). */
  returningAfterBreak: boolean;
}

export interface ExerciseConfig {
  id: string;
  name: string;
  kind: ExerciseKind;
  equipment: Equipment;
  /** Bottom and top of the rep range used for double progression. */
  repMin: number;
  repMax: number;
  targetSets: number;
  /** Smallest realistic weight jump in kg. Defaults by equipment. */
  incrementKg?: number;
  /** Key into the starting-load catalog. */
  catalogKey?: string;
  /** If the user already knows their starting weight, it wins over the estimate. */
  startingWeightKg?: number;
}

export interface SetLog {
  exerciseId: string;
  sessionId: string;
  setIndex: number;
  /** For dumbbells this is the weight per hand. */
  weightKg: number;
  reps: number;
  /** Rate of perceived exertion, 1-10 (10 = no reps left). */
  rpe?: number;
  isWarmup?: boolean;
  /** Epoch milliseconds. */
  loggedAt: number;
}

export type SuggestionAction =
  | "cold_start"
  | "progress_weight"
  | "progress_reps"
  | "hold"
  | "consolidate"
  | "reduce"
  | "deload"
  | "return_from_break";

export interface Suggestion {
  exerciseId: string;
  weightKg: number;
  reps: number;
  sets: number;
  action: SuggestionAction;
  /** Plain-English reason, shown in the app and passed to the AI coach. */
  rationale: string;
  /** First-ever session for this exercise: treat it as calibration. */
  isCalibration: boolean;
  /** True when no starting estimate exists and the user must enter a weight. */
  needsInput?: boolean;
}
