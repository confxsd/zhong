import { Hono } from "hono";
import { cors } from "hono/cors";
import { getProvider } from "./ai/provider.js";
import { dailyPlan } from "./services/plan.js";
import reviewRouter from "./routes/review.js";
import sessionsRouter from "./routes/sessions.js";
import tracksRouter from "./routes/tracks.js";
import translateRouter from "./routes/translate.js";
import ttsRouter from "./routes/tts.js";
import vocabRouter from "./routes/vocab.js";
import { stats } from "./services/srs.js";
import type { Env } from "./types.js";

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", cors());

app.get("/api/health", async (c) => {
  const provider = getProvider(c.env);
  return c.json({
    ok: true,
    provider: { name: provider.name, model: provider.model, configured: provider.configured },
    stats: await stats(c.env.DB),
  });
});

app.get("/api/plan", async (c) => {
  return c.json(await dailyPlan(c.env.DB));
});

app.route("/api/translate", translateRouter);
app.route("/api/tts", ttsRouter);
app.route("/api/vocab", vocabRouter);
app.route("/api/review", reviewRouter);
app.route("/api/sessions", sessionsRouter);
app.route("/api/tracks", tracksRouter);

app.onError((err, c) => {
  let message = "Internal server error";
  let status: 400 | 500 = 500;
  if (err instanceof Error) {
    message = err.message;
    if (err.name === "ZodError") status = 400;
  }
  return c.json({ error: message }, status);
});

export default app;
