import { Hono } from "hono";
import { z } from "../ai/schema.js";
import type { Env } from "../types.js";

const app = new Hono<{ Bindings: Env }>();

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

app.get("/", async (c) => {
  const limit = Math.min(100, Number(c.req.query("limit") ?? 20) || 20);
  const res = await c.env.DB.prepare(
    `SELECT s.id, s.input_text, s.translation, s.created_at,
            (SELECT COUNT(*) FROM session_vocab sv WHERE sv.session_id = s.id) AS vocab_count
     FROM sessions s ORDER BY s.created_at DESC LIMIT ?`
  )
    .bind(limit)
    .all<Record<string, unknown>>();
  return c.json(res.results);
});

app.get("/:id", async (c) => {
  const id = z.coerce.number().int().positive().parse(c.req.param("id"));
  const row = await c.env.DB.prepare("SELECT * FROM sessions WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown> | null>();
  if (!row) return c.json({ error: "Session not found" }, 404);

  const vocab = await c.env.DB.prepare(
    `SELECT v.id, v.hanzi, v.pinyin, v.meaning, v.example, v.example_trans
     FROM session_vocab sv JOIN vocab v ON v.id = sv.vocab_id
     WHERE sv.session_id = ?`
  )
    .bind(id)
    .all();
  return c.json({ ...toSession(row), vocab: vocab.results });
});

app.delete("/:id", async (c) => {
  const id = z.coerce.number().int().positive().parse(c.req.param("id"));
  const session = await c.env.DB.prepare("SELECT kind FROM sessions WHERE id = ?")
    .bind(id)
    .first<{ kind: string } | null>();
  if (!session) return c.json({ error: "Session not found" }, 404);

  const linked = await c.env.DB.prepare(
    "SELECT v.id, v.hanzi FROM session_vocab sv JOIN vocab v ON v.id = sv.vocab_id WHERE sv.session_id = ?"
  )
    .bind(id)
    .all<{ id: number; hanzi: string }>();

  const info = await c.env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(id).run();
  if (info.meta.changes === 0) return c.json({ error: "Session not found" }, 404);

  // Words this session was the only source of leave the library and the
  // review queue entirely (review_log cascades with vocab).
  const orphaned: { id: number; hanzi: string }[] = [];
  for (const v of linked.results) {
    const refs = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM session_vocab WHERE vocab_id = ?")
      .bind(v.id)
      .first<{ n: number }>();
    if (refs && refs.n === 0) orphaned.push(v);
  }

  if (orphaned.length > 0) {
    await c.env.DB.prepare(`DELETE FROM vocab WHERE id IN (${orphaned.map(() => "?").join(",")})`)
      .bind(...orphaned.map((v) => v.id))
      .run();
  }

  // Track-lesson words: un-stick their curriculum progress so they can be
  // taught again from the track instead of lingering as "learning".
  if (session.kind === "track-lesson" && orphaned.length > 0) {
    const stmts = orphaned.map((v) =>
      c.env.DB.prepare(
        `UPDATE track_progress SET status = 'new', updated_at = datetime('now')
         WHERE item_id IN (
           SELECT ti.id FROM track_items ti
           WHERE ti.type = 'word' AND json_extract(ti.payload, '$.hanzi') = ?
         )`
      ).bind(v.hanzi)
    );
    await c.env.DB.batch(stmts);
  }

  return c.json({ ok: true });
});

export default app;
