import type { ExerciseConfig, SetLog } from "./types";

export interface SessionSummary {
  sessionId: string;
  /** Latest timestamp among the session's sets. */
  loggedAt: number;
  /** The weight most sets were done at (ties go to the heavier weight). */
  weightKg: number;
  /** Working sets done at that weight, ordered by setIndex. */
  sets: SetLog[];
}

export interface SessionEvaluation {
  weightKg: number;
  setCount: number;
  minReps: number;
  avgRpe?: number;
  /** Every planned set reached the top of the rep range. */
  hitTop: boolean;
  /** At least one set fell below the bottom of the rep range. */
  missed: boolean;
  /** A set fell well below the bottom of the range (more than 2 reps). */
  severe: boolean;
}

/** Group logs for one exercise into sessions, newest first. Warm-ups are ignored. */
export function groupSessions(logs: SetLog[]): SessionSummary[] {
  const bySession = new Map<string, SetLog[]>();
  for (const log of logs) {
    if (log.isWarmup) continue;
    const list = bySession.get(log.sessionId);
    if (list) list.push(log);
    else bySession.set(log.sessionId, [log]);
  }

  const summaries: SessionSummary[] = [];
  for (const [sessionId, sets] of bySession) {
    const counts = new Map<number, number>();
    for (const s of sets) counts.set(s.weightKg, (counts.get(s.weightKg) ?? 0) + 1);

    let weightKg = 0;
    let best = -1;
    for (const [w, n] of counts) {
      if (n > best || (n === best && w > weightKg)) {
        best = n;
        weightKg = w;
      }
    }

    summaries.push({
      sessionId,
      loggedAt: Math.max(...sets.map((s) => s.loggedAt)),
      weightKg,
      sets: sets.filter((s) => s.weightKg === weightKg).sort((a, b) => a.setIndex - b.setIndex),
    });
  }
  return summaries.sort((a, b) => b.loggedAt - a.loggedAt);
}

export function evaluateSession(
  session: SessionSummary,
  config: ExerciseConfig,
): SessionEvaluation {
  const reps = session.sets.map((s) => s.reps);
  const rpes = session.sets.map((s) => s.rpe).filter((v): v is number => typeof v === "number");
  const minReps = Math.min(...reps);

  return {
    weightKg: session.weightKg,
    setCount: session.sets.length,
    minReps,
    avgRpe: rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : undefined,
    hitTop: session.sets.length >= config.targetSets && minReps >= config.repMax,
    missed: minReps < config.repMin,
    severe: minReps < config.repMin - 2,
  };
}
