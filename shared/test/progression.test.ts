import { describe, expect, it } from "vitest";
import { createExerciseFromCatalog, suggestNextSession } from "../src";
import { DAY, T0, profile, session } from "./helpers";

const incline = createExerciseFromCatalog("incline_dumbbell_press"); // 8-12 reps, 3 sets, 2.5 kg steps
const ID = incline.id;
const now = T0 + 2 * DAY;

describe("cold start", () => {
  it("suggests a conservative calibration load for a returning intermediate", () => {
    const s = suggestNextSession(incline, [], profile, now);
    expect(s.weightKg).toBe(12.5);
    expect(s.reps).toBe(12);
    expect(s.sets).toBe(3);
    expect(s.action).toBe("cold_start");
    expect(s.isCalibration).toBe(true);
  });

  it("asks for input when the exercise has no catalog estimate", () => {
    const custom = { ...incline, id: "custom", catalogKey: undefined };
    const s = suggestNextSession(custom, [], profile, now);
    expect(s.needsInput).toBe(true);
    expect(s.weightKg).toBe(0);
  });

  it("uses a known starting weight over the estimate", () => {
    const s = suggestNextSession({ ...incline, startingWeightKg: 20 }, [], profile, now);
    expect(s.weightKg).toBe(20);
  });

  it("starts bodyweight movements at zero added load", () => {
    const s = suggestNextSession(createExerciseFromCatalog("pull_up"), [], profile, now);
    expect(s.weightKg).toBe(0);
  });
});

describe("progression", () => {
  it("adds weight and resets reps after hitting the top (12.5 x 12 -> 15 x 10)", () => {
    const h = session(ID, "s1", 12.5, [12, 12, 12], 8, T0);
    const s = suggestNextSession(incline, h, profile, now);
    expect(s.action).toBe("progress_weight");
    expect(s.weightKg).toBe(15);
    expect(s.reps).toBe(10);
  });

  it("makes a double jump when every set felt very easy", () => {
    const h = session(ID, "s1", 12.5, [12, 12, 12], 6.5, T0);
    expect(suggestNextSession(incline, h, profile, now).weightKg).toBe(17.5);
  });

  it("never double jumps on a cut", () => {
    const h = session(ID, "s1", 12.5, [12, 12, 12], 6.5, T0);
    const s = suggestNextSession(incline, h, { ...profile, goal: "cut" }, now);
    expect(s.weightKg).toBe(15);
  });

  it("holds the weight and adds a rep when the range is not yet topped", () => {
    const h = session(ID, "s1", 12.5, [12, 11, 10], 8, T0);
    const s = suggestNextSession(incline, h, profile, now);
    expect(s.action).toBe("progress_reps");
    expect(s.weightKg).toBe(12.5);
    expect(s.reps).toBe(11);
  });

  it("consolidates when the top reps were a grind", () => {
    const h = session(ID, "s1", 12.5, [12, 12, 12], 10, T0);
    const s = suggestNextSession(incline, h, profile, now);
    expect(s.action).toBe("consolidate");
    expect(s.weightKg).toBe(12.5);
  });

  it("is stricter about RPE on a cut", () => {
    const h = session(ID, "s1", 12.5, [12, 12, 12], 9.25, T0);
    expect(suggestNextSession(incline, h, profile, now).action).toBe("progress_weight");
    expect(suggestNextSession(incline, h, { ...profile, goal: "cut" }, now).action).toBe("consolidate");
  });

  it("does not progress weight if fewer sets than planned were done", () => {
    const h = session(ID, "s1", 12.5, [12, 12], 8, T0);
    const s = suggestNextSession(incline, h, profile, now);
    expect(s.action).toBe("hold");
    expect(s.weightKg).toBe(12.5);
  });

  it("works without RPE data", () => {
    const h = session(ID, "s1", 12.5, [12, 12, 12], undefined, T0);
    expect(suggestNextSession(incline, h, profile, now).weightKg).toBe(15);
  });

  it("uses the latest session even when history is unsorted", () => {
    const old = session(ID, "s1", 10, [12, 12, 12], 8, T0 - 7 * DAY);
    const recent = session(ID, "s2", 12.5, [10, 10, 10], 8, T0);
    const s = suggestNextSession(incline, [...recent, ...old], profile, now);
    expect(s.weightKg).toBe(12.5);
    expect(s.reps).toBe(11);
  });

  it("ignores warm-up sets", () => {
    const warm = session(ID, "s1", 5, [15], undefined, T0 - 1000).map((l) => ({ ...l, isWarmup: true }));
    const work = session(ID, "s1", 12.5, [12, 12, 12], 8, T0);
    expect(suggestNextSession(incline, [...warm, ...work], profile, now).weightKg).toBe(15);
  });
});

describe("falling short", () => {
  it("holds the weight after a small miss", () => {
    const h = session(ID, "s1", 12.5, [12, 9, 7], 9, T0);
    const s = suggestNextSession(incline, h, profile, now);
    expect(s.action).toBe("hold");
    expect(s.weightKg).toBe(12.5);
    expect(s.reps).toBe(8);
  });

  it("reduces the weight after a big miss", () => {
    const h = session(ID, "s1", 12.5, [10, 6, 5], 10, T0);
    const s = suggestNextSession(incline, h, profile, now);
    expect(s.action).toBe("reduce");
    expect(s.weightKg).toBe(10);
    expect(s.reps).toBe(10);
  });

  it("deloads after two missed sessions at the same weight", () => {
    const a = session(ID, "s1", 15, [9, 7, 7], 9, T0 - 3 * DAY);
    const b = session(ID, "s2", 15, [9, 7, 7], 9.5, T0);
    const s = suggestNextSession(incline, [...a, ...b], profile, now);
    expect(s.action).toBe("deload");
    expect(s.weightKg).toBe(12.5);
  });

  it("does not deload if the earlier miss was at a different weight", () => {
    const a = session(ID, "s1", 12.5, [9, 7, 7], 9, T0 - 3 * DAY);
    const b = session(ID, "s2", 15, [9, 7, 7], 9.5, T0);
    expect(suggestNextSession(incline, [...a, ...b], profile, now).action).toBe("hold");
  });
});

describe("returning after a gap", () => {
  const h = session(ID, "s1", 20, [12, 12, 12], 8, T0);

  it("leaves the weight alone under two weeks", () => {
    expect(suggestNextSession(incline, h, profile, T0 + 10 * DAY).action).toBe("progress_weight");
  });

  it("cuts the weight after a month away", () => {
    const s = suggestNextSession(incline, h, profile, T0 + 30 * DAY);
    expect(s.action).toBe("return_from_break");
    expect(s.weightKg).toBe(17.5);
  });

  it("never cuts less than one increment, even after two months", () => {
    const s = suggestNextSession(incline, h, profile, T0 + 60 * DAY);
    expect(s.weightKg).toBe(17.5);
  });
});
