import { describe, expect, it } from "vitest";
import { normalizeHanzi, normalizeInput } from "../lib/normalize.js";

describe("normalizeInput", () => {
  it("collapses whitespace and lowercases", () => {
    expect(normalizeInput("  你好  世界  ")).toBe("你好 世界");
  });
  it("strips surrounding punctuation", () => {
    expect(normalizeInput("你去哪儿？")).toBe("你去哪儿");
    expect(normalizeInput("Hello!")).toBe("hello");
  });
  it("normalizes fullwidth forms", () => {
    expect(normalizeInput("ＡＢＣ")).toBe("abc");
  });
});

describe("normalizeHanzi", () => {
  it("strips all whitespace", () => {
    expect(normalizeHanzi("打 电话")).toBe("打电话");
  });
});
