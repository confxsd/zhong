import { Hono } from "hono";
import { gradeSchema } from "../ai/schema.js";
import type { VocabRow } from "../db.js";
import { applyGrade, buildReviewCard, dueCards, nextDueCount } from "../services/srs.js";
import type { Env } from "../types.js";

const app = new Hono<{ Bindings: Env }>();

app.get("/due", async (c) => {
  const limit = Math.min(100, Number(c.req.query("limit") ?? 20) || 20);
  const cards = await dueCards(c.env.DB, limit);
  return c.json({ cards, remaining: await nextDueCount(c.env.DB) });
});

app.post("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ grade: unknown }>();
  const grade = gradeSchema.parse(body.grade);

  const row = await c.env.DB.prepare("SELECT * FROM vocab WHERE id = ?")
    .bind(id)
    .first<VocabRow | null>();
  if (!row) return c.json({ error: "Word not found" }, 404);

  const updated = await applyGrade(c.env.DB, row, grade);
  return c.json({ card: await buildReviewCard(c.env.DB, updated), remaining: await nextDueCount(c.env.DB) });
});

export default app;
