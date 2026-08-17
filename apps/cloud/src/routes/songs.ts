import { Hono, type Context } from "hono";
import { z } from "../ai/schema.js";
import { getProvider } from "../ai/provider.js";
import { rateLimited } from "../services/rate-limit.js";
import { deleteSong, getSong, glossSong, listSongs, studyWholeSong } from "../services/songs.js";
import type { Env } from "../types.js";

const app = new Hono<{ Bindings: Env }>();

const createSchema = z.object({
  title: z.string().max(200).default(""),
  artist: z.string().max(200).default(""),
  lyrics: z.string().min(1).max(4000),
});

function envVarFor(name: string): string {
  if (name === "openai") return "OPENAI_API_KEY";
  if (name === "openai-compatible") return "AI_API_KEY";
  return "DEEPSEEK_API_KEY";
}

async function checkProvider(c: Context<{ Bindings: Env }>): Promise<boolean> {
  const provider = getProvider(c.env);
  if (!provider.configured) {
    return (
      c.json(
        {
          error: `AI provider "${provider.name}" is not configured. Add the ${envVarFor(provider.name)} secret to this worker and redeploy.`,
        },
        503
      ),
      false
    );
  }
  return true;
}

app.get("/", async (c) => {
  return c.json(await listSongs(c.env.DB));
});

app.post("/", async (c) => {
  if (!(await checkProvider(c))) return;
  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
  if (await rateLimited(c.env.DB, ip)) {
    return c.json({ error: "Rate limit exceeded — wait a little, then try again." }, 429);
  }
  const { title, artist, lyrics } = createSchema.parse(await c.req.json());
  const song = await glossSong(c.env, title, artist, lyrics);
  return c.json(song);
});

app.get("/:id", async (c) => {
  const id = z.coerce.number().int().positive().parse(c.req.param("id"));
  const song = await getSong(c.env.DB, id);
  if (!song) return c.json({ error: "Song not found" }, 404);
  return c.json(song);
});

app.post("/:id/study", async (c) => {
  if (!(await checkProvider(c))) return;
  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
  if (await rateLimited(c.env.DB, ip)) {
    return c.json({ error: "Rate limit exceeded — wait a little, then try again." }, 429);
  }
  const id = z.coerce.number().int().positive().parse(c.req.param("id"));
  return c.json(await studyWholeSong(c.env, id));
});

app.delete("/:id", async (c) => {
  const id = z.coerce.number().int().positive().parse(c.req.param("id"));
  if (!(await deleteSong(c.env.DB, id))) return c.json({ error: "Song not found" }, 404);
  return c.json({ ok: true });
});

export default app;
