import { describe, expect, it } from "vitest";
import { createExerciseFromCatalog, suggestNextSet, suggestNextSession } from "../src";
import { T0, profile, session } from "./helpers";

const incline = createExerciseFromCatalog("incline_dumbbell_press");
const planned = suggestNextSession(incline, [], profile, T0);

describe("next set within a session", () => {
  it("keeps the plan before any set is logged", () => {
    expect(suggestNextSet(incline, planned, [])).toEqual({ weightKg: 12.5, reps: 12 });
  });

  it("drops weight after a clearly failed first set", () => {
    const done = session(incline.id, "t", 12.5, [8], 10, T0);
    const next = suggestNextSet(incline, planned, done);
    expect(next.weightKg).toBe(10);
    expect(next.note).toBeDefined();
  });

  it("raises weight when the first set was far too light", () => {
    const done = session(incline.id, "t", 12.5, [14], 6, T0);
    expect(suggestNextSet(incline, planned, done).weightKg).toBe(15);
  });

  it("does not raise weight from the second set onward", () => {
    const done = session(incline.id, "t", 12.5, [12, 14], [8, 6], T0);
    expect(suggestNextSet(incline, planned, done).weightKg).toBe(12.5);
  });

  it("leaves a normal set alone", () => {
    const done = session(incline.id, "t", 12.5, [12], 8, T0);
    expect(suggestNextSet(incline, planned, done)).toEqual({ weightKg: 12.5, reps: 12 });
  });

  it("needs RPE before calling a set too light", () => {
    const done = session(incline.id, "t", 12.5, [14], undefined, T0);
    expect(suggestNextSet(incline, planned, done).weightKg).toBe(12.5);
  });
});
