import { getProvider } from "../ai/provider.js";
import { validateTeachOutput, z, type VocabItemInput } from "../ai/schema.js";
import { db, VocabRow } from "../db/index.js";

export type KnownWord = { hanzi: string; meaning: string; box: number };

const systemPrompt = `You are 仲 (Zhong), a warm, meticulous Chinese tutor for an English-speaking beginner.
You explain Chinese the way a great teacher would: simply, concretely, and with a personal touch.

Given a text, respond with JSON only, exactly this shape:
{
  "translation": "one natural English translation if the text is Chinese; if the text is NOT Chinese (e.g. English), a natural, beginner-friendly Chinese rendering of what it means",
  "pinyin": "full pinyin with tones, word-spaced, for the Chinese side: the text itself if it is Chinese, otherwise for the Chinese rendering",
  "segments": [{"text": "clause or phrase (Chinese)", "pinyin": "...", "literal": "word-for-word English gloss"}],
  "breakdown": [{"char": "character or short word", "pinyin": "...", "meaning": "core meaning", "note": "one-line beginner note"}],
  "grammar": [{"point": "short grammar concept name", "explanation": "plain-English explanation, no jargon without defining it"}],
  "notes": ["extra insights: register/formality, cultural context, common confusions, memory hooks, things to watch for"],
  "vocab": [{"hanzi": "", "pinyin": "", "meaning": "", "example": "a NEW short sentence using the word", "example_translation": "its translation"}]
}

Language direction:
- If the text is Chinese, teach it into English exactly as above.
- If the text has no Chinese characters (e.g. English), teach it INTO Chinese: translation is the natural Chinese way to say it, pinyin covers that Chinese, segments break the Chinese rendering into 2-6 chunks with English literal glosses, breakdown covers the characters used, vocab picks the most useful Chinese words from the rendering, and notes mention register, alternatives, and how natives would actually say it.

Rules:
- segments: break the Chinese side into 2-6 natural chunks, each with literal gloss.
- breakdown: cover every character the beginner cannot be expected to know yet (upto ~8); character simplification, components and radicals are welcome in notes.
- vocab: 2-6 words worth memorizing (single words or common 2-char words), most useful first, beginners only — skip extremely rare characters unless needed by the text.
- The beginner is at a known level (see context). Keep explanations inside their reach but don't dumb text down; add a note when a structure is above their level.
- The student may already know some words (see context). Acknowledge them where they appear in the text, and do not re-teach them in vocab.`;

function levelLabel(wordCount: number, knownCount: number): string {
  const reviewed = Math.max(0, knownCount);
  if (reviewed === 0) return "absolute beginner — define everything simply";
  if (reviewed < 30) return "beginner — has studied a few dozen words; knows the basics of 你好/我/你/etc.";
  if (reviewed < 150) return "false beginner / HSK2-ish — comfortable with basic sentences, keep grammar notes clear";
  return "intermediate-ish — can handle more nuance but keep step-by-step explanations";
}

export function knownWordsIn(text: string, limit = 12): KnownWord[] {
  const rows = db
    .prepare("SELECT hanzi, meaning, box FROM vocab WHERE review_count > 0 ORDER BY box DESC, created_at DESC LIMIT ?")
    .all(limit) as Pick<VocabRow, "hanzi" | "meaning" | "box">[];
  return rows.filter((r) => text.includes(r.hanzi));
}

function buildMessages(text: string): { messages: { role: "system" | "user"; content: string }[] } {
  const stats = db
    .prepare("SELECT COUNT(*) AS total, COUNT(CASE WHEN review_count > 0 THEN 1 END) AS reviewed FROM vocab")
    .get() as { total: number; reviewed: number };
  const known = knownWordsIn(text);
  const knownLine =
    known.length > 0
      ? `Words this student already knows that appear in the text: ${known.map((k) => `${k.hanzi} (= ${k.meaning})`).join(", ")}.`
      : "No previously-studied words appear in this text.";

  const userContent = [
    `Student level: ${levelLabel(stats.total, stats.reviewed)} (${stats.total} words studied so far).`,
    knownLine,
    "",
    "Text to teach:",
    text,
  ].join("\n");

  return { messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userContent }] };
}

export type VocabResult = z.infer<typeof vocabItemResultSchema>;

const vocabItemResultSchema = z.object({
  hanzi: z.string(),
  pinyin: z.string(),
  meaning: z.string(),
  example: z.string(),
  example_translation: z.string(),
  saved: z.boolean(),
  alreadyKnown: z.boolean(),
  id: z.number().nullable(),
});

export interface TeachResult {
  sessionId: number;
  text: string;
  pinyin: string;
  translation: string;
  segments: Awaited<ReturnType<typeof validateTeachOutput>>["segments"];
  breakdown: Awaited<ReturnType<typeof validateTeachOutput>>["breakdown"];
  grammar: Awaited<ReturnType<typeof validateTeachOutput>>["grammar"];
  notes: string[];
  recognized: { hanzi: string; meaning: string }[];
  vocab: VocabResult[];
}

function upsertVocab(item: VocabItemInput, known: Set<string>): VocabResult {
  const existing = db.prepare("SELECT id, meaning FROM vocab WHERE hanzi = ?").get(item.hanzi) as
    | Pick<VocabRow, "id" | "meaning">
    | undefined;

  if (existing) {
    const alreadyKnown = known.has(item.hanzi);
    return {
      hanzi: item.hanzi,
      pinyin: item.pinyin,
      meaning: item.meaning,
      example: item.example,
      example_translation: item.example_translation,
      saved: true,
      alreadyKnown,
      id: existing.id,
    };
  }

  const info = db
    .prepare(
      `INSERT INTO vocab (hanzi, pinyin, meaning, example, example_trans)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(item.hanzi, item.pinyin, item.meaning, item.example, item.example_translation);

  return {
    hanzi: item.hanzi,
    pinyin: item.pinyin,
    meaning: item.meaning,
    example: item.example,
    example_translation: item.example_translation,
    saved: true,
    alreadyKnown: false,
    id: Number(info.lastInsertRowid),
  };
}

export async function teach(text: string, signal?: AbortSignal): Promise<TeachResult> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Empty input — paste some Chinese text to study.");

  const { messages } = buildMessages(trimmed);
  const provider = getProvider();
  const raw = await provider.chatJson<unknown>(messages, { signal: signal ?? AbortSignal.timeout(90_000) });
  const output = validateTeachOutput(raw);

  const known = new Set(knownWordsIn(trimmed).map((k) => k.hanzi));
  const knownSetIds = new Set<number>();
  const vocabResults: VocabResult[] = [];
  for (const item of output.vocab) {
    if (known.has(item.hanzi)) continue;
    const r = upsertVocab(item, known);
    if (r.id) knownSetIds.add(r.id);
    vocabResults.push(r);
  }

  const recognized = knownWordsIn(trimmed).map((k) => ({ hanzi: k.hanzi, meaning: k.meaning }));

  const sessionInsert = db
    .prepare(
      `INSERT INTO sessions (input_text, pinyin, translation, segments, breakdown, grammar, notes, recognized)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      trimmed,
      output.pinyin,
      output.translation,
      JSON.stringify(output.segments),
      JSON.stringify(output.breakdown),
      JSON.stringify(output.grammar),
      JSON.stringify(output.notes),
      JSON.stringify(recognized)
    );
  const sessionId = Number(sessionInsert.lastInsertRowid);

  const link = db.prepare("INSERT OR IGNORE INTO session_vocab (session_id, vocab_id) VALUES (?, ?)");
  const tx = db.transaction(() => {
    for (const id of knownSetIds) link.run(sessionId, id);
  });
  tx();

  return {
    sessionId,
    text: trimmed,
    pinyin: output.pinyin,
    translation: output.translation,
    segments: output.segments,
    breakdown: output.breakdown,
    grammar: output.grammar,
    notes: output.notes,
    recognized,
    vocab: vocabResults,
  };
}