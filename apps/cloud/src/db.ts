export type VocabRow = {
  id: number;
  hanzi: string;
  pinyin: string;
  meaning: string;
  example: string;
  example_trans: string;
  status: "new" | "learning" | "known";
  box: number;
  review_count: number;
  correct_count: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  created_at: string;
};
