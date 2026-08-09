import { db, VocabRow } from "../db/index.js";

export type Grade = "again" | "hard" | "good" | "easy";

/** Leitner-style intervals in days after the review. Index = box. */
const DAYS = [1, 1, 2, 4, 7, 14, 30, 60];

const DAY = 24 * 60 * 60 * 1000;

export function isDue(row: Pick<VocabRow, "next_review_at">): boolean {
  if (!row.next_review_at) return true;
  return new Date(row.next_review_at).getTime() <= Date.now();
}

export function applyGrade(row: VocabRow, grade: Grade): VocabRow {
  let box = row.box;
  if (grade === "again") box = 1;
  else if (grade === "hard") box = Math.max(1, box);
  else if (grade === "good") box = box === 0 ? 2 : Math.min(7, box + 1);
  else box = Math.min(7, box + 2);

  const status: VocabRow["status"] = box >= 4 ? "known" : "learning";
  const next = new Date(Date.now() + DAYS[box] * DAY).toISOString();
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE vocab
     SET box = ?, status = ?, review_count = review_count + 1,
         correct_count = correct_count + ?, last_reviewed_at = ?, next_review_at = ?
     WHERE id = ?`
  ).run(box, status, grade === "again" ? 0 : 1, now, next, row.id);

  db.prepare("INSERT INTO review_log (vocab_id, grade) VALUES (?, ?)").run(row.id, grade);

  return { ...row, box, status, review_count: row.review_count + 1, correct_count: row.correct_count + (grade === "again" ? 0 : 1), last_reviewed_at: now, next_review_at: next };
}

export function dueCards(limit = 20): VocabRow[] {
  return db
    .prepare(
      `SELECT * FROM vocab
       WHERE next_review_at IS NULL OR next_review_at <= ?
       ORDER BY (next_review_at IS NULL) DESC, next_review_at ASC, created_at ASC
       LIMIT ?`
    )
    .all(new Date().toISOString(), limit) as VocabRow[];
}

export function nextDueCount(): number {
  const r = db
    .prepare(`SELECT COUNT(*) AS c FROM vocab WHERE next_review_at IS NULL OR next_review_at <= ?`)
    .get(new Date().toISOString()) as { c: number };
  return r.c;
}

export function stats() {
  const r = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN box = 0 THEN 1 ELSE 0 END) AS unseen,
         SUM(CASE WHEN status = 'known' THEN 1 ELSE 0 END) AS known,
         COUNT(CASE WHEN next_review_at IS NULL OR next_review_at <= ? THEN 1 END) AS due
       FROM vocab`
    )
    .get(new Date().toISOString()) as { total: number; unseen: number; known: number; due: number };

  const sessions = db.prepare("SELECT COUNT(*) AS c FROM sessions").get() as { c: number };
  const reviewsToday = db
    .prepare("SELECT COUNT(*) AS c FROM review_log WHERE date(reviewed_at) = date('now')")
    .get() as { c: number };
  const wordsToday = db
    .prepare("SELECT COUNT(*) AS c FROM vocab WHERE date(created_at) = date('now')")
    .get() as { c: number };

  return {
    totalVocab: r.total ?? 0,
    unseen: r.unseen ?? 0,
    knownWords: r.known ?? 0,
    due: r.due ?? 0,
    sessions: sessions.c,
    reviewsToday: reviewsToday.c,
    wordsToday: wordsToday.c,
  };
}