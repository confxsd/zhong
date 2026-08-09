import { describe, expect, it } from "vitest";
import { extractJson, parseTeachOutput, validateTeachOutput } from "./schema.js";

const GOOD = {
  translation: "Where are you going?",
  pinyin: "nǐ qù nǎr",
  segments: [{ text: "你去哪儿", pinyin: "nǐ qù nǎr", literal: "you go where" }],
  breakdown: [{ char: "去", pinyin: "qù", meaning: "to go", note: "going away from speaker" }],
  grammar: [{ point: "Question word 哪儿", explanation: "哪儿 means where." }],
  notes: ["Casual, common in speech."],
  vocab: [{ hanzi: "去", pinyin: "qù", meaning: "to go", example: "我去学校", example_translation: "I go to school" }],
};

describe("extractJson", () => {
  it("extracts object from wrapped prose", () => {
    expect(extractJson(`Sure! Here:\n${JSON.stringify(GOOD)}\nHope it helps`)).toBe(JSON.stringify(GOOD));
  });
  it("throws when no object exists", () => {
    expect(() => extractJson("no json here")).toThrow();
  });
});

describe("parseTeachOutput", () => {
  it("parses and validates a good response", () => {
    const out = parseTeachOutput(JSON.stringify(GOOD));
    expect(out.translation).toBe("Where are you going?");
    expect(out.vocab).toHaveLength(1);
    expect(out.breakdown[0].note).toBe("going away from speaker");
  });
  it("rejects malformed shapes", () => {
    expect(() => parseTeachOutput(JSON.stringify({ translation: 5 }))).toThrow(/validation/);
  });
  it("rejects invalid JSON", () => {
    expect(() => parseTeachOutput("{oops")).toThrow();
  });
});

describe("validateTeachOutput", () => {
  it("fills optional defaults", () => {
    const out = validateTeachOutput(JSON.parse(JSON.stringify(GOOD)));
    expect(out.vocab[0].example).not.toBeUndefined();
  });
});