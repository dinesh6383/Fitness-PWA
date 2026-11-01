import { CATALOG } from "./catalog";
import type { Experience, ExerciseConfig, UserProfile } from "./types";
import { incrementFor, roundToIncrement } from "./units";

export const EXPERIENCE_MULTIPLIER: Record<Experience, number> = {
  beginner: 1,
  intermediate: 1.5,
  advanced: 2,
};

/** Applied when the user is restarting after a long break. */
export const RETURNING_FACTOR = 0.85;

/**
 * Estimate a safe first working weight.
 * Returns null when there is nothing to base it on, so the app asks the user.
 */
export function estimateStartingWeight(
  config: ExerciseConfig,
  profile: UserProfile,
): number | null {
  if (config.startingWeightKg !== undefined) return config.startingWeightKg;
  if (config.equipment === "bodyweight") return 0;

  const entry = config.catalogKey ? CATALOG[config.catalogKey] : undefined;
  if (!entry) return null;

  const raw =
    entry.ratio *
    profile.bodyWeightKg *
    EXPERIENCE_MULTIPLIER[profile.experience] *
    (profile.returningAfterBreak ? RETURNING_FACTOR : 1);

  const inc = incrementFor(config);
  return Math.max(inc, roundToIncrement(raw, inc));
}
