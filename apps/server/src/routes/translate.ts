import { Router } from "express";
import { z } from "../ai/schema.js";
import { getProvider } from "../ai/provider.js";
import { teach } from "../services/teach.js";

const router = Router();

const bodySchema = z.object({ text: z.string().min(1).max(5000) });

router.post("/", async (req, res, next) => {
  try {
    const provider = getProvider();
    if (!provider.configured) {
      res.status(503).json({
        error: `AI provider "${provider.name}" is not configured. Add the ${envVarFor(provider.name)} variable to apps/server/.env and restart.`,
      });
      return;
    }
    const { text } = bodySchema.parse(req.body);
    const result = await teach(text);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

function envVarFor(name: string): string {
  if (name === "openai") return "OPENAI_API_KEY";
  if (name === "openai-compatible") return "AI_API_KEY";
  return "DEEPSEEK_API_KEY";
}

export default router;