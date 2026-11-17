import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { baseMime } from '../../core/audioFormat'
import { defaultStoryTitle, formatDuration, formatLongDate, todayIso } from '../../core/dates'
import { readAudioDuration } from '../../core/mediaDuration'
import { AudioPlayer } from '../../ui/AudioPlayer'
import { Button, Card, ErrorBanner, Field, TextInput } from '../../ui/components'
import { ChevronLeftIcon, MicIcon, StopIcon, UploadIcon } from '../../ui/icons'
import { useToast } from '../../ui/toast'
import { useDiary } from '../diary/DiaryProvider'
import { useRecorder, useRecoverableRecordings } from './useRecorder'
import type { RecordingResult } from './useRecorder'
import { useStories } from './useStories'

/** The Supabase bucket limit (50 MB); a story is 5-10 minutes, far below it. */
const MAX_AUDIO_BYTES = 50 * 1024 * 1024

interface Draft {
  blob: Blob
  mime: string
  durationSeconds: number | null
  sessionId: string | null
  source: 'recorded' | 'uploaded'
  fileName?: string
  interrupted: boolean
}

function draftFromRecording(result: RecordingResult): Draft {
  return {
    blob: result.blob,
    mime: result.mime,
    durationSeconds: result.durationSeconds,
    sessionId: result.sessionId,
    source: 'recorded',
    interrupted: result.interrupted,
  }
}

export function RecordPage() {
  const { canRecord, loading: diaryLoading } = useDiary()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { createStory } = useStories()
  const recorder = useRecorder()
  const recoverable = useRecoverableRecordings()
  const fileInput = useRef<HTMLInputElement | null>(null)

  const [draft, setDraft] = useState<Draft | null>(null)
  const [title, setTitle] = useState('')
  const [toldOn, setToldOn] = useState(todayIso())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // A finished recording becomes the draft under review.
  const { result: recorded } = recorder
  useEffect(() => {
    if (recorded) setDraft(draftFromRecording(recorded))
  }, [recorded])

  const previewUrl = useMemo(() => (draft ? URL.createObjectURL(draft.blob) : null), [draft])
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    [previewUrl],
  )

  // Leaving with an unsaved recording would lose the story (the recovery copy aside).
  const unsaved = recorder.status === 'recording' || draft !== null
  useEffect(() => {
    if (!unsaved) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [unsaved])

  if (!diaryLoading && !canRecord) return <Navigate to="/" replace />

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    if (!baseMime(file.type).startsWith('audio/')) {
      setError('Serve un file audio (mp3, m4a, wav, ogg, webm…).')
      return
    }
    if (file.size > MAX_AUDIO_BYTES) {
      setError('Il file supera 50 MB: scegline uno più corto.')
      return
    }
    const durationSeconds = await readAudioDuration(file)
    setDraft({
      blob: file,
      mime: file.type,
      durationSeconds,
      sessionId: null,
      source: 'uploaded',
      fileName: file.name,
      interrupted: false,
    })
  }

  async function handleRecover(sessionId: string) {
    setError(null)
    const session = recoverable.sessions.find((candidate) => candidate.id === sessionId)
    if (!session) return
    const result = await recoverable.recover(session)
    if (!result) {
      await recoverable.forget(sessionId)
      setError('Di questa registrazione non è rimasto nulla.')
      return
    }
    setDraft(draftFromRecording(result))
  }

  async function handleDiscard() {
    if (!draft) return
    await recorder.discardSession(draft.sessionId)
    if (draft.sessionId) await recoverable.forget(draft.sessionId)
    setDraft(null)
    setTitle('')
    setError(null)
    recorder.reset()
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    if (!draft) return
    setError(null)
    setSaving(true)
    try {
      await createStory({
        audio: draft.blob,
        mime: draft.mime,
        fileName: draft.fileName,
        title: title.trim() || defaultStoryTitle(toldOn),
        toldOn,
        durationSeconds: draft.durationSeconds,
        source: draft.source,
      })
      // Saved: the device copy is no longer needed.
      await recorder.discardSession(draft.sessionId)
      if (draft.sessionId) await recoverable.forget(draft.sessionId)
      showToast('Storia salvata.')
      void navigate('/', { replace: true })
    } catch (err) {
      setError(
        `${err instanceof Error ? err.message : 'Salvataggio non riuscito.'} L’audio è ancora qui: puoi riprovare.`,
      )
      setSaving(false)
    }
  }

  const backLink = (
    <Link
      to="/"
      className="-ml-1 inline-flex items-center gap-1 text-sm font-semibold text-accent-ink hover:underline"
    >
      <ChevronLeftIcon className="h-4 w-4" /> Le storie
    </Link>
  )

  // ---- Review: listen back, name it, save ----
  if (draft) {
    return (
      <form onSubmit={handleSave} className="page-enter space-y-5">
        {backLink}
        <h1 className="text-[1.75rem] font-semibold leading-tight text-ink">Salva la storia</h1>

        {draft.interrupted && (
          <p className="rounded-xl bg-surface-soft px-3.5 py-2.5 text-sm text-ink-soft">
            La registrazione si è fermata da sola: ho tenuto tutto quello che c’era. Riascoltala prima
            di salvare.
          </p>
        )}

        <Card className="space-y-3">
          <AudioPlayer
            src={previewUrl ?? undefined}
            knownDuration={draft.durationSeconds}
            label="Anteprima della registrazione"
          />
          <p className="text-xs text-ink-muted">
            {draft.source === 'recorded' ? 'Registrata ora' : `File: ${draft.fileName ?? 'audio'}`}
            {draft.durationSeconds ? ` · ${formatDuration(draft.durationSeconds)}` : ''}
          </p>
        </Card>

        <Card className="space-y-4">
          <Field label="Titolo" hint="Facoltativo: se lo lasci vuoto uso la data.">
            <TextInput
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={defaultStoryTitle(toldOn)}
              maxLength={160}
            />
          </Field>
          <Field label="Data del racconto" hint={formatLongDate(toldOn)}>
            <TextInput
              type="date"
              value={toldOn}
              onChange={(event) => setToldOn(event.target.value)}
              max={todayIso()}
              required
            />
          </Field>
        </Card>

        {error && <ErrorBanner message={error} />}

        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={() => void handleDiscard()} disabled={saving}>
            Scarta
          </Button>
          <Button type="submit" loading={saving} className="flex-1">
            Salva
          </Button>
        </div>
      </form>
    )
  }

  // ---- Recording in progress ----
  if (recorder.status === 'recording') {
    return (
      <div className="page-enter flex min-h-[70dvh] flex-col items-center justify-center gap-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-rec-ink">In registrazione</p>
        <p className="font-display text-6xl font-semibold tabular-nums text-ink">
          {formatDuration(recorder.elapsed)}
        </p>
        <button
          type="button"
          onClick={recorder.stop}
          aria-label="Ferma la registrazione"
          className="relative flex h-32 w-32 items-center justify-center rounded-full bg-rec-500 text-white shadow-lift transition active:scale-95"
        >
          <span aria-hidden="true" className="rec-pulse absolute inset-0 rounded-full bg-rec-500" />
          <StopIcon className="relative h-12 w-12" />
        </button>
        <p className="max-w-xs text-pretty text-sm text-ink-muted">
          Lo schermo resta acceso. Quando ha finito di raccontare, premi per fermare.
        </p>
      </div>
    )
  }

  // ---- Start ----
  const starting = recorder.status === 'starting'
  return (
    <div className="page-enter space-y-6">
      {backLink}

      {recoverable.sessions.length > 0 && (
        <Card className="space-y-3 bg-accent-50">
          <p className="text-sm font-semibold text-ink">
            Hai {recoverable.sessions.length === 1 ? 'una registrazione' : 'delle registrazioni'} non
            salvat{recoverable.sessions.length === 1 ? 'a' : 'e'}
          </p>
          <ul className="space-y-2">
            {recoverable.sessions.map((session) => (
              <li key={session.id} className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink-soft">
                  {new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(
                    new Date(session.startedAt),
                  )}
                </span>
                <span className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => void handleRecover(session.id)}>
                    Recupera
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => void recoverable.forget(session.id)}>
                    Elimina
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-6 text-center">
        <h1 className="text-balance text-3xl font-semibold text-ink">Pronti? Il caffè è sul tavolo.</h1>
        <button
          type="button"
          onClick={() => void recorder.start()}
          disabled={starting}
          className="flex h-40 w-40 flex-col items-center justify-center gap-2 rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-lg font-semibold text-white shadow-lift transition active:scale-95 disabled:opacity-70"
        >
          <MicIcon className="h-12 w-12" />
          {starting ? 'Un attimo…' : 'Registra'}
        </button>
        {(recorder.error || error) && <ErrorBanner message={recorder.error ?? error ?? ''} />}
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="inline-flex items-center gap-2 text-sm font-semibold text-accent-ink hover:underline"
        >
          <UploadIcon className="h-4 w-4" /> Oppure carica un file audio
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(event) => void handleFile(event)}
        />
      </div>
    </div>
  )
}
