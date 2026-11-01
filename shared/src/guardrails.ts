import { z } from "zod";
import type { ExerciseConfig, Suggestion } from "./types";
import { incrementFor, roundToIncrement } from "./units";

/** What the AI coach is allowed to send back. Anything else is rejected. */
export const AiOverrideSchema = z.object({
  weightKg: z.number().nonnegative(),
  reps: z.number().int().positive(),
  sets: z.number().int().positive().optional(),
  message: z.string().min(1).max(280),
});
export type AiOverride = z.infer<typeof AiOverrideSchema>;

export const GUARDRAILS = {
  /** AI may raise the engine's weight by at most max(one increment, this fraction). */
  maxIncreasePct: 0.05,
  /** AI may lower the engine's weight by at most this fraction. */
  maxDecreasePct: 0.15,
  /** AI may change the set count by at most this many. */
  maxSetsDelta: 1,
} as const;

export interface GuardedResult {
  suggestion: Suggestion;
  coachMessage?: string;
  /** What was clamped, for debugging and logs. */
  adjustments: string[];
  /** True when AI output was valid and (possibly clamped) applied. */
  usedAi: boolean;
}

/**
 * Apply an AI suggestion on top of the engine's, but only within safe bounds.
 * Invalid output falls back to the engine's suggestion untouched.
 */
export function mergeAiOverride(
  base: Suggestion,
  config: ExerciseConfig,
  aiRaw: unknown,
): GuardedResult {
  const parsed = AiOverrideSchema.safeParse(aiRaw);
  if (!parsed.success) {
    return { suggestion: base, adjustments: ["AI output invalid, using engine suggestion"], usedAi: false };
  }

  const ai = parsed.data;
  const inc = incrementFor(config);
  const adjustments: string[] = [];

  const lo = roundToIncrement(base.weightKg * (1 - GUARDRAILS.maxDecreasePct), inc);
  const hi = roundToIncrement(base.weightKg + Math.max(inc, base.weightKg * GUARDRAILS.maxIncreasePct), inc);
  let weight = roundToIncrement(ai.weightKg, inc);
  if (weight < lo) {
    weight = lo;
    adjustments.push(`weight raised to ${lo} kg (lower limit)`);
  } else if (weight > hi) {
    weight = hi;
    adjustments.push(`weight capped at ${hi} kg (upper limit)`);
  }

  let reps = ai.reps;
  if (reps < config.repMin || reps > config.repMax) {
    reps = Math.min(config.repMax, Math.max(config.repMin, reps));
    adjustments.push(`reps clamped to ${reps}`);
  }

  let sets = ai.sets ?? base.sets;
  const minSets = Math.max(1, base.sets - GUARDRAILS.maxSetsDelta);
  const maxSets = base.sets + GUARDRAILS.maxSetsDelta;
  if (sets < minSets || sets > maxSets) {
    sets = Math.min(maxSets, Math.max(minSets, sets));
    adjustments.push(`sets clamped to ${sets}`);
  }

  return {
    suggestion: { ...base, weightKg: weight, reps, sets },
    coachMessage: ai.message,
    adjustments,
    usedAi: true,
  };
}
