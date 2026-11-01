import { useEffect, useRef, useState } from "react";
import { buildCoachRequest, mergeAiOverride, suggestNextSession, suggestNextSet, type ExerciseConfig, type SetLog, type Suggestion } from "@fitness/shared";
import { askCoach, getCoachConn } from "./coach";
import { db, type PlanRow, type ProfileRow } from "./db";

interface Props { profile: ProfileRow; plan: PlanRow[]; onExit: () => void }

export default function Workout({ profile, plan, onExit }: Props) {
  const sessionId = useRef(`${new Date().toISOString().slice(0, 10)}-${Date.now()}`).current;
  const [base, setBase] = useState<Record<string, Suggestion>>();
  const [coached, setCoached] = useState<Record<string, { suggestion: Suggestion; message?: string }>>({});
  const [status, setStatus] = useState<"off" | "thinking" | "ok" | "failed">("off");
  const [note, setNote] = useState("");
  const history = useRef<Record<string, SetLog[]>>({});
  const [today, setToday] = useState<SetLog[]>([]);

  async function runCoach(b: Record<string, Suggestion>, n?: string) {
    const conn = await getCoachConn();
    if (!conn) return setStatus("off");
    setStatus("thinking");
    const results = await Promise.all(
      plan.map(async ({ exercise: ex }) => {
        const s = b[ex.id];
        if (!s || s.needsInput) return null;
        const raw = await askCoach(conn, buildCoachRequest(ex, s, history.current[ex.id] ?? [], profile, n));
        if (raw === null) return null;
        const m = mergeAiOverride(s, ex, raw);
        return m.usedAi ? ([ex.id, { suggestion: m.suggestion, message: m.coachMessage }] as const) : null;
      }),
    );
    const ok = results.filter((r): r is NonNullable<typeof r> => r !== null);
    setCoached(Object.fromEntries(ok));
    setStatus(ok.length ? "ok" : "failed");
  }

  useEffect(() => {
    let lock: WakeLockSentinel | undefined;
    void navigator.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    void (async () => {
      const out: Record<string, Suggestion> = {};
      for (const p of plan) {
        const h = await db.sets.where("exerciseId").equals(p.exercise.id).toArray();
        history.current[p.exercise.id] = h;
        out[p.exercise.id] = suggestNextSession(p.exercise, h, profile);
      }
      setBase(out);
      void runCoach(out);
    })();
    return () => void lock?.release();
  }, []);

  async function log(cfg: ExerciseConfig, weightKg: number, reps: number, rpe?: number) {
    const done = today.filter((s) => s.exerciseId === cfg.id);
    const row: SetLog = { exerciseId: cfg.id, sessionId, setIndex: done.length, weightKg, reps, rpe, loggedAt: Date.now() };
    await db.sets.add(row);
    setToday([...today, row]);
  }

  if (!base) return <main className="p-4 text-slate-400">Loading suggestions…</main>;

  return (
    <main className="mx-auto max-w-md p-4 space-y-4">
      <div className="rounded-lg border border-slate-700 p-3 space-y-2">
        <p className="text-sm text-slate-400">
          {{ off: "AI coach off. Using built-in rules.", thinking: "Coach is thinking…", ok: "Coach adjusted today's plan.", failed: "Coach unavailable. Using built-in rules." }[status]}
        </p>
        {status !== "off" && (
          <>
            <input className="in" placeholder="How do you feel? e.g. slept badly, shoulder tight" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="btn2 w-full" disabled={status === "thinking"} onClick={() => void runCoach(base, note)}>Ask coach again</button>
          </>
        )}
      </div>
      {plan.map((p) => {
        const s = coached[p.exercise.id]?.suggestion ?? base[p.exercise.id];
        return s && (
          <Card key={p.id} cfg={p.exercise} planned={s} message={coached[p.exercise.id]?.message} done={today.filter((x) => x.exerciseId === p.exercise.id)} onLog={(w, r, rpe) => log(p.exercise, w, r, rpe)} />
        );
      })}
      <button className="btn w-full" onClick={onExit}>Finish workout</button>
    </main>
  );
}

function Card({ cfg, planned, message, done, onLog }: { cfg: ExerciseConfig; planned: Suggestion; message?: string; done: SetLog[]; onLog: (w: number, r: number, rpe?: number) => Promise<void> }) {
  const next = suggestNextSet(cfg, planned, done);
  const [w, setW] = useState("");
  const [r, setR] = useState("");
  const [rpe, setRpe] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setW(planned.needsInput && done.length === 0 ? "" : String(next.weightKg));
    setR(String(next.reps));
    setRpe("");
  }, [done.length]);

  async function submit() {
    const weight = Number(w), reps = Number(r);
    if (w === "" || !(weight >= 0) || !(reps > 0)) return setError("Enter weight and reps");
    setError("");
    await onLog(weight, reps, rpe ? Math.min(10, Math.max(1, Number(rpe))) : undefined);
  }

  return (
    <section className="rounded-xl border border-slate-700 p-3 space-y-2">
      <div className="flex justify-between">
        <h2 className="font-medium">{cfg.name}</h2>
        <span className="text-sm text-slate-400">{done.length}/{planned.sets} sets</span>
      </div>
      <p className="text-sm text-sky-300">Suggested: {planned.weightKg} kg × {planned.reps} reps</p>
      <p className="text-sm text-slate-400">{next.note ?? planned.rationale}</p>
      {message && <p className="text-sm text-emerald-300">Coach: {message}</p>}
      {done.map((s) => (
        <p key={s.setIndex} className="text-sm text-slate-300">Set {s.setIndex + 1}: {s.weightKg} kg × {s.reps}{s.rpe ? ` @ RPE ${s.rpe}` : ""}</p>
      ))}
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs text-slate-400">kg<input className="in" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} /></label>
        <label className="text-xs text-slate-400">Reps<input className="in" inputMode="numeric" value={r} onChange={(e) => setR(e.target.value)} /></label>
        <label className="text-xs text-slate-400">RPE (1-10)<input className="in" inputMode="decimal" value={rpe} onChange={(e) => setRpe(e.target.value)} /></label>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button className="btn w-full" onClick={() => void submit()}>Log set</button>
    </section>
  );
}
