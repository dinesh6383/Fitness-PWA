import "fake-indexeddb/auto";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createExerciseFromCatalog } from "@fitness/shared";
import App from "../src/App";
import { db } from "../src/db";

afterEach(cleanup);

describe("first run", () => {
  it("shows onboarding when no profile exists yet", async () => {
    render(<App />);
    expect(await screen.findByText("Which days do you train?", {}, { timeout: 3000 })).toBeTruthy();
  });

  it("shows today's workout once a plan is saved", async () => {
    const today = new Date().getDay();
    await db.profile.put({
      id: 1, days: [0, 1, 2, 3, 4, 5, 6], dayNames: { [today]: "Push day" }, goal: "bulk",
      experience: "intermediate", returningAfterBreak: true, bodyWeightKg: 75, targetWeightKg: 80,
    });
    await db.plan.add({ day: today, order: 0, exercise: createExerciseFromCatalog("incline_dumbbell_press") });
    render(<App />);
    expect(await screen.findByText("Start today's workout", {}, { timeout: 3000 })).toBeTruthy();
    expect(screen.getByText("Incline dumbbell press")).toBeTruthy();
  });
});
