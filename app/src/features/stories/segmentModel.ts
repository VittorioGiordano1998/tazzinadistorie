import type { TranscriptSegment } from '../../core/transcription'
import { sameStoredText, toStoredText } from './storyText'

/**
 * Sentences of a story, as the editor holds them. A sentence has a start time; its end
 * is never edited by hand: the database derives it (start of the next sentence, or the
 * length of the story) when the sentences are saved.
 */

export type SegmentSource = 'manual' | 'draft'

export interface Segment {
  /** Client-side identity (the row id once saved); only used as a React key. */
  key: string
  /** Seconds from the start of the audio. */
  start: number
  textDialect: string
  textItalian: string
  /** `draft` is an uncorrected automatic transcription; any human edit makes it `manual`. */
  source: SegmentSource
}

export interface SegmentRow {
  id: string
  story_id: string
  start_seconds: number | string
  end_seconds: number | string | null
  text_dialect: string | null
  text_italian: string | null
  source: SegmentSource
}

export const SEGMENT_COLUMNS = 'id, story_id, start_seconds, end_seconds, text_dialect, text_italian, source'

export interface SegmentPayload {
  start_seconds: number
  text_dialect: string | null
  text_italian: string | null
  source: SegmentSource
}

/** Times are kept to a tenth of a second: enough to find a sentence, easy to read. */
export function roundTime(seconds: number): number {
  return Math.max(0, Math.round(seconds * 10) / 10)
}

export function rowToSegment(row: SegmentRow): Segment {
  return {
    key: row.id,
    // numeric columns can come back as strings
    start: roundTime(Number(row.start_seconds)),
    textDialect: row.text_dialect ?? '',
    textItalian: row.text_italian ?? '',
    source: row.source,
  }
}

/** Chronological order; sentences with the same start keep their relative order. */
export function sortSegments(segments: ReadonlyArray<Segment>): Segment[] {
  return segments
    .map((segment, index) => ({ segment, index }))
    .sort((a, b) => a.segment.start - b.segment.start || a.index - b.index)
    .map((entry) => entry.segment)
}

export function newSegment(start: number, key: string = crypto.randomUUID()): Segment {
  return { key, start: roundTime(start), textDialect: '', textItalian: '', source: 'manual' }
}

/** Index of the sentence being played at `time`, or -1 before the first one starts. */
export function activeSegmentIndex(segments: ReadonlyArray<Segment>, time: number): number {
  let active = -1
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]
    if (segment && segment.start <= time + 0.05) active = index
    else break
  }
  return active
}

/** Turns an automatic transcription into draft sentences. */
export function segmentsFromTranscript(
  transcript: ReadonlyArray<TranscriptSegment>,
  makeKey: () => string = () => crypto.randomUUID(),
): Segment[] {
  return sortSegments(
    transcript.map((item) => ({
      key: makeKey(),
      start: roundTime(item.start),
      textDialect: item.text,
      textItalian: '',
      source: 'draft' as const,
    })),
  )
}

/** True when two lists would be stored identically (used to know if there is anything to save). */
export function segmentsEqual(a: ReadonlyArray<Segment>, b: ReadonlyArray<Segment>): boolean {
  if (a.length !== b.length) return false
  return a.every((segment, index) => {
    const other = b[index]
    return (
      other !== undefined &&
      segment.start === other.start &&
      segment.source === other.source &&
      sameStoredText(segment.textDialect, other.textDialect) &&
      sameStoredText(segment.textItalian, other.textItalian)
    )
  })
}

/** What `replace_story_segments` receives. */
export function toRpcPayload(segments: ReadonlyArray<Segment>): SegmentPayload[] {
  return sortSegments(segments).map((segment) => ({
    start_seconds: segment.start,
    text_dialect: toStoredText(segment.textDialect),
    text_italian: toStoredText(segment.textItalian),
    source: segment.source,
  }))
}
