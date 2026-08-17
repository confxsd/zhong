import { Hono } from "hono";
import { getProvider } from "../ai/provider.js";
import { rateLimited } from "../services/rate-limit.js";
import { getTrack, listTracks, seedTracksIfEmpty, trackLesson } from "../services/tracks.js";
import type { Env } from "../types.js";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
  await seedTracksIfEmpty(c.env.DB);
  return c.json(await listTracks(c.env.DB));
});

app.get("/:slug", async (c) => {
  await seedTracksIfEmpty(c.env.DB);
  const track = await getTrack(c.env.DB, c.req.param("slug"));
  if (!track) return c.json({ error: "Track not found" }, 404);
  return c.json(track);
});

app.post("/:slug/lesson", async (c) => {
  const env = c.env;
  const provider = getProvider(env);
  if (!provider.configured) {
    return c.json({ error: `AI provider "${provider.name}" is not configured.` }, 503);
  }
  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
  if (await rateLimited(env.DB, ip)) {
    return c.json({ error: "Rate limit exceeded — wait a little, then try again." }, 429);
  }
  const lesson = await trackLesson(env, c.req.param("slug"));
  return c.json(lesson);
});

export default app;
