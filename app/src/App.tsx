import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import Onboarding from "./Onboarding";
import Workout from "./Workout";
import CoachSettings from "./CoachSettings";

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function App() {
  // null = no profile saved yet. undefined is reserved for "still loading".
  const profile = useLiveQuery(async () => (await db.profile.get(1)) ?? null, []);
  const [running, setRunning] = useState(false);
  const [editing, setEditing] = useState(false);
  const today = new Date().getDay();
  const plan = useLiveQuery(
    () => db.plan.where("day").equals(today).sortBy("order"),
    [today],
  );

  if (profile === undefined || plan === undefined) return <main className="p-4 text-slate-400">Loading…</main>;
  if (!profile || editing) return <Onboarding onDone={() => setEditing(false)} />;

  if (running) return <Workout profile={profile} plan={plan} onExit={() => setRunning(false)} />;

  const scheduled = profile.days.includes(today);
  return (
    <main className="mx-auto max-w-md p-4 space-y-4">
      <h1 className="text-2xl font-semibold">{DAY_NAMES[today]}</h1>
      {scheduled ? (
        <>
          <p className="text-slate-400">{profile.dayNames[today] || "Workout"}</p>
          <ul className="space-y-1">
            {plan.map((p) => (
              <li key={p.id} className="rounded-lg bg-slate-800 px-3 py-2">{p.exercise.name}</li>
            ))}
          </ul>
          <button className="btn w-full" onClick={() => setRunning(true)}>Start today's workout</button>
        </>
      ) : (
        <p className="text-slate-400">Rest day. Your training days: {profile.days.map((d) => DAY_NAMES[d]?.slice(0, 3)).join(", ")}.</p>
      )}
      <button className="btn2 w-full" onClick={() => setEditing(true)}>Edit plan</button>
      <CoachSettings />
    </main>
  );
}
