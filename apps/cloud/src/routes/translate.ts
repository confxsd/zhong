import { Hono } from "hono";
import { z } from "../ai/schema.js";
import { getProvider } from "../ai/provider.js";
import { rateLimited } from "../services/rate-limit.js";
import { teach } from "../services/teach.js";
import type { Env } from "../types.js";

const app = new Hono<{ Bindings: Env }>();

const bodySchema = z.object({ text: z.string().min(1).max(5000) });

app.post("/", async (c) => {
  const env = c.env;
  const provider = getProvider(env);
  if (!provider.configured) {
    return c.json(
      {
        error: `AI provider "${provider.name}" is not configured. Add the ${envVarFor(provider.name)} secret to this worker and redeploy.`,
      },
      503
    );
  }

  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
  if (await rateLimited(env.DB, ip)) {
    return c.json({ error: "Rate limit exceeded — wait a little, then try again." }, 429);
  }

  const { text } = bodySchema.parse(await c.req.json());
  const result = await teach(env, text);
  return c.json(result);
});

function envVarFor(name: string): string {
  if (name === "openai") return "OPENAI_API_KEY";
  if (name === "openai-compatible") return "AI_API_KEY";
  return "DEEPSEEK_API_KEY";
}

export default app;
