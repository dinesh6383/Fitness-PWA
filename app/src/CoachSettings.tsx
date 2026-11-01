import { useEffect, useState } from "react";
import { db } from "./db";

export default function CoachSettings() {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void Promise.all([db.settings.get("coachUrl"), db.settings.get("coachToken")]).then(([u, t]) => {
      setUrl(u?.value ?? "");
      setToken(t?.value ?? "");
    });
  }, []);

  async function save() {
    await db.settings.bulkPut([
      { key: "coachUrl", value: url.trim() },
      { key: "coachToken", value: token.trim() },
    ]);
    setSaved(true);
  }

  return (
    <details className="rounded-lg border border-slate-700 p-3 space-y-2">
      <summary className="cursor-pointer">AI coach settings</summary>
      <p className="text-sm text-slate-400">Leave blank to use the built-in rules only.</p>
      <input className="in" placeholder="Proxy URL, e.g. https://fitness-coach-proxy.you.workers.dev" value={url}
        onChange={(e) => { setUrl(e.target.value); setSaved(false); }} />
      <input className="in" type="password" placeholder="App token" value={token}
        onChange={(e) => { setToken(e.target.value); setSaved(false); }} />
      <button className="btn2 w-full" onClick={() => void save()}>{saved ? "Saved" : "Save"}</button>
    </details>
  );
}
