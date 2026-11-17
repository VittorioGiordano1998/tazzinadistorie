import { useCallback, useEffect, useState } from 'react'

import { audioStorage } from '../../core/audioStorage'
import { supabase } from '../../core/supabase'
import { rowToStory, STORY_COLUMNS } from './storyModel'
import type { Story, StoryRow } from './storyModel'
import { toStoredText } from './storyText'

/**
 * One story (state layer): loading it and saving its two text fields.
 * The save is optimistic-lock safe: it only applies if the row is still at the
 * `updated_at` it was loaded with, so a change made elsewhere is never overwritten.
 */

export interface StoryTexts {
  textDialect: string
  textItalian: string
}

export type SaveTextsResult = 'saved' | 'conflict'

export function useStory(storyId: string | undefined) {
  const [story, setStory] = useState<Story | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!storyId) {
      setStory(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('stories')
      .select(STORY_COLUMNS)
      .eq('id', storyId)
      .maybeSingle()
    if (loadError) {
      setError(loadError.message)
    } else {
      setStory(data ? rowToStory(data as unknown as StoryRow) : null)
      setError(null)
    }
    setLoading(false)
  }, [storyId])

  useEffect(() => {
    void load()
  }, [load])

  /** Saves both texts. `conflict` means the story changed elsewhere: reload before retrying. */
  const saveTexts = useCallback(
    async (texts: StoryTexts): Promise<SaveTextsResult> => {
      if (!story) throw new Error('Storia non caricata.')
      const { data, error: updateError } = await supabase
        .from('stories')
        .update({
          text_dialect: toStoredText(texts.textDialect),
          text_italian: toStoredText(texts.textItalian),
        })
        .eq('id', story.id)
        .eq('updated_at', story.updatedAt)
        .select(STORY_COLUMNS)
        .maybeSingle()
      if (updateError) throw new Error(updateError.message)
      if (!data) return 'conflict'
      setStory(rowToStory(data as unknown as StoryRow))
      return 'saved'
    },
    [story],
  )

  /** A playable URL for the story's audio. */
  const audioUrl = useCallback(() => {
    if (!story) return Promise.reject(new Error('Storia non caricata.'))
    return audioStorage.signedUrl(story.audioPath)
  }, [story])

  return { story, loading, error, reload: load, saveTexts, audioUrl }
}
