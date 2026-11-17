import { supabase } from '../../core/supabase'
import { rowToSegment, SEGMENT_COLUMNS, toRpcPayload } from './segmentModel'
import type { Segment, SegmentRow } from './segmentModel'

/** Database access for a story's sentences (state layer: the only place that talks to Supabase). */

export type ReplaceResult = { ok: true; updatedAt: string } | { ok: false; reason: 'conflict' }

/** The sentences of a story, in chronological order. */
export async function fetchSegments(storyId: string): Promise<Segment[]> {
  const { data, error } = await supabase
    .from('story_segments')
    .select(SEGMENT_COLUMNS)
    .eq('story_id', storyId)
    .order('start_seconds', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as SegmentRow[]).map(rowToSegment)
}

/**
 * Replaces all the sentences of a story in one transaction. `expectedUpdatedAt` is the
 * story's `updated_at` as it was loaded: if the story changed since, nothing is written
 * and the result is a conflict.
 */
export async function replaceSegments(
  storyId: string,
  expectedUpdatedAt: string,
  segments: ReadonlyArray<Segment>,
): Promise<ReplaceResult> {
  const { data, error } = await supabase.rpc('replace_story_segments', {
    p_story: storyId,
    p_expected: expectedUpdatedAt,
    p_segments: toRpcPayload(segments),
  })
  if (error) {
    if (error.message.includes('story_changed')) return { ok: false, reason: 'conflict' }
    throw new Error(error.message)
  }
  return { ok: true, updatedAt: String(data) }
}

/** The story's current `updated_at` (what a save must match); `null` when it is gone. */
export async function fetchStoryUpdatedAt(storyId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('stories')
    .select('updated_at')
    .eq('id', storyId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? String((data as { updated_at: string }).updated_at) : null
}
