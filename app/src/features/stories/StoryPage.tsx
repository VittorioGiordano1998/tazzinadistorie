import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'

import { formatDuration, formatLongDate } from '../../core/dates'
import { AudioPlayer } from '../../ui/AudioPlayer'
import type { AudioPlayerHandle } from '../../ui/AudioPlayer'
import { Button, Card, EmptyState, ErrorBanner, Spinner } from '../../ui/components'
import { ChevronLeftIcon } from '../../ui/icons'
import { useToast } from '../../ui/toast'
import { useDiary } from '../diary/DiaryProvider'
import { TranscribeControl } from '../transcription/TranscribeControl'
import { useTranscription } from '../transcription/TranscriptionProvider'
import { SegmentCard } from './SegmentCard'
import {
  activeSegmentIndex,
  newSegment,
  roundTime,
  segmentsEqual,
  sortSegments,
} from './segmentModel'
import type { Segment } from './segmentModel'
import { useStory } from './useStory'

/**
 * A story, sentence by sentence. The player stays pinned on top so the recording can be
 * paused, replayed and marked ("a new sentence starts here") while typing below it.
 * Touching a sentence's time plays the audio from that point.
 */
export function StoryPage() {
  const { id } = useParams()
  const { canRecord } = useDiary()
  const { showToast } = useToast()
  const { finishedCount } = useTranscription()
  const { story, segments, loading, error, reload, saveSegments, audioUrl } = useStory(id)

  const player = useRef<AudioPlayerHandle | null>(null)
  const [audioSrc, setAudioSrc] = useState<string | undefined>(undefined)
  const [time, setTime] = useState(0)
  const [edited, setEdited] = useState<Segment[]>([])
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)

  // The audio URL is resolved up front: a tap on a sentence must play at once.
  const storyId = story?.id
  useEffect(() => {
    if (!storyId) return
    let active = true
    void audioUrl()
      .then((url) => {
        if (active) setAudioSrc(url)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [storyId, audioUrl])

  // The editor follows the stored sentences whenever they are (re)loaded.
  useEffect(() => {
    setEdited(segments)
  }, [segments])

  const dirty = !segmentsEqual(edited, segments)

  // Event handlers read the latest sentences from here, so they can stay stable.
  const editedRef = useRef(edited)
  useEffect(() => {
    editedRef.current = edited
  }, [edited])

  // A draft finished elsewhere (the list, a queued job): show it, unless there is
  // unsaved work here that a reload would throw away.
  const seenFinished = useRef(finishedCount)
  useEffect(() => {
    if (seenFinished.current === finishedCount) return
    seenFinished.current = finishedCount
    if (!dirty) void reload()
  }, [finishedCount, dirty, reload])

  // Unsaved words are lost on reload or close: ask first.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const active = useMemo(() => activeSegmentIndex(edited, time), [edited, time])

  const handlePlay = useCallback((key: string) => {
    const target = editedRef.current.find((segment) => segment.key === key)
    if (target) player.current?.seekTo(target.start)
  }, [])

  const handleChange = useCallback(
    (key: string, patch: Partial<Pick<Segment, 'textDialect' | 'textItalian'>>) => {
      setEdited((current) =>
        current.map((segment) =>
          // Any human edit turns a draft into a corrected sentence.
          segment.key === key ? { ...segment, ...patch, source: 'manual' } : segment,
        ),
      )
    },
    [],
  )

  const handleSetStartHere = useCallback((key: string) => {
    const now = roundTime(player.current?.currentTime() ?? 0)
    setEdited((current) =>
      sortSegments(
        current.map((segment) => (segment.key === key ? { ...segment, start: now } : segment)),
      ),
    )
  }, [])

  const handleRemove = useCallback((key: string) => {
    setEdited((current) => current.filter((segment) => segment.key !== key))
  }, [])

  function handleAddHere() {
    const now = roundTime(player.current?.currentTime() ?? 0)
    const existing = edited.find((segment) => segment.start === now)
    if (existing) {
      setFocusKey(existing.key)
      return
    }
    const created = newSegment(now)
    setEdited((current) => sortSegments([...current, created]))
    setFocusKey(created.key)
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    setSaveError(null)
    setSaving(true)
    try {
      const outcome = await saveSegments(edited)
      if (outcome === 'conflict') setConflict(true)
      else showToast('Frasi salvate.')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    } finally {
      setSaving(false)
    }
  }

  async function handleReload() {
    setConflict(false)
    setSaveError(null)
    await reload()
  }

  const back = (
    <Link
      to="/"
      className="-ml-1 inline-flex items-center gap-1 text-sm font-semibold text-accent-ink hover:underline"
    >
      <ChevronLeftIcon className="h-4 w-4" /> Le storie
    </Link>
  )

  if (loading && !story) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6 text-accent-glyph" />
      </div>
    )
  }

  if (error || !story) {
    return (
      <div className="page-enter space-y-4">
        {back}
        {error ? (
          <ErrorBanner message={error} />
        ) : (
          <EmptyState title="Storia non trovata" description="Potrebbe essere stata eliminata." />
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="page-enter space-y-5 pb-28">
      {back}

      <header className="space-y-1">
        <h1 className="text-balance text-[1.75rem] font-semibold leading-tight text-ink">
          {story.title}
        </h1>
        <p className="text-sm text-ink-muted">
          {formatLongDate(story.toldOn)}
          {story.durationSeconds ? ` · ${formatDuration(story.durationSeconds)}` : ''}
        </p>
      </header>

      {/* Pinned under the app header (about 3.8rem tall). */}
      <div className="sticky top-[3.8rem] z-20 -mx-4 space-y-2 bg-canvas/95 px-4 py-2 backdrop-blur">
        <Card className="space-y-3">
          <AudioPlayer
            label={story.title}
            knownDuration={story.durationSeconds}
            src={audioSrc}
            resolveSrc={audioUrl}
            handleRef={player}
            onTime={setTime}
          />
          {canRecord && (
            <Button type="button" variant="secondary" size="sm" onClick={handleAddHere}>
              Nuova frase qui
            </Button>
          )}
        </Card>
      </div>

      {conflict && (
        <div className="space-y-3 rounded-2xl bg-rec-soft p-4">
          <p className="text-sm text-rec-ink">
            Questa storia è stata modificata altrove (un altro dispositivo o un’altra scheda), quindi
            non ho salvato per non cancellare quelle modifiche. Copia quello che hai scritto qui sotto
            da qualche parte, poi ricarica la versione salvata.
          </p>
          <Button type="button" variant="secondary" size="sm" onClick={() => void handleReload()}>
            Ricarica la versione salvata
          </Button>
        </div>
      )}

      {edited.length === 0 ? (
        <div className="space-y-4 rounded-2xl border border-dashed border-line-strong bg-surface/50 px-5 py-8 text-center">
          <p className="font-display text-lg font-semibold text-ink">Ancora nessuna frase</p>
          <p className="mx-auto max-w-xs text-pretty text-sm text-ink-muted">
            {canRecord
              ? 'Ascolta il racconto e premi “Nuova frase qui” ogni volta che ne inizia una: poi scrivi sotto cosa dice.'
              : 'Quando verranno scritte, le frasi compariranno qui.'}
          </p>
          {canRecord && (
            <div className="flex flex-col items-center gap-2">
              <TranscribeControl story={story} showNote />
            </div>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {edited.map((segment, index) => (
            <SegmentCard
              key={segment.key}
              segment={segment}
              active={index === active}
              canEdit={canRecord}
              focusRequested={segment.key === focusKey}
              onPlay={handlePlay}
              onChange={handleChange}
              onSetStartHere={handleSetStartHere}
              onRemove={handleRemove}
            />
          ))}
        </ul>
      )}

      {saveError && <ErrorBanner message={saveError} />}

      {canRecord && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-canvas via-canvas/90 to-transparent px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8">
          <Button
            type="submit"
            loading={saving}
            disabled={!dirty}
            className="pointer-events-auto w-full max-w-xs py-3.5"
          >
            {dirty ? 'Salva le frasi' : 'Tutto salvato'}
          </Button>
        </div>
      )}
    </form>
  )
}
