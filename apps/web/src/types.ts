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

export interface TrackLessonResult extends TeachResult {
  kind: "track-lesson";
  track: { slug: string; title: string };
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
  fsrs_state: string | null;
  created_at: string;
}

export type Grade = "again" | "hard" | "good" | "easy";

export interface IntervalInfo {
  due: string;
  intervalMs: number;
}

export interface ReviewCard {
  id: number;
  hanzi: string;
  pinyin: string;
  meaning: string;
  example: string;
  example_trans: string;
  box: number;
  fsrs: { state: string; stability: number; retrievability: number };
  previews: Record<Grade, IntervalInfo>;
  context: { session_id: number; input_text: string; translation: string } | null;
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
  totalReviews: number;
  streak: number;
  retention: number;
}

export interface Health {
  ok: boolean;
  provider: { name: string; model: string; configured: boolean };
  stats: Stats;
}

export interface Plan {
  due: number;
  reviewsToday: number;
  streak: number;
  retention: number;
  newQuota: number;
  wordsToday: number;
  track: {
    slug: string;
    title: string;
    total: number;
    started: number;
    mastered: number;
    nextCount: number;
    nextPreview: string[];
  } | null;
}

export type TrackItemStatus = "new" | "learning" | "done";

export interface TrackWordPayload {
  hanzi: string;
  pinyin: string;
  meaning: string;
}

export interface TrackGrammarPayload {
  slug: string;
  title: string;
  explanation: string;
  example: string;
  example_translation: string;
}

export interface TrackItem {
  id: number;
  sort: number;
  type: "word" | "grammar";
  payload: TrackWordPayload | TrackGrammarPayload;
  status: TrackItemStatus;
  review_count: number;
}

export interface Track {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  kind: string;
  total: number;
  started: number;
  mastered: number;
  items: TrackItem[];
}

export interface SongSummary {
  id: number;
  title: string;
  artist: string;
  lineCount: number;
  studied: number;
  vocabCount: number;
  created_at: string;
}

export interface SongLine {
  text: string;
  pinyin: string;
  translation: string;
  studied: boolean;
  sessionId: number | null;
  grammar: GrammarPoint[];
  notes: string[];
}

export interface SongVocab {
  id: number;
  hanzi: string;
  pinyin: string;
  meaning: string;
}

export interface SongDetail extends SongSummary {
  lyrics: string;
  notes: string[];
  breakdown: Breakdown[];
  lines: SongLine[];
  vocab: SongVocab[];
}

export interface SongBulkStudyResult {
  song: SongDetail;
  vocab: VocabResult[];
}
