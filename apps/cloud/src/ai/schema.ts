import { z } from "zod";

export const segmentSchema = z.object({
  text: z.string(),
  pinyin: z.string(),
  literal: z.string(),
});

export const breakdownItemSchema = z.object({
  char: z.string(),
  pinyin: z.string(),
  meaning: z.string(),
  note: z.string().optional().default(""),
});

export const grammarPointSchema = z.object({
  point: z.string(),
  explanation: z.string(),
});

export const vocabItemSchema = z.object({
  hanzi: z.string(),
  pinyin: z.string(),
  meaning: z.string(),
  example: z.string().optional().default(""),
  example_translation: z.string().optional().default(""),
});

export const teachOutputSchema = z.object({
  translation: z.string(),
  pinyin: z.string(),
  segments: z.array(segmentSchema),
  breakdown: z.array(breakdownItemSchema),
  grammar: z.array(grammarPointSchema),
  notes: z.array(z.string()),
  vocab: z.array(vocabItemSchema).max(8),
});

export const trackLessonSchema = z.object({
  story_hanzi: z.string(),
  story_pinyin: z.string(),
  story_translation: z.string(),
  sentences: z.array(z.object({ hanzi: z.string(), pinyin: z.string(), translation: z.string() })).min(1),
  notes: z.array(z.string()).default([]),
});

export type TrackLessonOutput = z.infer<typeof trackLessonSchema>;

export type TeachOutput = z.infer<typeof teachOutputSchema>;
export type VocabItemInput = z.infer<typeof vocabItemSchema>;

export const gradeSchema = z.enum(["again", "hard", "good", "easy"]);

const issues = (e: unknown) => {
  if (e instanceof z.ZodError) return e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  if (e instanceof Error) return e.message;
  return String(e);
};

/** Extracts the first balanced JSON object from model output (tolerant of prose). */
export function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("No JSON object found in model output");
  return text.slice(start, end + 1);
}

export function parseTeachOutput(raw: string): TeachOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    throw new Error("Model did not return valid JSON");
  }
  return validateTeachOutput(parsed);
}

export function validateTeachOutput(parsed: unknown): TeachOutput {
  const result = teachOutputSchema.safeParse(parsed);
  if (!result.success) throw new Error(`Model output failed validation: ${issues(result.error)}`);
  return result.data;
}

export function validateTrackLesson(parsed: unknown): TrackLessonOutput {
  const result = trackLessonSchema.safeParse(parsed);
  if (!result.success) throw new Error(`Model output failed validation: ${issues(result.error)}`);
  return result.data;
}

export { z };
