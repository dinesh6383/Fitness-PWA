import { useState } from "react";
import { CATALOG, createExerciseFromCatalog, type Experience, type Goal } from "@fitness/shared";
import { db } from "./db";

const NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const GOALS: [Goal, string][] = [
  ["cut", "Lose weight, build muscle"],
  ["bulk", "Gain weight, build muscle"],
  ["maintain", "Maintain weight, build muscle"],
];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [days, setDays] = useState<number[]>([]);
  const [goal, setGoal] = useState<Goal>("bulk");
  const [bw, setBw] = useState("");
  const [target, setTarget] = useState("");
  const [exp, setExp] = useState<Experience>("intermediate");
  const [returning, setReturning] = useState(false);
  const [names, setNames] = useState<Record<number, string>>({});
  const [plan, setPlan] = useState<Record<number, string[]>>({});

  const valid = [days.length > 0, true, Number(bw) > 0 && Number(target) > 0, days.every((d) => (plan[d]?.length ?? 0) > 0)][step];

  async function finish() {
    await db.transaction("rw", db.profile, db.plan, async () => {
      await db.plan.clear();
      await db.profile.put({
        id: 1, days, dayNames: names, goal, experience: exp, returningAfterBreak: returning,
        bodyWeightKg: Number(bw), targetWeightKg: Number(target),
      });
      for (const d of days) {
        for (const [i, key] of (plan[d] ?? []).entries()) {
          await db.plan.add({ day: d, order: i, exercise: createExerciseFromCatalog(key) });
        }
      }
    });
    onDone();
  }

  const toggle = (d: number) => setDays((x) => (x.includes(d) ? x.filter((i) => i !== d) : [...x, d]));
  const sorted = ORDER.filter((d) => days.includes(d));

  return (
    <main className="mx-auto max-w-md p-4 space-y-4">
      <p className="text-sm text-slate-400">Step {step + 1} of 4</p>

      {step === 0 && (
        <>
          <h1 className="text-xl font-semibold">Which days do you train?</h1>
          <div className="grid grid-cols-4 gap-2">
            {ORDER.map((d) => (
              <button key={d} onClick={() => toggle(d)}
                className={`rounded-lg py-3 border ${days.includes(d) ? "bg-sky-500 text-slate-950 border-sky-500" : "bg-slate-800 border-slate-700"}`}>
                {NAMES[d]}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <h1 className="text-xl font-semibold">What is your goal?</h1>
          {GOALS.map(([g, label]) => (
            <button key={g} onClick={() => setGoal(g)}
              className={`w-full text-left rounded-lg px-4 py-3 border ${goal === g ? "bg-sky-500 text-slate-950 border-sky-500" : "bg-slate-800 border-slate-700"}`}>
              {label}
            </button>
          ))}
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="text-xl font-semibold">About you</h1>
          <label className="block space-y-1"><span className="text-sm text-slate-400">Current weight (kg)</span>
            <input className="in" inputMode="decimal" value={bw} onChange={(e) => setBw(e.target.value)} /></label>
          <label className="block space-y-1"><span className="text-sm text-slate-400">Target weight (kg)</span>
            <input className="in" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} /></label>
          <label className="block space-y-1"><span className="text-sm text-slate-400">Experience</span>
            <select className="in" value={exp} onChange={(e) => setExp(e.target.value as Experience)}>
              <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
            </select></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={returning} onChange={(e) => setReturning(e.target.checked)} />
            <span>Returning after a long break</span></label>
        </>
      )}

      {step === 3 && (
        <>
          <h1 className="text-xl font-semibold">Plan each day</h1>
          {sorted.map((d) => (
            <section key={d} className="rounded-lg border border-slate-700 p-3 space-y-2">
              <h2 className="font-medium">{NAMES[d]}</h2>
              <input className="in" placeholder="Day name, e.g. Push day" value={names[d] ?? ""}
                onChange={(e) => setNames({ ...names, [d]: e.target.value })} />
              <ul className="space-y-1">
                {(plan[d] ?? []).map((k) => (
                  <li key={k} className="flex justify-between rounded bg-slate-800 px-3 py-2">
                    <span>{CATALOG[k]?.name}</span>
                    <button onClick={() => setPlan({ ...plan, [d]: (plan[d] ?? []).filter((x) => x !== k) })} aria-label="Remove">✕</button>
                  </li>
                ))}
              </ul>
              <select className="in" value="" onChange={(e) => e.target.value && !(plan[d] ?? []).includes(e.target.value) && setPlan({ ...plan, [d]: [...(plan[d] ?? []), e.target.value] })}>
                <option value="">Add exercise…</option>
                {Object.entries(CATALOG).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
              </select>
            </section>
          ))}
        </>
      )}

      <div className="flex gap-2">
        {step > 0 && <button className="btn2" onClick={() => setStep(step - 1)}>Back</button>}
        <button className="btn flex-1" disabled={!valid} onClick={() => (step < 3 ? setStep(step + 1) : void finish())}>
          {step < 3 ? "Next" : "Save plan"}
        </button>
      </div>
    </main>
  );
}
