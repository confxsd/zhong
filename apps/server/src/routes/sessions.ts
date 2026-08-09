import { Router } from "express";
import { z } from "../ai/schema.js";
import { db } from "../db/index.js";

const router = Router();

function toSession(row: Record<string, unknown>) {
  return {
    ...row,
    segments: JSON.parse(String(row.segments)),
    breakdown: JSON.parse(String(row.breakdown)),
    grammar: JSON.parse(String(row.grammar)),
    notes: JSON.parse(String(row.notes)),
    recognized: JSON.parse(String(row.recognized)),
  };
}

router.get("/", (req, res, next) => {
  try {
    const limit = Math.min(100, Number(req.query.limit ?? 20) || 20);
    const rows = db
      .prepare(
        `SELECT s.id, s.input_text, s.translation, s.created_at,
                (SELECT COUNT(*) FROM session_vocab sv WHERE sv.session_id = s.id) AS vocab_count
         FROM sessions s ORDER BY s.created_at DESC LIMIT ?`
      )
      .all(limit) as Record<string, unknown>[];
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    if (!row) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    const vocab = db
      .prepare(
        `SELECT v.id, v.hanzi, v.pinyin, v.meaning, v.example, v.example_trans
         FROM session_vocab sv JOIN vocab v ON v.id = sv.vocab_id
         WHERE sv.session_id = ?`
      )
      .all(id);
    res.json({ ...toSession(row), vocab });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", (req, res, next) => {
  try {
    const info = db.prepare("DELETE FROM sessions WHERE id = ?").run(Number(req.params.id));
    if (info.changes === 0) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;