import type { ExerciseConfig, SetLog, Suggestion } from "./types";
import { incrementFor, roundToIncrement } from "./units";

export interface NextSetPlan {
  weightKg: number;
  reps: number;
  /** Short note to show when the plan changed mid-session. */
  note?: string;
}

/**
 * Adjust the next set based on how the sets so far today went.
 * Only reacts to clear signals, so the plan does not wobble set to set.
 */
export function suggestNextSet(
  config: ExerciseConfig,
  planned: Suggestion,
  doneToday: SetLog[],
): NextSetPlan {
  const working = doneToday.filter((s) => !s.isWarmup);
  const last = working[working.length - 1];
  const unchanged: NextSetPlan = { weightKg: planned.weightKg, reps: planned.reps };
  if (!last) return unchanged;

  const inc = incrementFor(config);

  const struggled =
    last.reps < planned.reps - 2 || (last.rpe !== undefined && last.rpe >= 10 && last.reps < planned.reps);
  if (struggled) {
    return {
      weightKg: Math.max(0, roundToIncrement(last.weightKg - inc, inc)),
      reps: Math.max(config.repMin, planned.reps),
      note: `That set was tough. Dropping ${inc} kg for the next one.`,
    };
  }

  const tooLight =
    working.length === 1 && last.rpe !== undefined && last.rpe <= 6 && last.reps >= planned.reps + 2;
  if (tooLight) {
    return {
      weightKg: roundToIncrement(last.weightKg + inc, inc),
      reps: planned.reps,
      note: `That felt light. Adding ${inc} kg for the next set.`,
    };
  }

  return { weightKg: last.weightKg, reps: planned.reps };
}
