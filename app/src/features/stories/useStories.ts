import { useCallback, useEffect, useState } from 'react'

import { audioPathFor } from '../../core/audioFormat'
import { audioStorage } from '../../core/audioStorage'
import { supabase } from '../../core/supabase'
import { useAuth } from '../auth/AuthProvider'
import { useDiary } from '../diary/DiaryProvider'
import { rowToStory, STORY_COLUMNS } from './storyModel'
import type { Story, StoryRow } from './storyModel'

/**
 * Stories (state layer): the diary's stories, newest first, and the creation flow
 * (upload the audio, then insert the row; a failed insert removes the upload).
 */

export interface NewStoryInput {
  audio: Blob
  /** Full mime type, e.g. `audio/webm;codecs=opus`. */
  mime: string
  /** Original file name of an uploaded file (used only to pick the extension). */
  fileName?: string
  title: string
  toldOn: string
  durationSeconds: number | null
  source: 'recorded' | 'uploaded'
}

const UPLOAD_ATTEMPTS = 3

function sortStories(stories: Story[]): Story[] {
  return [...stories].sort(
    (a, b) => b.toldOn.localeCompare(a.toldOn) || b.createdAt.localeCompare(a.createdAt),
  )
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

/** Uploads with a few retries: a dropped connection should not lose a 10-minute story. */
async function uploadWithRetry(path: string, audio: Blob, mime: string): Promise<void> {
  let lastError: unknown = null
  for (let attempt = 1; attempt <= UPLOAD_ATTEMPTS; attempt += 1) {
    try {
      await audioStorage.upload(path, audio, mime)
      return
    } catch (err) {
      lastError = err
      // The object already exists when a previous attempt actually went through.
      if (err instanceof Error && /already exists|duplicate/i.test(err.message)) return
      if (attempt < UPLOAD_ATTEMPTS) await delay(1000 * attempt)
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Caricamento dell’audio non riuscito.')
}

export function useStories() {
  const { diary } = useDiary()
  const { session } = useAuth()
  const diaryId = diary?.id ?? null
  const userId = session?.user.id ?? null

  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!diaryId) {
      setStories([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('stories')
      .select(STORY_COLUMNS)
      .eq('diary_id', diaryId)
      .order('told_on', { ascending: false })
      .order('created_at', { ascending: false })
    if (loadError) {
      setError(loadError.message)
    } else {
      setStories(((data ?? []) as unknown as StoryRow[]).map(rowToStory))
      setError(null)
    }
    setLoading(false)
  }, [diaryId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  /** Uploads the audio, then inserts the row; returns the stored story. */
  const createStory = useCallback(
    async (input: NewStoryInput): Promise<Story> => {
      if (!diaryId || !userId) throw new Error('Diario non ancora caricato.')
      const id = crypto.randomUUID()
      const path = audioPathFor(diaryId, id, input.mime, input.fileName)

      await uploadWithRetry(path, input.audio, input.mime)

      const { data, error: insertError } = await supabase
        .from('stories')
        .insert({
          id,
          diary_id: diaryId,
          created_by: userId,
          title: input.title.trim(),
          told_on: input.toldOn,
          audio_path: path,
          audio_mime: input.mime,
          audio_bytes: input.audio.size,
          duration_seconds: input.durationSeconds,
          source: input.source,
        })
        .select(STORY_COLUMNS)
        .single()
      if (insertError) {
        // Do not leave an orphan file behind (best effort).
        await audioStorage.remove([path]).catch(() => undefined)
        throw new Error(insertError.message)
      }
      const story = rowToStory(data as unknown as StoryRow)
      setStories((current) => sortStories([...current.filter((s) => s.id !== story.id), story]))
      return story
    },
    [diaryId, userId],
  )

  /** A playable URL for a story's audio. */
  const audioUrl = useCallback((story: Story) => audioStorage.signedUrl(story.audioPath), [])

  return { stories, loading, error, refresh, createStory, audioUrl }
}
