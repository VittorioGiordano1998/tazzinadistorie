import { memo, useEffect, useRef } from 'react'

import { formatTimestamp } from '../../core/dates'
import { Button, TextArea } from '../../ui/components'
import { PlayIcon } from '../../ui/icons'
import { MAX_STORY_TEXT_LENGTH } from './storyText'
import type { Segment } from './segmentModel'

/** One sentence: its time (click to hear it) and the two optional texts. */
function SegmentCardView({
  segment,
  active,
  canEdit,
  focusRequested,
  onPlay,
  onChange,
  onSetStartHere,
  onRemove,
}: {
  segment: Segment
  /** The sentence being played right now. */
  active: boolean
  canEdit: boolean
  /** Moves the focus to the dialect field (a sentence just added). */
  focusRequested: boolean
  onPlay: (key: string) => void
  onChange: (key: string, patch: Partial<Pick<Segment, 'textDialect' | 'textItalian'>>) => void
  onSetStartHere: (key: string) => void
  onRemove: (key: string) => void
}) {
  const dialectRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (focusRequested) dialectRef.current?.focus()
  }, [focusRequested])

  return (
    <li
      className={`space-y-3 rounded-2xl p-3.5 shadow-card ring-1 transition ${
        active ? 'bg-accent-50 ring-accent-300' : 'bg-surface ring-line/60'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPlay(segment.key)}
            aria-label={`Ascolta dal punto ${formatTimestamp(segment.start)}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent-100 px-3 py-1.5 text-sm font-semibold tabular-nums text-accent-ink transition hover:bg-accent-200 active:scale-95"
          >
            <PlayIcon className="h-3.5 w-3.5" />
            {formatTimestamp(segment.start)}
          </button>
          {segment.source === 'draft' && (
            <span className="rounded-full bg-honey-soft px-2 py-0.5 text-[11px] font-semibold text-honey-ink">
              Bozza da correggere
            </span>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-1">
            <Button type="button" size="sm" variant="ghost" onClick={() => onSetStartHere(segment.key)}>
              Inizia qui
            </Button>
            <Button type="button" size="sm" variant="danger" onClick={() => onRemove(segment.key)}>
              Elimina
            </Button>
          </div>
        )}
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
          In dialetto
        </span>
        <TextArea
          ref={dialectRef}
          value={segment.textDialect}
          onChange={(event) => onChange(segment.key, { textDialect: event.target.value })}
          readOnly={!canEdit}
          lang="nap"
          // Italian spellcheck would underline every Neapolitan word.
          spellCheck={false}
          autoCapitalize="sentences"
          rows={3}
          maxLength={MAX_STORY_TEXT_LENGTH}
          placeholder={canEdit ? 'Come l’hai sentita…' : '—'}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
          In italiano
        </span>
        <TextArea
          value={segment.textItalian}
          onChange={(event) => onChange(segment.key, { textItalian: event.target.value })}
          readOnly={!canEdit}
          lang="it"
          spellCheck
          autoCapitalize="sentences"
          rows={3}
          maxLength={MAX_STORY_TEXT_LENGTH}
          placeholder={canEdit ? 'Traduzione, se vuoi…' : '—'}
        />
      </label>
    </li>
  )
}

/** Memoised: while the audio plays only the sentence that changes state re-renders. */
export const SegmentCard = memo(SegmentCardView)
