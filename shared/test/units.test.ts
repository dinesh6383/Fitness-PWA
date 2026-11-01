import { describe, expect, it } from "vitest";
import { createExerciseFromCatalog, estimateOneRepMax, midReps, roundToIncrement } from "../src";

describe("units", () => {
  it("rounds to the nearest increment", () => {
    expect(roundToIncrement(11.475, 2.5)).toBe(12.5);
    expect(roundToIncrement(11.2, 2.5)).toBe(10);
    expect(roundToIncrement(26, 5)).toBe(25);
  });

  it("finds the middle of the rep range", () => {
    expect(midReps(createExerciseFromCatalog("incline_dumbbell_press"))).toBe(10);
    expect(midReps(createExerciseFromCatalog("lateral_raise"))).toBe(13);
  });

  it("estimates a one-rep max", () => {
    expect(estimateOneRepMax(100, 5)).toBe(116.7);
  });

  it("rejects unknown catalog keys", () => {
    expect(() => createExerciseFromCatalog("nope")).toThrow();
  });
});
