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

export type TeachOutput = z.infer<typeof teachOutputSchema>;
export type VocabItemInput = z.infer<typeof vocabItemSchema>;

export const gradeSchema = z.enum(["again", "hard", "good", "easy"]);

const issues = (e: unknown) => {
  if (e instanceof z.ZodError) return e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  if (e instanceof Error) return e.message;
  return String(e);
};

export function validateTeachOutput(parsed: unknown): TeachOutput {
  const result = teachOutputSchema.safeParse(parsed);
  if (!result.success) throw new Error(`Model output failed validation: ${issues(result.error)}`);
  return result.data;
}

export { z };
