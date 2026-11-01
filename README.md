# Fitness PWA

Personal, single-user fitness app. Local-first PWA, with a thin serverless proxy for AI calls.

## Status

- [x] Step 1: `shared/` types, progression engine, guardrails, tests
- [x] Step 2: `app/` Dexie schema, onboarding, workout logging
- [x] Step 3: `worker/` AI proxy and coach layer
- [ ] Step 4: weight projection, cardio, meal photos

## Run it

```bash
npm install
npm test          # runs the progression engine tests
npm run typecheck
npm run dev       # PWA at http://localhost:5173 (also on your LAN)
npm run build     # production build in app/dist
```

## What's in `shared/src`

| File | Purpose |
|---|---|
| `types.ts` | Profile, exercise, set log, suggestion types |
| `units.ts` | Rounding to real plate/dumbbell steps, rep helpers |
| `catalog.ts` | Default exercises with starting-load ratios |
| `startingLoad.ts` | Cold-start weight estimate (experience, comeback factor) |
| `sessions.ts` | Groups set logs into sessions and scores them |
| `progression.ts` | Double progression: what to do next session |
| `inSession.ts` | Adjusts the next set mid-workout |
| `guardrails.ts` | Validates and clamps AI suggestions (Zod) |

## How progression works

1. No history: estimate a conservative weight, top of the rep range, flagged as calibration.
2. Every set hit the top of the range and RPE is fine: add weight, reset reps to mid-range.
3. In range but not topped: same weight, aim for one more rep.
4. Small miss: hold. Big miss: reduce. Two misses in a row at one weight: deload 10%.
5. Long gap (14, 28, 56+ days): reduce 5%, 10%, 15%.
6. The AI may adjust the engine's answer only within `GUARDRAILS`. Invalid AI output is ignored.

All thresholds live in `RULES` (`progression.ts`) and `GUARDRAILS` (`guardrails.ts`).

## Assumptions to check

- Weights are in kilograms. Dumbbell weights are per hand.
- Default jumps: 2.5 kg (barbell, dumbbell, cable), 5 kg (machine). Override with `incrementKg` per exercise.
- Catalog starting ratios are rough heuristics for the first session only. Calibration corrects them.

## AI coach setup (step 3)

The app works without the coach. To turn it on:

```bash
cd worker
cp .dev.vars.example .dev.vars        # local secrets, never committed
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put APP_TOKEN     # any long random string
npx wrangler deploy
```

1. Edit `ALLOWED_ORIGIN` in `worker/wrangler.toml` to your app's origin, then redeploy.
2. In the app, open "AI coach settings" and enter the worker URL and the same `APP_TOKEN`.
3. `MODEL` in `wrangler.toml` selects the model. Change it there if you want a different one.

Local testing: `npm run dev -w worker` serves on http://localhost:8787 with `.dev.vars`.

How it stays safe: the key lives only in Cloudflare. The worker requires your token, validates the request, and
validates the model's reply. The app then clamps the reply to `GUARDRAILS`, and falls back to the rules engine on any failure.
The token is stored in the browser's IndexedDB on your device, not in the app bundle.
