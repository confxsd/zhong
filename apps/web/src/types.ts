export interface Segments {
  text: string;
  pinyin: string;
  literal: string;
}

export interface Breakdown {
  char: string;
  pinyin: string;
  meaning: string;
  note: string;
}

export interface GrammarPoint {
  point: string;
  explanation: string;
}

export interface RecognizedWord {
  hanzi: string;
  meaning: string;
}

export interface VocabResult {
  hanzi: string;
  pinyin: string;
  meaning: string;
  example: string;
  example_translation: string;
  saved: boolean;
  alreadyKnown: boolean;
  id: number | null;
}

export interface TeachResult {
  sessionId: number;
  text: string;
  pinyin: string;
  translation: string;
  segments: Segments[];
  breakdown: Breakdown[];
  grammar: GrammarPoint[];
  notes: string[];
  recognized: RecognizedWord[];
  vocab: VocabResult[];
}

export type VocabStatus = "new" | "learning" | "known";

export interface VocabWord {
  id: number;
  hanzi: string;
  pinyin: string;
  meaning: string;
  example: string;
  example_trans: string;
  status: VocabStatus;
  box: number;
  review_count: number;
  correct_count: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  created_at: string;
}

export type Grade = "again" | "hard" | "good" | "easy";

export interface ReviewCard {
  id: number;
  hanzi: string;
  pinyin: string;
  meaning: string;
  example: string;
  example_trans: string;
  box: number;
}

export interface SessionSummary {
  id: number;
  input_text: string;
  translation: string;
  created_at: string;
  vocab_count: number;
}

export interface SessionDetail {
  id: number;
  input_text: string;
  pinyin: string;
  translation: string;
  segments: Segments[];
  breakdown: Breakdown[];
  grammar: GrammarPoint[];
  notes: string[];
  recognized: RecognizedWord[];
  created_at: string;
  vocab: VocabResult[];
}

export interface Stats {
  totalVocab: number;
  unseen: number;
  knownWords: number;
  due: number;
  sessions: number;
  reviewsToday: number;
  wordsToday: number;
}

export interface Health {
  ok: boolean;
  provider: { name: string; model: string; configured: boolean };
  stats: Stats;
}