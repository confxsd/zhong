import { getProvider } from "../ai/provider.js";
import { validateTrackLesson } from "../ai/schema.js";
import { HSK1_GRAMMAR, HSK1_TRACK, HSK1_WORDS, type TrackGrammar, type TrackWord } from "../data/hsk1.js";
import type { Env } from "../types.js";
import type { VocabResult } from "./teach.js";

export interface TrackSummary {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  kind: string;
  total: number;
  started: number;
  mastered: number;
}

export interface TrackItemView {
  id: number;
  sort: number;
  type: "word" | "grammar";
  payload: TrackWord | TrackGrammar;
  status: "new" | "learning" | "done";
  review_count: number;
}

export interface TrackView extends TrackSummary {
  items: TrackItemView[];
}

export async function seedTracksIfEmpty(db: D1Database): Promise<void> {
  const count = await db.prepare("SELECT COUNT(*) AS c FROM tracks").first<{ c: number }>();
  if ((count?.c ?? 0) > 0) return;

  await db.prepare("INSERT OR IGNORE INTO tracks (slug, title, subtitle, kind) VALUES (?, ?, ?, ?)")
    .bind(HSK1_TRACK.slug, HSK1_TRACK.title, HSK1_TRACK.subtitle, HSK1_TRACK.kind)
    .run();
  const track = await db.prepare("SELECT id FROM tracks WHERE slug = ?")
    .bind(HSK1_TRACK.slug)
    .first<{ id: number }>();
  if (!track) return;

  const stmts = HSK1_WORDS.map((w, i) =>
    db.prepare("INSERT OR IGNORE INTO track_items (track_id, sort, type, payload) VALUES (?, ?, ?, ?)")
      .bind(track.id, i, "word", JSON.stringify(w))
  ).concat(
    HSK1_GRAMMAR.map((g, i) =>
      db.prepare("INSERT OR IGNORE INTO track_items (track_id, sort, type, payload) VALUES (?, ?, ?, ?)")
        .bind(track.id, 1000 + i, "grammar", JSON.stringify(g))
    )
  );
  await db.batch(stmts);
}

export async function listTracks(db: D1Database): Promise<TrackSummary[]> {
  const res = await db
    .prepare(
      `SELECT t.id, t.slug, t.title, t.subtitle, t.kind,
              (SELECT COUNT(*) FROM track_items ti WHERE ti.track_id = t.id) AS total,
              (SELECT COUNT(*) FROM track_items ti
                 LEFT JOIN vocab v ON ti.type = 'word' AND v.hanzi = json_extract(ti.payload, '$.hanzi')
                 WHERE ti.track_id = t.id AND (v.id IS NOT NULL OR EXISTS (
                   SELECT 1 FROM track_progress tp WHERE tp.item_id = ti.id AND tp.status != 'new'
                 ))) AS started,
              (SELECT COUNT(*) FROM track_items ti
                 LEFT JOIN vocab v ON ti.type = 'word' AND v.hanzi = json_extract(ti.payload, '$.hanzi')
                 WHERE ti.track_id = t.id AND ti.type = 'word' AND v.review_count >= 2) AS mastered
       FROM tracks t ORDER BY t.id`
    )
    .all<TrackSummary>();
  return res.results;
}

function statusOf(type: string, reviewCount: number | null, progress: string | null): TrackItemView["status"] {
  if (type === "word" && (reviewCount ?? 0) >= 2) return "done";
  if (progress === "done") return "done";
  if (type === "word" && reviewCount != null) return "learning";
  if (progress === "learning") return "learning";
  return "new";
}

export async function getTrack(db: D1Database, slug: string): Promise<TrackView | null> {
  const summary = await db
    .prepare("SELECT id, slug, title, subtitle, kind FROM tracks WHERE slug = ?")
    .bind(slug)
    .first<Omit<TrackSummary, "total" | "started" | "mastered"> | null>();
  if (!summary) return null;

  const res = await db
    .prepare(
      `SELECT ti.id, ti.sort, ti.type, ti.payload, v.review_count, tp.status AS prog
       FROM track_items ti
       LEFT JOIN vocab v ON ti.type = 'word' AND v.hanzi = json_extract(ti.payload, '$.hanzi')
       LEFT JOIN track_progress tp ON tp.item_id = ti.id
       WHERE ti.track_id = ?
       ORDER BY ti.sort`
    )
    .bind(summary.id)
    .all<{ id: number; sort: number; type: "word" | "grammar"; payload: string; review_count: number | null; prog: string | null }>();

  const views: TrackItemView[] = res.results.map((it) => ({
    id: it.id,
    sort: it.sort,
    type: it.type,
    payload: JSON.parse(it.payload),
    status: statusOf(it.type, it.review_count, it.prog),
    review_count: it.review_count ?? 0,
  }));

  return {
    ...summary,
    total: views.length,
    started: views.filter((v) => v.status !== "new").length,
    mastered: views.filter((v) => v.status === "done").length,
    items: views,
  };
}

export async function nextWords(db: D1Database, slug: string, n = 5): Promise<{ item: TrackItemView; word: TrackWord }[]> {
  const track = await getTrack(db, slug);
  if (!track) return [];
  return track.items
    .filter((it) => it.type === "word" && it.status === "new")
    .slice(0, n)
    .map((it) => ({ item: it, word: it.payload as TrackWord }));
}

export async function nextGrammar(db: D1Database, slug: string): Promise<{ item: TrackItemView; grammar: TrackGrammar } | null> {
  const track = await getTrack(db, slug);
  if (!track) return null;
  const grammar = track.items.find((it) => it.type === "grammar" && it.status !== "done");
  if (!grammar) return null;
  return { item: grammar, grammar: grammar.payload as TrackGrammar };
}

const lessonSystemPrompt = `You are 仲 (Zhong), a warm Chinese tutor. Write a tiny beginner lesson in standard Mandarin (simplified characters + pinyin).
Respond with JSON only, exactly this shape:
{
  "story_hanzi": "a 3-6 sentence mini-story that naturally uses ALL of the given words",
  "story_pinyin": "the full pinyin of the story, word-spaced, with tone marks",
  "story_translation": "natural English translation of the story",
  "sentences": [{"hanzi": "one story sentence", "pinyin": "...", "translation": "..."}],
  "notes": ["1-2 short friendly notes: memory hook, culture, or how this connects to the grammar focus"]
}
Rules:
- Beginner level. Use the given words as the core vocabulary; you may add only extremely common glue words (我, 你, 是, 的, 了, 很, 和, 在, 不, 有).
- Each story sentence must be short and simple.
- The grammar focus, if provided, should be demonstrated naturally in the story.`;

async function upsertWord(db: D1Database, word: TrackWord): Promise<number> {
  const existing = await db
    .prepare("SELECT id FROM vocab WHERE hanzi = ?")
    .bind(word.hanzi)
    .first<{ id: number } | null>();
  if (existing) return existing.id;
  const info = await db
    .prepare("INSERT INTO vocab (hanzi, pinyin, meaning, example, example_trans) VALUES (?, ?, ?, ?, ?)")
    .bind(word.hanzi, word.pinyin, word.meaning, "", "")
    .run();
  return Number(info.meta.last_row_id);
}

export interface TrackLessonResult {
  sessionId: number;
  kind: "track-lesson";
  track: { slug: string; title: string };
  text: string;
  pinyin: string;
  translation: string;
  segments: { text: string; pinyin: string; literal: string }[];
  breakdown: { char: string; pinyin: string; meaning: string; note: string }[];
  grammar: { point: string; explanation: string }[];
  notes: string[];
  recognized: { hanzi: string; meaning: string }[];
  vocab: VocabResult[];
}

export async function trackLesson(env: Env, slug: string, signal?: AbortSignal): Promise<TrackLessonResult> {
  const db = env.DB;
  const track = await getTrack(db, slug);
  if (!track) throw new Error("Track not found");

  const words = await nextWords(db, slug, 5);
  if (words.length === 0) {
    const learning = track.items.filter((it) => it.type === "word" && it.status === "learning").length;
    if (learning > 0) {
      throw new Error("No fresh words left — review the words you've already met, and the next lesson unlocks after they settle in.");
    }
    throw new Error("You've covered every word in this track — impressive. 复习 all done!");
  }

  const grammar = await nextGrammar(db, slug);

  const wordLine = words.map((w) => `${w.word.hanzi} (${w.word.pinyin} = ${w.word.meaning})`).join(", ");
  const grammarLine = grammar
    ? `Grammar focus: ${grammar.grammar.title} — ${grammar.grammar.explanation} (example: ${grammar.grammar.example} = ${grammar.grammar.example_translation}).`
    : "Grammar focus: none — keep sentences simple.";

  const provider = getProvider(env);
  const raw = await provider.chatJson<unknown>(
    [
      { role: "system", content: lessonSystemPrompt },
      {
        role: "user",
        content: [`Words to use: ${wordLine}`, grammarLine, "", "Make the story feel alive and a little playful."].join("\n"),
      },
    ],
    { signal: signal ?? AbortSignal.timeout(90_000) }
  );
  const lesson = validateTrackLesson(raw);

  const vocabResults: VocabResult[] = [];
  const linkIds: number[] = [];
  const progressStmts: D1PreparedStatement[] = [];
  for (const w of words) {
    const id = await upsertWord(db, w.word);
    linkIds.push(id);
    progressStmts.push(
      db
        .prepare(
          `INSERT INTO track_progress (track_id, item_id, status, updated_at)
           VALUES (?, ?, 'learning', datetime('now'))
           ON CONFLICT(track_id, item_id) DO UPDATE SET status = 'learning', updated_at = datetime('now')`
        )
        .bind(track.id, w.item.id)
    );
    vocabResults.push({
      hanzi: w.word.hanzi,
      pinyin: w.word.pinyin,
      meaning: w.word.meaning,
      example: "",
      example_translation: "",
      saved: true,
      alreadyKnown: false,
      id,
    });
  }
  if (grammar) {
    progressStmts.push(
      db
        .prepare(
          `INSERT INTO track_progress (track_id, item_id, status, updated_at)
           VALUES (?, ?, 'learning', datetime('now'))
           ON CONFLICT(track_id, item_id) DO UPDATE SET status = 'learning', updated_at = datetime('now')`
        )
        .bind(track.id, grammar.item.id)
    );
  }
  if (progressStmts.length > 0) await db.batch(progressStmts);

  const sessionInsert = await db
    .prepare(
      `INSERT INTO sessions (input_text, pinyin, translation, segments, breakdown, grammar, notes, recognized, kind)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'track-lesson')`
    )
    .bind(
      lesson.story_hanzi,
      lesson.story_pinyin,
      lesson.story_translation,
      JSON.stringify(lesson.sentences.map((s) => ({ text: s.hanzi, pinyin: s.pinyin, literal: s.translation }))),
      JSON.stringify(words.map((w) => ({ char: w.word.hanzi, pinyin: w.word.pinyin, meaning: w.word.meaning, note: "" }))),
      JSON.stringify(grammar ? [{ point: grammar.grammar.title, explanation: grammar.grammar.explanation }] : []),
      JSON.stringify(lesson.notes),
      JSON.stringify([])
    )
    .run();
  const sessionId = Number(sessionInsert.meta.last_row_id);

  if (linkIds.length > 0) {
    const link = (id: number) =>
      db.prepare("INSERT OR IGNORE INTO session_vocab (session_id, vocab_id) VALUES (?, ?)").bind(sessionId, id);
    await db.batch(linkIds.map(link));
  }

  return {
    sessionId,
    kind: "track-lesson",
    track: { slug: track.slug, title: track.title },
    text: lesson.story_hanzi,
    pinyin: lesson.story_pinyin,
    translation: lesson.story_translation,
    segments: lesson.sentences.map((s) => ({ text: s.hanzi, pinyin: s.pinyin, literal: s.translation })),
    breakdown: words.map((w) => ({ char: w.word.hanzi, pinyin: w.word.pinyin, meaning: w.word.meaning, note: "" })),
    grammar: grammar ? [{ point: grammar.grammar.title, explanation: grammar.grammar.explanation }] : [],
    notes: lesson.notes,
    recognized: [],
    vocab: vocabResults,
  };
}
