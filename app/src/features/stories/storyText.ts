/** Longest text a field may hold (mirrors the database check). */
export const MAX_STORY_TEXT_LENGTH = 100_000

/**
 * What gets stored for a text field: line endings normalised, trailing whitespace
 * dropped, and `null` when nothing is left (the database never keeps an empty string).
 */
export function toStoredText(value: string): string | null {
  const cleaned = value.replace(/\r\n?/g, '\n').trimEnd()
  return cleaned.trim() === '' ? null : cleaned
}

/** True when the two values would be stored identically. */
export function sameStoredText(a: string, b: string): boolean {
  return toStoredText(a) === toStoredText(b)
}
