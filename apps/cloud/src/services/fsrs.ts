import { createEmptyCard, fsrs, Rating, State, type Card, type Grade as FsrsGrade } from "ts-fsrs";

export type Grade = "again" | "hard" | "good" | "easy";

/** FSRS scheduler tuned for a beginner: 90% target retention. */
export const scheduler = fsrs({ request_retention: 0.9 });

const RATING: Record<Grade, FsrsGrade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

/** Serializable card state stored in vocab.fsrs_state. */
export interface FsrsCardJson {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  learning_steps: number;
  state: number;
  last_review: string | null;
}

export function serializeCard(card: Card): FsrsCardJson {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    learning_steps: card.learning_steps,
    state: card.state,
    last_review: card.last_review ? card.last_review.toISOString() : null,
  };
}

export function deserializeCard(json: FsrsCardJson | null | undefined): Card | null {
  if (!json) return null;
  try {
    return {
      due: new Date(json.due),
      stability: json.stability ?? 0,
      difficulty: json.difficulty ?? 0,
      elapsed_days: json.elapsed_days ?? 0,
      scheduled_days: json.scheduled_days ?? 0,
      reps: json.reps ?? 0,
      lapses: json.lapses ?? 0,
      learning_steps: json.learning_steps ?? 0,
      state: json.state ?? State.New,
      last_review: json.last_review ? new Date(json.last_review) : undefined,
    };
  } catch {
    return null;
  }
}

export function parseState(raw: string | null | undefined): FsrsCardJson | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FsrsCardJson;
  } catch {
    return null;
  }
}

/** Advance a card with a grade and return the next state. */
export function schedule(card: Card, now: Date, grade: Grade): Card {
  return scheduler.next(card, now, RATING[grade]).card;
}

export interface IntervalInfo {
  due: string;
  intervalMs: number;
}

/** Predicted next due/interval for every grade, for live button labels. */
export function preview(card: Card, now: Date): Record<Grade, IntervalInfo> {
  const out = {} as Record<Grade, IntervalInfo>;
  for (const grade of Object.keys(RATING) as Grade[]) {
    const next = scheduler.next(card, now, RATING[grade]).card;
    out[grade] = { due: next.due.toISOString(), intervalMs: Math.max(0, next.due.getTime() - now.getTime()) };
  }
  return out;
}

/** Current probability of recall (0..1). */
export function retrievability(card: Card, now: Date): number {
  if (card.state === State.New || card.reps === 0) return 1;
  try {
    const raw = scheduler.get_retrievability(card, now);
    const pct = Number.parseFloat(String(raw));
    return Number.isFinite(pct) ? Math.min(1, Math.max(0, pct / 100)) : 0;
  } catch {
    return 0;
  }
}

/** Cosmetic Leitner-style box derived from FSRS state (kept for compat). */
export function boxFromCard(card: Card): number {
  if (card.state === State.New) return 0;
  if (card.state !== State.Review) return 1;
  return Math.min(7, Math.max(2, 1 + Math.round(Math.log2(Math.max(card.stability, 1)))));
}

export function statusFromCard(card: Card): "new" | "learning" | "known" {
  if (card.state === State.New) return "new";
  if (card.state === State.Review && card.stability >= 14) return "known";
  return "learning";
}

export function stateLabel(card: Card): string {
  return State[card.state].toLowerCase();
}
