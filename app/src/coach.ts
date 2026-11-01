import { db } from "./db";

export interface CoachConn { url: string; token: string }

export async function getCoachConn(): Promise<CoachConn | null> {
  const [u, t] = await Promise.all([db.settings.get("coachUrl"), db.settings.get("coachToken")]);
  if (!u?.value || !t?.value) return null;
  return { url: u.value.replace(/\/+$/, ""), token: t.value };
}

/** Ask the proxy for a coaching adjustment. Returns null on any failure so the app falls back to the rules engine. */
export async function askCoach(conn: CoachConn, body: unknown): Promise<unknown | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(`${conn.url}/coach`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${conn.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
