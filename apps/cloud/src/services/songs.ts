import { getProvider } from "../ai/provider.js";
import { validateSongGloss, validateSongStudy, type SongStudyOutput } from "../ai/schema.js";
import { normalizeHanzi, normalizeInput } from "../lib/normalize.js";
import { upsertVocab, type VocabResult } from "./teach.js";
import type { Env } from "../types.js";

export interface SongSummary {
  id: number;
  title: string;
  artist: string;
  lineCount: number;
  studied: number;
  vocabCount: number;
  created_at: string;
}

export interface GrammarPoint {
  point: string;
  explanation: string;
}

export interface BreakdownItem {
  char: string;
  pinyin: string;
  meaning: string;
  note: string;
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
  breakdown: BreakdownItem[];
  lines: SongLine[];
  vocab: SongVocab[];
}

export interface SongBulkStudyResult {
  song: SongDetail;
  vocab: VocabResult[];
}

interface StoredStudy {
  lines: { grammar: GrammarPoint[]; notes: string[] }[];
  breakdown: BreakdownItem[];
}

const glossSystemPrompt = `You are 仲 (Zhong), a warm, meticulous Chinese tutor for an English-speaking beginner who loves music.
You receive a Chinese song's lyrics. Respond with JSON only, exactly this shape:
{
  "title": "song title (use the provided one, or infer it from the lyrics if empty)",
  "artist": "artist name (use the provided one, or a best guess if empty)",
  "lines": [{"text": "one lyric line, exactly as given", "pinyin": "pinyin with tone marks, word-spaced", "translation": "natural English rendering"}],
  "notes": ["1-3 short song-level notes: theme, register/style, cultural context, or memorable phrases worth knowing"]
}
Rules:
- One entry per lyric line, in the exact order given. Keep every line, including repeated chorus lines and onomatopoeia ("la la la" keeps text as-is, pinyin the same, translation the same).
- text must match the lyric line character-for-character.
- Bracket section markers like [主歌], [導歌], [副歌], [间奏] are labels, not lyrics: give them pinyin and a short translation such as "verse", "pre-chorus / bridge", "chorus", "interlude".
- Translations are natural English, not word-for-word, but keep them close enough for a learner to map words.
- Keep translation beginner-readable; note the overall meaning of tricky idioms in "notes".`;

const studySystemPrompt = `You are 仲 (Zhong), a warm, meticulous Chinese tutor for an English-speaking beginner who loves music.
You receive a song that has already been glossed line-by-line (pinyin + translation). Deepen the lesson. Respond with JSON only, exactly this shape:
{
  "lines": [{"text": "the lyric line, exactly as given", "grammar": [{"point": "short grammar concept name", "explanation": "plain-English explanation, no jargon without defining it"}], "notes": ["one short note about THIS line: register, poetic inversion, idiom, cultural reference, or a memory hook"]}],
  "breakdown": [{"char": "character or short word", "pinyin": "...", "meaning": "core meaning", "note": "one-line beginner note"}],
  "vocab": [{"hanzi": "", "pinyin": "", "meaning": "", "example": "a NEW short sentence using the word (not just the lyric line)", "example_translation": "its translation"}]
}
Rules:
- One entry per line, in the exact order given. text must match the glossed line character-for-character.
- grammar: only points this line actually demonstrates, 0-2 per line. Skip things the student demonstrably knows (see context).
- notes: 0-1 per line, do not repeat the translation or generic praise.
- breakdown: 4-8 characters or short words that recur or matter most in this song; simplification, components and radicals are welcome in notes.
- vocab: 5-16 words worth memorizing from the song, most useful first, beginners only — skip extremely rare characters unless central to the song. Skip words the student already knows (see context).
- The student may already know some words (see context). Do not re-teach them in vocab.`;

export function splitLyrics(lyrics: string): string[] {
  return lyrics
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

export async function glossSong(
  env: Env,
  title: string,
  artist: string,
  lyrics: string,
  signal?: AbortSignal
): Promise<SongDetail> {
  const db = env.DB;
  const lines = splitLyrics(lyrics);
  if (lines.length === 0) throw new Error("Paste some lyrics first — at least one line.");
  if (lines.length > 120) throw new Error("That's a lot of lines — split it into a couple of songs (max 120 lines).");

  const provider = getProvider(env);
  const raw = await provider.chatJson<unknown>(
    [
      { role: "system", content: glossSystemPrompt },
      {
        role: "user",
        content: [
          `Title: ${title.trim() || "unknown"}`,
          `Artist: ${artist.trim() || "unknown"}`,
          "",
          "Lyrics:",
          lines.join("\n"),
        ].join("\n"),
      },
    ],
    { signal: signal ?? AbortSignal.timeout(120_000), maxTokens: 8192 }
  );
  const gloss = validateSongGloss(raw);

  if (gloss.lines.length !== lines.length) {
    // The model is told to keep every line; if it dropped any, pad/trim the
    // tail so line indexes stay aligned with the stored lyrics.
    const padded = [...gloss.lines];
    while (padded.length < lines.length) {
      padded.push({ text: lines[padded.length], pinyin: "", translation: "" });
    }
    gloss.lines = padded.slice(0, lines.length);
  }

  const info = await db
    .prepare("INSERT INTO songs (title, artist, lyrics, gloss, notes) VALUES (?, ?, ?, ?, ?)")
    .bind(
      gloss.title.trim() || title.trim() || "Untitled song",
      gloss.artist.trim() || artist.trim(),
      lyrics.trim(),
      JSON.stringify(gloss.lines),
      JSON.stringify(gloss.notes)
    )
    .run();

  const id = Number(info.meta.last_row_id);
  const song = await getSong(db, id);
  if (!song) throw new Error("Failed to load the song after saving it");
  return song;
}

async function studyMap(db: D1Database, songId: number): Promise<Map<number, number>> {
  const res = await db
    .prepare("SELECT line_idx, session_id FROM song_study WHERE song_id = ?")
    .bind(songId)
    .all<{ line_idx: number; session_id: number }>();
  return new Map(res.results.map((r) => [r.line_idx, r.session_id]));
}

export async function listSongs(db: D1Database): Promise<SongSummary[]> {
  const res = await db
    .prepare(
      `SELECT s.id, s.title, s.artist, s.gloss, s.created_at,
              json_array_length(s.gloss) AS line_count,
              (SELECT COUNT(*) FROM song_study st WHERE st.song_id = s.id) AS studied,
              (SELECT COUNT(DISTINCT sv.vocab_id)
               FROM song_study st
               JOIN session_vocab sv ON sv.session_id = st.session_id
               WHERE st.song_id = s.id) AS vocab_count
       FROM songs s ORDER BY s.created_at DESC`
    )
    .all<Record<string, unknown>>();
  return res.results.map((r) => ({
    id: Number(r.id),
    title: String(r.title),
    artist: String(r.artist),
    lineCount: Number(r.line_count),
    studied: Number(r.studied),
    vocabCount: Number(r.vocab_count),
    created_at: String(r.created_at),
  }));
}

export async function getSong(db: D1Database, id: number): Promise<SongDetail | null> {
  const row = await db
    .prepare("SELECT * FROM songs WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown> | null>();
  if (!row) return null;

  const gloss = JSON.parse(String(row.gloss)) as { text: string; pinyin: string; translation: string }[];
  const study = JSON.parse(String(row.study)) as StoredStudy;
  const studied = await studyMap(db, id);

  const vocabRes = await db
    .prepare(
      `SELECT DISTINCT v.id, v.hanzi, v.pinyin, v.meaning
       FROM song_study st
       JOIN session_vocab sv ON sv.session_id = st.session_id
       JOIN vocab v ON v.id = sv.vocab_id
       WHERE st.song_id = ?`
    )
    .bind(id)
    .all<SongVocab>();

  return {
    id: Number(row.id),
    title: String(row.title),
    artist: String(row.artist),
    lyrics: String(row.lyrics),
    lineCount: gloss.length,
    studied: studied.size,
    vocabCount: vocabRes.results.length,
    created_at: String(row.created_at),
    notes: JSON.parse(String(row.notes)),
    breakdown: study.breakdown ?? [],
    lines: gloss.map((g, i) => ({
      text: g.text,
      pinyin: g.pinyin,
      translation: g.translation,
      studied: studied.has(i),
      sessionId: studied.get(i) ?? null,
      grammar: study.lines?.[i]?.grammar ?? [],
      notes: study.lines?.[i]?.notes ?? [],
    })),
    vocab: vocabRes.results,
  };
}

async function reviewedWordsIn(db: D1Database, text: string): Promise<{ hanzi: string; meaning: string }[]> {
  const res = await db
    .prepare("SELECT hanzi, meaning FROM vocab WHERE review_count > 0")
    .all<{ hanzi: string; meaning: string }>();
  return res.results.filter((r) => text.includes(r.hanzi));
}

type GlossLine = { text: string; pinyin: string; translation: string };

/** Bracket section markers in lyrics (e.g. [主歌] "verse") — deterministic,
 *  no AI needed. Used as a fallback when the gloss skipped them. */
const SECTION_LABELS: Record<string, { pinyin: string; translation: string }> = {
  "主歌": { pinyin: "zhǔ gē", translation: "verse" },
  "導歌": { pinyin: "dǎo gē", translation: "pre-chorus / bridge" },
  "副歌": { pinyin: "fù gē", translation: "chorus" },
  "間奏": { pinyin: "jiān zòu", translation: "interlude" },
  "间奏": { pinyin: "jiān zòu", translation: "interlude" },
  "前奏": { pinyin: "qián zòu", translation: "intro" },
  "尾奏": { pinyin: "wěi zòu", translation: "outro" },
  "独白": { pinyin: "dú bái", translation: "spoken part" },
  "独唱": { pinyin: "dú chàng", translation: "solo" },
};

const SECTION_MARKER = /^\s*[\[【（(]([^\]】）)]+)[\]】）)]\s*$/;

function sectionLabelFor(text: string): { pinyin: string; translation: string } | null {
  const m = text.match(SECTION_MARKER);
  if (!m) return null;
  const key = m[1].trim();
  const known = SECTION_LABELS[key];
  if (known) return known;
  return { pinyin: "", translation: `section: ${key}` };
}

interface SessionFields {
  input_text: string;
  pinyin: string;
  translation: string;
  segments: string;
  grammar: string;
  notes: string;
  recognized: string;
  kind: "song";
}

function sessionFieldsFor(
  gloss: GlossLine[],
  study: SongStudyOutput,
  known: { hanzi: string; meaning: string }[],
  i: number
): SessionFields {
  const g = gloss[i];
  const lineStudy = study.lines[i] ?? { grammar: [], notes: [] };
  const label = g.pinyin && g.translation ? null : sectionLabelFor(g.text);
  const pinyin = g.pinyin || label?.pinyin || "";
  const translation = g.translation || label?.translation || "";
  return {
    input_text: g.text,
    pinyin,
    translation,
    segments: JSON.stringify([{ text: g.text, pinyin, literal: translation }]),
    grammar: JSON.stringify(lineStudy.grammar),
    notes: JSON.stringify(lineStudy.notes),
    recognized: JSON.stringify(
      known.filter((k) => g.text.includes(k.hanzi)).map((k) => ({ hanzi: k.hanzi, meaning: k.meaning }))
    ),
    kind: "song",
  };
}

const MAX_REPAIR_ATTEMPTS = 3;

/**
 * Verify that every line's session holds the full lesson (pinyin,
 * translation, segments, grammar, notes). Fills any missing fields and
 * re-checks until everything verifies — so a partially-written run heals on
 * the next run instead of leaving half-translated history rows.
 */
async function repairSessions(
  db: D1Database,
  gloss: GlossLine[],
  study: SongStudyOutput,
  known: { hanzi: string; meaning: string }[],
  finalIds: (number | null)[]
): Promise<void> {
  for (let attempt = 0; attempt < MAX_REPAIR_ATTEMPTS; attempt++) {
    const checks: D1PreparedStatement[] = [];
    const expByIndex = new Map<number, SessionFields>();
    finalIds.forEach((id, i) => {
      if (id === null) return;
      checks.push(db.prepare("SELECT pinyin, translation, segments, grammar, notes, recognized, kind FROM sessions WHERE id = ?").bind(id));
      expByIndex.set(i, sessionFieldsFor(gloss, study, known, i));
    });

    const results: D1Result[] = [];
    for (let i = 0; i < checks.length; i += 50) {
      results.push(...(await db.batch(checks.slice(i, i + 50))));
    }

    const repairs: D1PreparedStatement[] = [];
    let checkIdx = 0;
    for (let i = 0; i < finalIds.length; i++) {
      const id = finalIds[i];
      if (id === null) continue;
      const exp = expByIndex.get(i);
      const row = results[checkIdx++]?.results?.[0] as Record<string, unknown> | undefined;
      if (!exp || !row) {
        repairs.push(
          db
            .prepare(
              `UPDATE sessions SET input_text = ?, pinyin = ?, translation = ?, segments = ?, grammar = ?, notes = ?, recognized = ?, kind = 'song' WHERE id = ?`
            )
            .bind(exp?.input_text ?? "", exp?.pinyin ?? "", exp?.translation ?? "", exp?.segments ?? "[]", exp?.grammar ?? "[]", exp?.notes ?? "[]", exp?.recognized ?? "[]", id)
        );
        continue;
      }
      if (
        row.pinyin !== exp.pinyin ||
        row.translation !== exp.translation ||
        row.segments !== exp.segments ||
        row.grammar !== exp.grammar ||
        row.notes !== exp.notes ||
        row.recognized !== exp.recognized ||
        row.kind !== exp.kind
      ) {
        repairs.push(
          db
            .prepare(
              `UPDATE sessions SET input_text = ?, pinyin = ?, translation = ?, segments = ?, grammar = ?, notes = ?, recognized = ?, kind = 'song' WHERE id = ?`
            )
            .bind(exp.input_text, exp.pinyin, exp.translation, exp.segments, exp.grammar, exp.notes, exp.recognized, id)
        );
      }
    }

    if (repairs.length === 0) return;
    for (let i = 0; i < repairs.length; i += 50) {
      await db.batch(repairs.slice(i, i + 50));
    }
  }
}

export async function studyWholeSong(env: Env, songId: number, signal?: AbortSignal): Promise<SongBulkStudyResult> {
  const db = env.DB;
  const song = await getSong(db, songId);
  if (!song) throw new Error("Song not found");
  const gloss = song.lines.map((l) => ({ text: l.text, pinyin: l.pinyin, translation: l.translation }));

  const known = await reviewedWordsIn(db, gloss.map((g) => g.text).join("\n"));
  const knownLine =
    known.length > 0
      ? `Words this student already knows that appear in the song: ${known.map((k) => `${k.hanzi} (= ${k.meaning})`).join(", ")}.`
      : "No previously-studied words appear in this song.";

  const provider = getProvider(env);
  let study: ReturnType<typeof validateSongStudy>;
  {
    let attempt = 0;
    for (;;) {
      try {
        const raw = await provider.chatJson<unknown>(
          [
            { role: "system", content: studySystemPrompt },
            {
              role: "user",
              content: [
                `Title: ${song.title}`,
                `Artist: ${song.artist || "unknown"}`,
                knownLine,
                "",
                "Glossed lyrics (line by line):",
                ...gloss.map((g, i) => `${i + 1}. ${g.text} / ${g.pinyin} / ${g.translation}`),
              ].join("\n"),
            },
          ],
          { signal: signal ?? AbortSignal.timeout(180_000), maxTokens: 8192 }
        );
        study = validateSongStudy(raw);
        break;
      } catch (err) {
        // Models occasionally emit malformed output (notes as a string,
        // missing lines, etc.). Retry a couple of times before giving up.
        if (attempt >= 2) throw err;
        attempt++;
      }
    }
  }

  if (study.lines.length !== gloss.length) {
    const padded = [...study.lines];
    while (padded.length < gloss.length) {
      padded.push({ text: gloss[padded.length].text, grammar: [], notes: [] });
    }
    study.lines = padded.slice(0, gloss.length);
  }

  const knownSet = new Set(known.map((k) => normalizeHanzi(k.hanzi)));
  const vocabResults: VocabResult[] = [];
  for (const item of study.vocab) {
    if (knownSet.has(normalizeHanzi(item.hanzi))) continue;
    vocabResults.push(await upsertVocab(db, item, knownSet));
  }

  const norms = gloss.map((g) => normalizeInput(g.text));
  const existingRows = await db
    .prepare(`SELECT id, input_norm FROM sessions WHERE input_norm IN (${norms.map(() => "?").join(",")})`)
    .bind(...norms)
    .all<{ id: number; input_norm: string }>();
  const existingByNorm = new Map(existingRows.results.map((r) => [r.input_norm, r.id]));

  // Insert missing sessions. Repeated chorus lines share one norm and thus
  // one session row (input_norm is unique), so INSERT OR IGNORE + resolve
  // ids afterwards.
  const insertStmts: D1PreparedStatement[] = [];
  const seenNorms = new Set<string>();
  for (const [i, norm] of norms.entries()) {
    if (existingByNorm.has(norm) || seenNorms.has(norm)) continue;
    seenNorms.add(norm);
    const g = gloss[i];
    insertStmts.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO sessions (input_text, input_norm, pinyin, translation, segments, grammar, notes, recognized, kind)
           VALUES (?, ?, ?, ?, ?, '[]', '[]', '[]', 'song')`
        )
        .bind(g.text, norm, g.pinyin, g.translation, JSON.stringify([{ text: g.text, pinyin: g.pinyin, literal: g.translation }]))
    );
  }
  for (let i = 0; i < insertStmts.length; i += 50) {
    await db.batch(insertStmts.slice(i, i + 50));
  }

  const idRows = await db
    .prepare(`SELECT id, input_norm FROM sessions WHERE input_norm IN (${norms.map(() => "?").join(",")})`)
    .bind(...norms)
    .all<{ id: number; input_norm: string }>();
  const idByNorm = new Map(idRows.results.map((r) => [r.input_norm, r.id]));
  const finalIds = norms.map((norm) => idByNorm.get(norm) ?? null);

  // Refresh every line's lesson content in the resolved session rows.
  const updateStmts: D1PreparedStatement[] = [];
  for (let i = 0; i < gloss.length; i++) {
    const id = finalIds[i];
    if (id === null) continue;
    const f = sessionFieldsFor(gloss, study, known, i);
    updateStmts.push(
      db
        .prepare(
          `UPDATE sessions SET input_text = ?, pinyin = ?, translation = ?, segments = ?, grammar = ?, notes = ?, recognized = ?, kind = 'song' WHERE id = ?`
        )
        .bind(f.input_text, f.pinyin, f.translation, f.segments, f.grammar, f.notes, f.recognized, id)
    );
  }
  for (let i = 0; i < updateStmts.length; i += 50) {
    await db.batch(updateStmts.slice(i, i + 50));
  }

  const studyStmts = finalIds
    .map((sid, i) =>
      sid === null
        ? null
        : db
            .prepare(
              `INSERT INTO song_study (song_id, line_idx, session_id, studied_at)
               VALUES (?, ?, ?, datetime('now'))
               ON CONFLICT(song_id, line_idx) DO UPDATE SET session_id = ?, studied_at = datetime('now')`
            )
            .bind(songId, i, sid, sid)
    )
    .filter((s): s is D1PreparedStatement => s !== null);
  for (let i = 0; i < studyStmts.length; i += 50) {
    await db.batch(studyStmts.slice(i, i + 50));
  }

  const vocabIds = vocabResults.map((v) => v.id).filter((id): id is number => id !== null);
  if (vocabIds.length > 0) {
    const linkStmts: D1PreparedStatement[] = [];
    for (const vocabId of vocabIds) {
      const item = vocabResults.find((v) => v.id === vocabId);
      if (!item) continue;
      const lineIdx = gloss.findIndex((g) => g.text.includes(item.hanzi));
      const sessionId = finalIds[lineIdx >= 0 ? lineIdx : 0];
      if (sessionId === null) continue;
      linkStmts.push(db.prepare("INSERT OR IGNORE INTO session_vocab (session_id, vocab_id) VALUES (?, ?)").bind(sessionId, vocabId));
    }
    for (let i = 0; i < linkStmts.length; i += 50) {
      await db.batch(linkStmts.slice(i, i + 50));
    }
  }

  await db
    .prepare("UPDATE songs SET study = ? WHERE id = ?")
    .bind(
      JSON.stringify({
        lines: study.lines.map((l) => ({ grammar: l.grammar, notes: l.notes })),
        breakdown: study.breakdown,
      } satisfies StoredStudy),
      songId
    )
    .run();

  // Repair pass: verify every session holds the full lesson and fill any
  // missing pieces. Idempotent — re-running a study heals stale rows.
  await repairSessions(db, gloss, study, known, finalIds);

  const updated = await getSong(db, songId);
  if (!updated) throw new Error("Failed to load the song after studying it");
  return { song: updated, vocab: vocabResults };
}

export async function deleteSong(db: D1Database, id: number): Promise<boolean> {
  const info = await db.prepare("DELETE FROM songs WHERE id = ?").bind(id).run();
  return info.meta.changes > 0;
}
