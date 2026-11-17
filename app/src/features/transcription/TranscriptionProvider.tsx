import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { audioStorage } from '../../core/audioStorage'
import {
  getTranscriptionProvider,
  isAbortError,
  isTranscriptionEnabled,
  transcriptionFirstUseNote,
} from '../../core/transcription'
import type { TranscriptionProgress } from '../../core/transcription'
import { useToast } from '../../ui/toast'
import { segmentsFromTranscript } from '../stories/segmentModel'
import { fetchSegments, fetchStoryUpdatedAt, replaceSegments } from '../stories/segmentsApi'
import type { Story } from '../stories/storyModel'

/**
 * Transcription jobs (state layer). The draft is optional and runs in the browser, so
 * the jobs live here, above the router: leaving the list does not stop one (closing
 * the tab does). One job runs at a time; the others wait their turn.
 *
 * A finished draft is saved as sentences marked `draft`, but only if the story still
 * has none: sentences written meanwhile are never overwritten.
 */

export interface TranscriptionJob {
  status: 'queued' | 'running' | 'error'
  progress: TranscriptionProgress | null
  error: string | null
}

interface TranscriptionContextValue {
  /** False when no provider is configured: the UI hides every transcription control. */
  enabled: boolean
  firstUseNote: string | null
  jobs: Readonly<Record<string, TranscriptionJob>>
  /** Increases every time a draft has been saved: lists refresh when it changes. */
  finishedCount: number
  start: (story: Story) => void
  cancel: (storyId: string) => void
}

const TranscriptionContext = createContext<TranscriptionContextValue | null>(null)

export function TranscriptionProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast()
  const [jobs, setJobs] = useState<Record<string, TranscriptionJob>>({})
  const [finishedCount, setFinishedCount] = useState(0)
  const queue = useRef<Story[]>([])
  const running = useRef<{ storyId: string; abort: AbortController } | null>(null)

  const setJob = useCallback((storyId: string, job: TranscriptionJob | null) => {
    setJobs((current) => {
      const next = { ...current }
      if (job) next[storyId] = job
      else delete next[storyId]
      return next
    })
  }, [])

  const pump = useCallback(async () => {
    if (running.current) return
    const story = queue.current.shift()
    if (!story) return

    const abort = new AbortController()
    running.current = { storyId: story.id, abort }
    setJob(story.id, { status: 'running', progress: { phase: 'prepare', fraction: null }, error: null })

    try {
      const provider = await getTranscriptionProvider()
      if (!provider) throw new Error('La trascrizione non è attiva.')

      const audio = await audioStorage.download(story.audioPath)
      const transcript = await provider.transcribe({
        audio,
        signal: abort.signal,
        onProgress: (progress) =>
          setJob(story.id, { status: 'running', progress, error: null }),
      })
      const drafts = segmentsFromTranscript(transcript)
      if (drafts.length === 0) throw new Error('Non ho riconosciuto nessun parlato.')

      // Re-read just before saving: the story may have changed while the model worked.
      if ((await fetchSegments(story.id)).length > 0) {
        setJob(story.id, null)
        showToast(`«${story.title}» ha già delle frasi: ho scartato la bozza.`, 'error')
        return
      }
      const updatedAt = await fetchStoryUpdatedAt(story.id)
      if (!updatedAt) throw new Error('La storia non esiste più.')
      const saved = await replaceSegments(story.id, updatedAt, drafts)
      if (!saved.ok) throw new Error('La storia è cambiata mentre trascrivevo: riprova.')

      setJob(story.id, null)
      setFinishedCount((count) => count + 1)
      showToast(`Bozza pronta: «${story.title}».`)
    } catch (err) {
      if (isAbortError(err)) {
        setJob(story.id, null)
      } else {
        setJob(story.id, {
          status: 'error',
          progress: null,
          error: err instanceof Error ? err.message : 'Trascrizione non riuscita.',
        })
      }
    } finally {
      running.current = null
      void pump()
    }
  }, [setJob, showToast])

  const start = useCallback(
    (story: Story) => {
      if (running.current?.storyId === story.id) return
      if (queue.current.some((queued) => queued.id === story.id)) return
      queue.current.push(story)
      setJob(story.id, { status: 'queued', progress: null, error: null })
      void pump()
    },
    [pump, setJob],
  )

  const cancel = useCallback(
    (storyId: string) => {
      if (running.current?.storyId === storyId) {
        running.current.abort.abort()
        return
      }
      queue.current = queue.current.filter((queued) => queued.id !== storyId)
      setJob(storyId, null)
    },
    [setJob],
  )

  // A running job is lost if the tab closes: ask first.
  const busy = Object.values(jobs).some((job) => job.status !== 'error')
  useEffect(() => {
    if (!busy) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [busy])

  const value = useMemo<TranscriptionContextValue>(
    () => ({
      enabled: isTranscriptionEnabled,
      firstUseNote: transcriptionFirstUseNote,
      jobs,
      finishedCount,
      start,
      cancel,
    }),
    [jobs, finishedCount, start, cancel],
  )

  return <TranscriptionContext.Provider value={value}>{children}</TranscriptionContext.Provider>
}

export function useTranscription(): TranscriptionContextValue {
  const ctx = useContext(TranscriptionContext)
  if (!ctx) throw new Error('useTranscription richiede TranscriptionProvider')
  return ctx
}
