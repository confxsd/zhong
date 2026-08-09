import { Router } from "express";
import { z } from "../ai/schema.js";
import { db } from "../db/index.js";

const router = Router();

router.get("/", (req, res, next) => {
  try {
    const status = z.enum(["new", "learning", "known", "all"]).default("all").parse(req.query.status ?? "all");
    const search = String(req.query.search ?? "").trim();

    let sql = "SELECT * FROM vocab WHERE 1=1";
    const params: unknown[] = [];
    if (status !== "all") {
      sql += " AND status = ?";
      params.push(status);
    }
    if (search) {
      sql += " AND (hanzi LIKE ? OR pinyin LIKE ? OR meaning LIKE ?)";
      params.push(`%${search}%`, `%${search.toLowerCase()}%`, `%${search}%`);
    }
    sql += " ORDER BY created_at DESC LIMIT 500";

    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const body = z
      .object({
        meaning: z.string().min(1).max(300).optional(),
        pinyin: z.string().max(200).optional(),
        example: z.string().max(500).optional(),
        status: z.enum(["new", "learning", "known"]).optional(),
      })
      .parse(req.body);

    const existing = db.prepare("SELECT id FROM vocab WHERE id = ?").get(id);
    if (!existing) {
      res.status(404).json({ error: "Word not found" });
      return;
    }

    const sets: string[] = [];
    const params: unknown[] = [];
    for (const key of ["meaning", "pinyin", "example", "status"] as const) {
      if (body[key] !== undefined) {
        sets.push(`${key} = ?`);
        params.push(body[key] as string);
      }
    }
    if (sets.length === 0) {
      res.status(400).json({ error: "Nothing to update" });
      return;
    }
    params.push(id);
    db.prepare(`UPDATE vocab SET ${sets.join(", ")} WHERE id = ?`).run(...params);
    res.json(db.prepare("SELECT * FROM vocab WHERE id = ?").get(id));
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", (req, res, next) => {
  try {
    const info = db.prepare("DELETE FROM vocab WHERE id = ?").run(Number(req.params.id));
    if (info.changes === 0) {
      res.status(404).json({ error: "Word not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;