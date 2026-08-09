import { Router } from "express";
import { gradeSchema } from "../ai/schema.js";
import { db, VocabRow } from "../db/index.js";
import { applyGrade, dueCards, nextDueCount } from "../services/srs.js";

const router = Router();

router.get("/due", (req, res, next) => {
  try {
    const limit = Math.min(100, Number(req.query.limit ?? 20) || 20);
    const cards = dueCards(limit);
    res.json({ cards, remaining: nextDueCount() });
  } catch (err) {
    next(err);
  }
});

router.post("/:id", (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const grade = gradeSchema.parse(req.body.grade);

    const row = db.prepare("SELECT * FROM vocab WHERE id = ?").get(id) as VocabRow | undefined;
    if (!row) {
      res.status(404).json({ error: "Word not found" });
      return;
    }
    const updated = applyGrade(row, grade);
    res.json({ card: updated, remaining: nextDueCount() });
  } catch (err) {
    next(err);
  }
});

export default router;