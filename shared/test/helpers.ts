import type { SetLog, UserProfile } from "../src";

export const DAY = 86_400_000;
export const T0 = Date.UTC(2026, 0, 5);

export const profile: UserProfile = {
  bodyWeightKg: 75,
  experience: "intermediate",
  goal: "bulk",
  returningAfterBreak: true,
};

/** Build the sets of one session. */
export function session(
  exerciseId: string,
  sessionId: string,
  weightKg: number,
  reps: number[],
  rpe: number | number[] | undefined,
  loggedAt: number,
): SetLog[] {
  return reps.map((r, i) => ({
    exerciseId,
    sessionId,
    setIndex: i,
    weightKg,
    reps: r,
    rpe: Array.isArray(rpe) ? rpe[i] : rpe,
    loggedAt: loggedAt + i * 60_000,
  }));
}
