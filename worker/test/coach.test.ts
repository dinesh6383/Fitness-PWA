import { afterEach, describe, expect, it, vi } from "vitest";
import { buildCoachRequest, createExerciseFromCatalog, suggestNextSession } from "@fitness/shared";
import app from "../src/index";

const env = { ANTHROPIC_API_KEY: "sk-test-key-123", APP_TOKEN: "secret", ALLOWED_ORIGIN: "http://localhost:5173", MODEL: "m" };
const cfg = createExerciseFromCatalog("incline_dumbbell_press");
const profile = { bodyWeightKg: 75, experience: "intermediate", goal: "bulk", returningAfterBreak: true } as const;
const validBody = JSON.stringify(buildCoachRequest(cfg, suggestNextSession(cfg, [], profile, 0), [], profile, "shoulder tight"));

const post = (body: string, token = "secret") =>
  app.request("/coach", { method: "POST", body, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }, env);

const mockModel = (text: string, ok = true) =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ content: [{ type: "text", text }] }), { status: ok ? 200 : 500 })));

afterEach(() => vi.unstubAllGlobals());

describe("POST /coach", () => {
  it("rejects a wrong token", async () => {
    expect((await post(validBody, "nope")).status).toBe(401);
  });

  it("rejects malformed and invalid bodies", async () => {
    expect((await post("{bad")).status).toBe(400);
    expect((await post("{}")).status).toBe(400);
  });

  it("returns the validated coach reply", async () => {
    mockModel('```json\n{"weightKg":10,"reps":10,"message":"Go lighter today."}\n```');
    const res = await post(validBody);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ weightKg: 10, reps: 10, message: "Go lighter today." });
  });

  it("never sends the API key back to the client", async () => {
    mockModel('{"weightKg":10,"reps":10,"message":"ok"}');
    expect(await (await post(validBody)).text()).not.toContain("sk-test-key-123");
  });

  it("returns 502 when the model output is unusable", async () => {
    mockModel("I think you should lift heavier!");
    expect((await post(validBody)).status).toBe(502);
  });

  it("returns 502 when the upstream call fails", async () => {
    mockModel("", false);
    expect((await post(validBody)).status).toBe(502);
  });
});
