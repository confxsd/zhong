import type { VocabRow } from "../db.js";

export type Grade = "again" | "hard" | "good" | "easy";

/** Leitner-style intervals in days after the review. Index = box. */
const DAYS = [1, 1, 2, 4, 7, 14, 30, 60];

const DAY = 24 * 60 * 60 * 1000;

export async function applyGrade(db: D1Database, row: VocabRow, grade: Grade): Promise<VocabRow> {
  let box = row.box;
  if (grade === "again") box = 1;
  else if (grade === "hard") box = Math.max(1, box);
  else if (grade === "good") box = box === 0 ? 2 : Math.min(7, box + 1);
  else box = Math.min(7, box + 2);

  const status: VocabRow["status"] = box >= 4 ? "known" : "learning";
  const next = new Date(Date.now() + DAYS[box] * DAY).toISOString();
  const now = new Date().toISOString();

  await db.batch([
    db
      .prepare(
        `UPDATE vocab
         SET box = ?, status = ?, review_count = review_count + 1,
             correct_count = correct_count + ?, last_reviewed_at = ?, next_review_at = ?
         WHERE id = ?`
      )
      .bind(box, status, grade === "again" ? 0 : 1, now, next, row.id),
    db.prepare("INSERT INTO review_log (vocab_id, grade) VALUES (?, ?)").bind(row.id, grade),
  ]);

  return {
    ...row,
    box,
    status,
    review_count: row.review_count + 1,
    correct_count: row.correct_count + (grade === "again" ? 0 : 1),
    last_reviewed_at: now,
    next_review_at: next,
  };
}

export async function dueCards(db: D1Database, limit = 20): Promise<VocabRow[]> {
  const res = await db
    .prepare(
      `SELECT * FROM vocab
       WHERE next_review_at IS NULL OR next_review_at <= ?
       ORDER BY (next_review_at IS NULL) DESC, next_review_at ASC, created_at ASC
       LIMIT ?`
    )
    .bind(new Date().toISOString(), limit)
    .all<VocabRow>();
  return res.results;
}

export async function nextDueCount(db: D1Database): Promise<number> {
  const r = await db
    .prepare(`SELECT COUNT(*) AS c FROM vocab WHERE next_review_at IS NULL OR next_review_at <= ?`)
    .bind(new Date().toISOString())
    .first<{ c: number }>();
  return r?.c ?? 0;
}

export async function stats(db: D1Database) {
  const r = await db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN box = 0 THEN 1 ELSE 0 END) AS unseen,
         SUM(CASE WHEN status = 'known' THEN 1 ELSE 0 END) AS known,
         COUNT(CASE WHEN next_review_at IS NULL OR next_review_at <= ? THEN 1 END) AS due
       FROM vocab`
    )
    .bind(new Date().toISOString())
    .first<{ total: number; unseen: number; known: number; due: number }>();

  const sessions = await db.prepare("SELECT COUNT(*) AS c FROM sessions").first<{ c: number }>();
  const reviewsToday = await db
    .prepare("SELECT COUNT(*) AS c FROM review_log WHERE date(reviewed_at) = date('now')")
    .first<{ c: number }>();
  const wordsToday = await db
    .prepare("SELECT COUNT(*) AS c FROM vocab WHERE date(created_at) = date('now')")
    .first<{ c: number }>();

  return {
    totalVocab: r?.total ?? 0,
    unseen: r?.unseen ?? 0,
    knownWords: r?.known ?? 0,
    due: r?.due ?? 0,
    sessions: sessions?.c ?? 0,
    reviewsToday: reviewsToday?.c ?? 0,
    wordsToday: wordsToday?.c ?? 0,
  };
}
