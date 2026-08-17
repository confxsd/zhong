import { createEmptyCard, type Card } from "ts-fsrs";
import type { VocabRow } from "../db.js";
import {
  boxFromCard,
  deserializeCard,
  parseState,
  preview,
  retrievability,
  schedule,
  serializeCard,
  stateLabel,
  statusFromCard,
  type Grade,
  type IntervalInfo,
} from "./fsrs.js";

export type { Grade, IntervalInfo } from "./fsrs.js";

const DAY = 24 * 60 * 60 * 1000;

function loadCard(row: VocabRow, now: Date): Card {
  return deserializeCard(parseState(row.fsrs_state)) ?? createEmptyCard(now);
}

export async function applyGrade(db: D1Database, row: VocabRow, grade: Grade): Promise<VocabRow> {
  const now = new Date();
  const next = schedule(loadCard(row, now), now, grade);
  const state = serializeCard(next);
  const box = boxFromCard(next);
  const status = statusFromCard(next);
  const nowIso = now.toISOString();
  const nextIso = next.due.toISOString();

  await db.batch([
    db
      .prepare(
        `UPDATE vocab
         SET fsrs_state = ?, box = ?, status = ?, review_count = review_count + 1,
             correct_count = correct_count + ?, last_reviewed_at = ?, next_review_at = ?
         WHERE id = ?`
      )
      .bind(JSON.stringify(state), box, status, grade === "again" ? 0 : 1, nowIso, nextIso, row.id),
    db.prepare("INSERT INTO review_log (vocab_id, grade) VALUES (?, ?)").bind(row.id, grade),
  ]);

  return {
    ...row,
    fsrs_state: JSON.stringify(state),
    box,
    status,
    review_count: row.review_count + 1,
    correct_count: row.correct_count + (grade === "again" ? 0 : 1),
    last_reviewed_at: nowIso,
    next_review_at: nextIso,
  };
}

export interface CardContext {
  session_id: number;
  input_text: string;
  translation: string;
}

export interface ReviewCard extends VocabRow {
  fsrs: { state: string; stability: number; retrievability: number };
  previews: Record<Grade, IntervalInfo>;
  context: CardContext | null;
}

async function contextFor(db: D1Database, vocabId: number): Promise<CardContext | null> {
  const row = await db
    .prepare(
      `SELECT s.id AS session_id, s.input_text, s.translation
       FROM session_vocab sv JOIN sessions s ON s.id = sv.session_id
       WHERE sv.vocab_id = ?
       ORDER BY s.created_at DESC LIMIT 1`
    )
    .bind(vocabId)
    .first<CardContext | null>();
  return row ?? null;
}

export async function buildReviewCard(db: D1Database, row: VocabRow): Promise<ReviewCard> {
  const now = new Date();
  const card = loadCard(row, now);
  return {
    ...row,
    fsrs: { state: stateLabel(card), stability: card.stability, retrievability: retrievability(card, now) },
    previews: preview(card, now),
    context: await contextFor(db, row.id),
  };
}

export async function dueCards(db: D1Database, limit = 20): Promise<ReviewCard[]> {
  const now = new Date();
  const res = await db
    .prepare(
      `SELECT * FROM vocab
       WHERE next_review_at IS NULL OR next_review_at <= ?
       ORDER BY created_at ASC LIMIT 600`
    )
    .bind(now.toISOString())
    .all<VocabRow>();

  const due = res.results
    .map((row) => ({ row, dueAt: loadCard(row, now).due.getTime() }))
    .filter((x) => x.dueAt <= now.getTime())
    .sort((a, b) => a.dueAt - b.dueAt)
    .slice(0, limit);

  const cards: ReviewCard[] = [];
  for (const x of due) {
    cards.push(await buildReviewCard(db, x.row));
  }
  return cards;
}

export async function nextDueCount(db: D1Database): Promise<number> {
  const r = await db
    .prepare(`SELECT COUNT(*) AS c FROM vocab WHERE next_review_at IS NULL OR next_review_at <= ?`)
    .bind(new Date().toISOString())
    .first<{ c: number }>();
  return r?.c ?? 0;
}

function localDayKey(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE");
}

async function computeStreak(db: D1Database): Promise<number> {
  const res = await db
    .prepare("SELECT reviewed_at FROM review_log ORDER BY reviewed_at DESC LIMIT 2000")
    .all<{ reviewed_at: string }>();
  const days = new Set(res.results.map((l) => localDayKey(l.reviewed_at)));
  const today = localDayKey(new Date().toISOString());
  const yesterday = localDayKey(new Date(Date.now() - DAY).toISOString());

  let cursor: string | null = null;
  if (days.has(today)) cursor = today;
  else if (days.has(yesterday)) cursor = yesterday; // 1-day grace
  if (!cursor) return 0;

  let streak = 0;
  const d = new Date(`${cursor}T12:00:00`);
  while (days.has(cursor)) {
    streak += 1;
    d.setDate(d.getDate() - 1);
    cursor = d.toLocaleDateString("sv-SE");
  }
  return streak;
}

async function computeRetention(db: D1Database): Promise<number> {
  const res = await db
    .prepare("SELECT fsrs_state FROM vocab WHERE fsrs_state IS NOT NULL AND review_count > 0 LIMIT 500")
    .all<{ fsrs_state: string }>();
  if (res.results.length === 0) return 1;
  const now = new Date();
  let sum = 0;
  let n = 0;
  for (const r of res.results) {
    const card = deserializeCard(parseState(r.fsrs_state));
    if (!card) continue;
    sum += retrievability(card, now);
    n += 1;
  }
  return n > 0 ? Math.round((sum / n) * 100) / 100 : 1;
}

export async function stats(db: D1Database) {
  const nowIso = new Date().toISOString();
  const r = await db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN box = 0 THEN 1 ELSE 0 END) AS unseen,
         SUM(CASE WHEN status = 'known' THEN 1 ELSE 0 END) AS known,
         COUNT(CASE WHEN next_review_at IS NULL OR next_review_at <= ? THEN 1 END) AS due
       FROM vocab`
    )
    .bind(nowIso)
    .first<{ total: number; unseen: number; known: number; due: number }>();

  const sessions = await db.prepare("SELECT COUNT(*) AS c FROM sessions").first<{ c: number }>();
  const totalReviews = await db.prepare("SELECT COUNT(*) AS c FROM review_log").first<{ c: number }>();
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
    totalReviews: totalReviews?.c ?? 0,
    streak: await computeStreak(db),
    retention: await computeRetention(db),
  };
}
