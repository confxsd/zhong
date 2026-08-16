/**
 * Normalization for deduplication keys.
 *
 * Teaching the same text twice (double-click, case differences, full-width
 * punctuation, whitespace) must not create duplicate rows. These helpers
 * produce a stable key used by unique DB constraints.
 */

const LEADING_TRAILING_JUNK = /^[\s\p{P}\p{S}]+|[\s\p{P}\p{S}]+$/gu;

/** Dedup key for session input text: NFKC, collapsed whitespace, lowercase,
 *  no surrounding punctuation. */
export function normalizeInput(text: string): string {
  const collapsed = text
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const stripped = collapsed.replace(LEADING_TRAILING_JUNK, "");
  return stripped || collapsed || text.trim();
}

/** Dedup key for a hanzi word: NFKC, no whitespace at all. */
export function normalizeHanzi(hanzi: string): string {
  return hanzi.normalize("NFKC").replace(/\s+/g, "").trim();
}
