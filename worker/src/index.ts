import { Hono } from "hono";
import { cors } from "hono/cors";
import { AiOverrideSchema, CoachRequestSchema, buildCoachMessages, parseCoachReply } from "@fitness/shared";

export type Bindings = {
  ANTHROPIC_API_KEY: string;
  APP_TOKEN: string;
  ALLOWED_ORIGIN: string;
  MODEL: string;
};

const MAX_BODY_BYTES = 20_000;

/** Compare two strings without bailing out at the first difference. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", (c, next) =>
  cors({
    origin: c.env.ALLOWED_ORIGIN,
    allowMethods: ["POST", "GET", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
    maxAge: 86400,
  })(c, next),
);

app.get("/health", (c) => c.json({ ok: true }));

app.post("/coach", async (c) => {
  const token = (c.req.header("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!c.env.APP_TOKEN || !safeEqual(token, c.env.APP_TOKEN)) return c.json({ error: "unauthorized" }, 401);

  const raw = await c.req.text();
  if (raw.length > MAX_BODY_BYTES) return c.json({ error: "too_large" }, 413);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const req = CoachRequestSchema.safeParse(body);
  if (!req.success) return c.json({ error: "invalid_request" }, 400);

  const { system, user } = buildCoachMessages(req.data);
  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": c.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: c.env.MODEL,
      max_tokens: 300,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!upstream.ok) return c.json({ error: "upstream_error" }, 502);

  const data = (await upstream.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
  const reply = AiOverrideSchema.safeParse(parseCoachReply(text));
  if (!reply.success) return c.json({ error: "bad_model_output" }, 502);

  return c.json(reply.data);
});

export default app;
