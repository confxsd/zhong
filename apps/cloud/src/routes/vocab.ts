import { Hono } from "hono";
import { z } from "../ai/schema.js";
import type { Env } from "../types.js";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
  const status = z
    .enum(["new", "learning", "known", "all"])
    .default("all")
    .parse(c.req.query("status") ?? "all");
  const search = (c.req.query("search") ?? "").trim();

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

  const res = await c.env.DB.prepare(sql)
    .bind(...params)
    .all();
  return c.json(res.results);
});

app.patch("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = z
    .object({
      meaning: z.string().min(1).max(300).optional(),
      pinyin: z.string().max(200).optional(),
      example: z.string().max(500).optional(),
      status: z.enum(["new", "learning", "known"]).optional(),
    })
    .parse(await c.req.json());

  const existing = await c.env.DB.prepare("SELECT id FROM vocab WHERE id = ?")
    .bind(id)
    .first();
  if (!existing) return c.json({ error: "Word not found" }, 404);

  const sets: string[] = [];
  const params: unknown[] = [];
  for (const key of ["meaning", "pinyin", "example", "status"] as const) {
    if (body[key] !== undefined) {
      sets.push(`${key} = ?`);
      params.push(body[key] as string);
    }
  }
  if (sets.length === 0) return c.json({ error: "Nothing to update" }, 400);

  params.push(id);
  await c.env.DB.prepare(`UPDATE vocab SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...params)
    .run();
  const row = await c.env.DB.prepare("SELECT * FROM vocab WHERE id = ?")
    .bind(id)
    .first();
  return c.json(row);
});

app.delete("/:id", async (c) => {
  const info = await c.env.DB.prepare("DELETE FROM vocab WHERE id = ?")
    .bind(Number(c.req.param("id")))
    .run();
  if (info.meta.changes === 0) return c.json({ error: "Word not found" }, 404);
  return c.json({ ok: true });
});

export default app;
