import { beforeEach, describe, expect, it } from "vitest";
import { State } from "ts-fsrs";
import { applyGrade } from "./srs.js";
import { boxFromCard, deserializeCard, parseState, retrievability } from "./fsrs.js";
import type { VocabRow } from "../db.js";

// Minimal D1-shaped fake: applyGrade only writes, never reads back.
function fakeDb(): D1Database & { calls: string[] } {
  const calls: string[] = [];
  const db = {
    calls,
    prepare: (sql: string) => ({
      bind: () => ({
        run: async () => {
          calls.push(sql);
          return { meta: {} as Record<string, unknown> };
        },
      }),
    }),
    batch: async (stmts: { run: () => Promise<unknown> }[]) => {
      for (const s of stmts) await s.run();
      return [];
    },
  } as unknown as D1Database & { calls: string[] };
  return db;
}

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
    fsrs_state: null,
    created_at: "2026-01-01 00:00:00",
    ...overrides,
  };
}

function matureCard(): string {
  return JSON.stringify({
    due: new Date(Date.now() - 86400000).toISOString(),
    stability: 30,
    difficulty: 3,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 5,
    lapses: 0,
    learning_steps: 0,
    state: State.Review,
    last_review: new Date(Date.now() - 30 * 86400000).toISOString(),
  });
}

describe("applyGrade (FSRS)", () => {
  let db: D1Database & { calls: string[] };

  beforeEach(() => {
    db = fakeDb();
  });

  it("'good' on a new card starts learning and schedules a review", async () => {
    const r = await applyGrade(db, row(), "good");
    expect(r.review_count).toBe(1);
    expect(r.correct_count).toBe(1);
    expect(r.status).toBe("learning");
    expect(r.next_review_at).toBeTruthy();
    expect(new Date(r.next_review_at!).getTime()).toBeGreaterThan(Date.now());
    expect(r.fsrs_state).toBeTruthy();
  });

  it("'again' on a new card counts as incorrect", async () => {
    const r = await applyGrade(db, row(), "again");
    expect(r.review_count).toBe(1);
    expect(r.correct_count).toBe(0);
  });

  it("'again' on a mature card lapses it back to relearning", async () => {
    const r = await applyGrade(db, row({ fsrs_state: matureCard(), status: "known", box: 6, review_count: 5, correct_count: 5 }), "again");
    expect(r.status).toBe("learning");
    expect(r.correct_count).toBe(5);
    const state = parseState(r.fsrs_state);
    expect(state).toBeTruthy();
    expect(state!.lapses).toBe(1);
    expect(state!.state).toBe(State.Relearning);
  });

  it("'good' on a mature card raises stability", async () => {
    const r = await applyGrade(db, row({ fsrs_state: matureCard(), status: "known", box: 6, review_count: 5 }), "good");
    const state = parseState(r.fsrs_state)!;
    expect(state.stability).toBeGreaterThan(30);
    expect(state.reps).toBe(6);
  });

  it("'easy' jumps further than 'good'", async () => {
    const good = await applyGrade(db, row({ fsrs_state: matureCard() }), "good");
    const easy = await applyGrade(db, row({ fsrs_state: matureCard() }), "easy");
    const goodStability = parseState(good.fsrs_state)!.stability;
    const easyStability = parseState(easy.fsrs_state)!.stability;
    expect(easyStability).toBeGreaterThan(goodStability);
  });

  it("writes the vocab update and review log as a batch", async () => {
    await applyGrade(db, row(), "good");
    expect(db.calls).toHaveLength(2);
    expect(db.calls[0]).toContain("UPDATE vocab");
    expect(db.calls[1]).toContain("INSERT INTO review_log");
  });
});

describe("fsrs state serialization", () => {
  it("round-trips a card through JSON", () => {
    const card = deserializeCard(parseState(matureCard()))!;
    expect(card.stability).toBe(30);
    expect(card.reps).toBe(5);
    expect(card.state).toBe(State.Review);
  });

  it("tolerates garbage input", () => {
    expect(parseState("not json")).toBeNull();
    expect(deserializeCard(null)).toBeNull();
  });

  it("maps card state to cosmetic box values", () => {
    const mature = deserializeCard(parseState(matureCard()))!;
    expect(boxFromCard(mature)).toBe(6);
    expect(retrievability(mature, new Date())).toBeGreaterThan(0);
  });
});
