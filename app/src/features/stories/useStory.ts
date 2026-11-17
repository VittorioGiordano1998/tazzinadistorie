import { useCallback, useEffect, useState } from 'react'

import { audioStorage } from '../../core/audioStorage'
import { supabase } from '../../core/supabase'
import type { Segment } from './segmentModel'
import { fetchSegments, replaceSegments } from './segmentsApi'
import { rowToStory, STORY_COLUMNS } from './storyModel'
import type { Story, StoryRow } from './storyModel'

/**
 * One story (state layer): the story, its sentences, and saving them.
 * Saving is lock-safe: it only applies if the story is still at the `updated_at` it was
 * loaded with, so a change made elsewhere is never overwritten.
 */

export type SaveSegmentsResult = 'saved' | 'conflict'

export function useStory(storyId: string | undefined) {
  const [story, setStory] = useState<Story | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!storyId) {
      setStory(null)
      setSegments([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error: loadError } = await supabase
        .from('stories')
        .select(STORY_COLUMNS)
        .eq('id', storyId)
        .maybeSingle()
      if (loadError) throw new Error(loadError.message)
      if (!data) {
        setStory(null)
        setSegments([])
      } else {
        const loaded = rowToStory(data as unknown as StoryRow)
        setSegments(await fetchSegments(loaded.id))
        setStory(loaded)
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Caricamento non riuscito.')
    }
    setLoading(false)
  }, [storyId])

  useEffect(() => {
    void load()
  }, [load])

  /** Saves all the sentences. `conflict` means the story changed elsewhere: reload before retrying. */
  const saveSegments = useCallback(
    async (next: ReadonlyArray<Segment>): Promise<SaveSegmentsResult> => {
      if (!story) throw new Error('Storia non caricata.')
      const result = await replaceSegments(story.id, story.updatedAt, next)
      if (!result.ok) return 'conflict'
      await load()
      return 'saved'
    },
    [story, load],
  )

  /**
   * A playable URL for the story's audio. It depends only on the audio path, so saving
   * the sentences (which reloads the story) does not change it and restart the playback.
   */
  const audioPath = story?.audioPath
  const audioUrl = useCallback(() => {
    if (!audioPath) return Promise.reject(new Error('Storia non caricata.'))
    return audioStorage.signedUrl(audioPath)
  }, [audioPath])

  return { story, segments, loading, error, reload: load, saveSegments, audioUrl }
}
