import type { TranscriptionProgress } from '../../core/transcription'
import { Button, Spinner } from '../../ui/components'
import type { Story } from '../stories/storyModel'
import { useTranscription } from './TranscriptionProvider'

function progressLabel(progress: TranscriptionProgress | null): string {
  if (!progress) return 'Trascrivo…'
  if (progress.phase === 'download') {
    return progress.fraction === null
      ? 'Scarico il modello…'
      : `Scarico il modello… ${Math.round(progress.fraction * 100)}%`
  }
  if (progress.phase === 'prepare') return 'Preparo l’audio…'
  return 'Trascrivo… (può richiedere alcuni minuti)'
}

/**
 * "Trascrivi" button and the state of its job. Renders nothing when transcription is
 * not configured. The result is a draft to correct, never the final text.
 */
export function TranscribeControl({
  story,
  showNote = false,
}: {
  story: Story
  /** Show the one-off note (e.g. the model download) under the button. */
  showNote?: boolean
}) {
  const { enabled, firstUseNote, jobs, start, cancel } = useTranscription()
  if (!enabled) return null
  const job = jobs[story.id]

  if (job?.status === 'running' || job?.status === 'queued') {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-soft px-3.5 py-2.5">
        <span className="flex min-w-0 items-center gap-2 text-sm text-ink-soft">
          <Spinner className="h-4 w-4 shrink-0 text-accent-glyph" />
          <span className="min-w-0">
            {job.status === 'queued' ? 'In coda…' : progressLabel(job.progress)}
          </span>
        </span>
        <Button size="sm" variant="ghost" onClick={() => cancel(story.id)}>
          Annulla
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {job?.status === 'error' && (
        <p role="alert" className="rounded-xl bg-rec-soft px-3.5 py-2.5 text-sm text-rec-ink">
          {job.error}
        </p>
      )}
      <Button size="sm" variant="secondary" onClick={() => start(story)}>
        {job?.status === 'error' ? 'Riprova a trascrivere' : 'Trascrivi'}
      </Button>
      {showNote && firstUseNote && <p className="text-xs text-ink-muted">{firstUseNote}</p>}
    </div>
  )
}
