import { describe, expect, it } from "vitest";
import { createExerciseFromCatalog, mergeAiOverride, suggestNextSession } from "../src";
import { T0, profile } from "./helpers";

const incline = createExerciseFromCatalog("incline_dumbbell_press");
const base = suggestNextSession(incline, [], profile, T0); // 12.5 x 12, 3 sets

describe("AI guardrails", () => {
  it("applies a valid, in-bounds override", () => {
    const r = mergeAiOverride(base, incline, { weightKg: 10, reps: 10, message: "Go lighter, shoulder is tight." });
    expect(r.usedAi).toBe(true);
    expect(r.suggestion.weightKg).toBe(10);
    expect(r.suggestion.reps).toBe(10);
    expect(r.coachMessage).toContain("lighter");
    expect(r.adjustments).toEqual([]);
  });

  it("caps an unsafe weight jump", () => {
    const r = mergeAiOverride(base, incline, { weightKg: 40, reps: 10, message: "Go heavy." });
    expect(r.suggestion.weightKg).toBe(15);
    expect(r.adjustments.length).toBe(1);
  });

  it("limits how far the AI can lower the weight", () => {
    const r = mergeAiOverride(base, incline, { weightKg: 2, reps: 10, message: "Very light." });
    expect(r.suggestion.weightKg).toBe(10);
  });

  it("clamps reps and sets", () => {
    const r = mergeAiOverride(base, incline, { weightKg: 12.5, reps: 30, sets: 9, message: "Volume day." });
    expect(r.suggestion.reps).toBe(12);
    expect(r.suggestion.sets).toBe(4);
  });

  it("rounds weights to plates that exist", () => {
    const r = mergeAiOverride(base, incline, { weightKg: 11.2, reps: 10, message: "Slightly lighter." });
    expect(r.suggestion.weightKg).toBe(10);
  });

  it.each([
    ["a string", "go heavier"],
    ["null", null],
    ["missing message", { weightKg: 12.5, reps: 10 }],
    ["negative weight", { weightKg: -5, reps: 10, message: "x" }],
    ["fractional reps", { weightKg: 12.5, reps: 9.5, message: "x" }],
  ])("falls back to the engine for invalid output (%s)", (_label, raw) => {
    const r = mergeAiOverride(base, incline, raw);
    expect(r.usedAi).toBe(false);
    expect(r.suggestion).toEqual(base);
    expect(r.coachMessage).toBeUndefined();
  });
});
