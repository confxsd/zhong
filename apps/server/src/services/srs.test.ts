import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyGrade, isDue } from "./srs.js";
import { db } from "../db/index.js";
import type { VocabRow } from "../db/index.js";

vi.mock("../db/index.js", () => ({ db: { prepare: () => ({ run: () => ({}) }) } }));

function row(overrides: Partial<VocabRow> = {}): VocabRow {
  return {
    id: 1,
    hanzi: "我",
    pinyin: "wǒ",
    meaning: "I/me",
    example: "",
    example_trans: "",
    status: "new",
    box: 0,
    review_count: 0,
    correct_count: 0,
    last_reviewed_at: null,
    next_review_at: null,
    created_at: "2026-01-01 00:00:00",
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("isDue", () => {
  it("a card without a next review is due", () => {
    expect(isDue(row())).toBe(true);
  });
  it("a card with future next_review is not due", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(isDue(row({ next_review_at: future }))).toBe(false);
  });
});

describe("applyGrade", () => {
  it("'again' resets box but still schedules review for tomorrow", () => {
    const r = applyGrade(row({ box: 5, status: "known" }), "again");
    expect(r.box).toBe(1);
    expect(r.status).toBe("learning");
    expect(r.correct_count).toBe(0);
  });
  it("'good' advances box by one", () => {
    expect(applyGrade(row({ box: 2 }), "good").box).toBe(3);
  });
  it("'good' from never-reviewed jumps to box 2", () => {
    expect(applyGrade(row(), "good").box).toBe(2);
  });
  it("'easy' advances by two, capped at 7", () => {
    expect(applyGrade(row({ box: 6 }), "easy").box).toBe(7);
    expect(applyGrade(row({ box: 7 }), "easy").box).toBe(7);
  });
  it("'hard' never lowers the box below 1", () => {
    expect(applyGrade(row(), "hard").box).toBe(1);
    expect(applyGrade(row({ box: 3 }), "hard").box).toBe(3);
  });
  it("promotes to known from box 4", () => {
    expect(applyGrade(row({ box: 3 }), "good").status).toBe("known");
  });
  it("bumps the review counters", () => {
    const r = applyGrade(row({ review_count: 3, correct_count: 2 }), "good");
    expect(r.review_count).toBe(4);
    expect(r.correct_count).toBe(3);
  });
});