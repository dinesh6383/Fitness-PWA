import { estimateStartingWeight } from "./startingLoad";
import { evaluateSession, groupSessions } from "./sessions";
import type { ExerciseConfig, SetLog, Suggestion, UserProfile } from "./types";
import { incrementFor, midReps, roundToIncrement } from "./units";

const DAY_MS = 86_400_000;

/** Tunable thresholds. Kept in one place so the rules are easy to adjust. */
export const RULES = {
  /** Long breaks cut the load: [minimum days away, fraction removed], checked in order. */
  gapCuts: [
    { days: 56, cut: 0.15 },
    { days: 28, cut: 0.1 },
    { days: 14, cut: 0.05 },
  ],
  severeMissCut: 0.05,
  deloadCut: 0.1,
  /** Average RPE above this blocks a weight increase (cut phase is stricter). */
  maxRpeForIncrease: { cut: 9, other: 9.5 },
  /** Average RPE at or below this allows a double jump (never on a cut). */
  veryEasyRpe: 7,
} as const;

/** Reduce a weight by at least one increment, never below zero. */
function reduceBy(weightKg: number, amountKg: number, inc: number): number {
  if (weightKg <= 0) return 0;
  const target = roundToIncrement(weightKg - Math.max(amountKg, inc), inc);
  return Math.max(0, target < weightKg ? target : weightKg - inc);
}

function coldStart(config: ExerciseConfig, profile: UserProfile): Suggestion {
  const weight = estimateStartingWeight(config, profile);
  if (weight === null) {
    return {
      exerciseId: config.id,
      weightKg: 0,
      reps: config.repMax,
      sets: config.targetSets,
      action: "cold_start",
      isCalibration: true,
      needsInput: true,
      rationale: `No starting estimate for ${config.name}. Enter a weight you can do for ${config.repMax} clean reps.`,
    };
  }
  return {
    exerciseId: config.id,
    weightKg: weight,
    reps: config.repMax,
    sets: config.targetSets,
    action: "cold_start",
    isCalibration: true,
    rationale: profile.returningAfterBreak
      ? `First session for ${config.name}. Starting conservatively because you are returning after a break. This session calibrates your working weight.`
      : `First session for ${config.name}. This session calibrates your working weight.`,
  };
}

/**
 * Decide what to do next time this exercise comes up (double progression).
 * Pure function: the same inputs always give the same output.
 */
export function suggestNextSession(
  config: ExerciseConfig,
  history: SetLog[],
  profile: UserProfile,
  now: number = Date.now(),
): Suggestion {
  const sessions = groupSessions(history.filter((l) => l.exerciseId === config.id));
  const latest = sessions[0];
  if (!latest) return coldStart(config, profile);

  const inc = incrementFor(config);
  const last = evaluateSession(latest, config);
  const prev = sessions[1] ? evaluateSession(sessions[1], config) : undefined;
  const w = last.weightKg;
  const mid = midReps(config);
  const base = { exerciseId: config.id, sets: config.targetSets, isCalibration: false };

  const gapDays = (now - latest.loggedAt) / DAY_MS;
  const gap = RULES.gapCuts.find((g) => gapDays >= g.days);
  if (gap) {
    return {
      ...base,
      weightKg: reduceBy(w, w * gap.cut, inc),
      reps: mid,
      action: "return_from_break",
      rationale: `It has been ${Math.floor(gapDays)} days since your last ${config.name}. Reducing the weight to ease back in.`,
    };
  }

  if (last.severe) {
    return {
      ...base,
      weightKg: reduceBy(w, w * RULES.severeMissCut, inc),
      reps: mid,
      action: "reduce",
      rationale: `You got ${last.minReps} reps, well under the ${config.repMin}-${config.repMax} range. Dropping the weight so you can build reps cleanly.`,
    };
  }

  if (last.missed && prev?.missed && prev.weightKg === last.weightKg) {
    return {
      ...base,
      weightKg: reduceBy(w, w * RULES.deloadCut, inc),
      reps: mid,
      action: "deload",
      rationale: `Two sessions in a row fell short at ${w} kg. A small deload will let you rebuild.`,
    };
  }

  if (last.missed) {
    return {
      ...base,
      weightKg: w,
      reps: config.repMin,
      action: "hold",
      rationale: `You fell just under ${config.repMin} reps on a set. Same weight again, aiming for ${config.repMin} on every set.`,
    };
  }

  if (last.hitTop) {
    const limit = profile.goal === "cut" ? RULES.maxRpeForIncrease.cut : RULES.maxRpeForIncrease.other;
    if (last.avgRpe !== undefined && last.avgRpe > limit) {
      return {
        ...base,
        weightKg: w,
        reps: config.repMax,
        action: "consolidate",
        rationale: `You hit ${config.repMax} reps but it was a grind (RPE ${last.avgRpe.toFixed(1)}). Repeat the weight until it feels smoother.`,
      };
    }
    const veryEasy =
      last.avgRpe !== undefined &&
      last.avgRpe <= RULES.veryEasyRpe &&
      profile.goal !== "cut";
    const steps = veryEasy ? 2 : 1;
    return {
      ...base,
      weightKg: roundToIncrement(w + steps * inc, inc),
      reps: mid,
      action: "progress_weight",
      rationale: veryEasy
        ? `Every set hit ${config.repMax} reps and felt easy. Jumping ${steps * inc} kg.`
        : `Every set hit ${config.repMax} reps. Adding ${inc} kg and resetting to ${mid} reps.`,
    };
  }

  if (last.minReps >= config.repMax) {
    return {
      ...base,
      weightKg: w,
      reps: config.repMax,
      action: "hold",
      rationale: `Reps were strong but you did fewer than ${config.targetSets} sets. Complete all sets at ${w} kg to earn the increase.`,
    };
  }

  const target = Math.min(config.repMax, last.minReps + 1);
  return {
    ...base,
    weightKg: w,
    reps: target,
    action: "progress_reps",
    rationale: `Your weakest set was ${last.minReps} reps. Same weight, aiming for ${target} on every set.`,
  };
}
