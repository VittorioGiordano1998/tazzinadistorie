import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'

import { formatDuration, formatLongDate } from '../../core/dates'
import { AudioPlayer } from '../../ui/AudioPlayer'
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  Spinner,
  TextArea,
} from '../../ui/components'
import { ChevronLeftIcon } from '../../ui/icons'
import { useToast } from '../../ui/toast'
import { useDiary } from '../diary/DiaryProvider'
import { MAX_STORY_TEXT_LENGTH, sameStoredText } from './storyText'
import { useStory } from './useStory'

/**
 * A story: the player stays pinned on top while the two optional texts are written
 * below it, so the recording can be paused and replayed without scrolling.
 */
export function StoryPage() {
  const { id } = useParams()
  const { canRecord } = useDiary()
  const { showToast } = useToast()
  const { story, loading, error, reload, saveTexts, audioUrl } = useStory(id)

  const [textDialect, setTextDialect] = useState('')
  const [textItalian, setTextItalian] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)

  // Fields follow the stored story whenever it is (re)loaded or saved.
  const storyId = story?.id
  const storedDialect = story?.textDialect
  const storedItalian = story?.textItalian
  useEffect(() => {
    setTextDialect(storedDialect ?? '')
    setTextItalian(storedItalian ?? '')
  }, [storyId, storedDialect, storedItalian])

  const dirty =
    story !== null &&
    (!sameStoredText(textDialect, story.textDialect) || !sameStoredText(textItalian, story.textItalian))

  // Unsaved words are lost on reload or close: ask first.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    setSaveError(null)
    setSaving(true)
    try {
      const outcome = await saveTexts({ textDialect, textItalian })
      if (outcome === 'conflict') setConflict(true)
      else showToast('Testi salvati.')
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
    <form onSubmit={handleSave} className="page-enter space-y-5 pb-24">
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
      <div className="sticky top-[3.8rem] z-20 -mx-4 bg-canvas/95 px-4 py-2 backdrop-blur">
        <Card>
          <AudioPlayer
            label={story.title}
            knownDuration={story.durationSeconds}
            resolveSrc={audioUrl}
          />
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

      <Field
        label="Testo in dialetto"
        hint={
          canRecord
            ? 'Scrivilo come lo senti. Facoltativo.'
            : undefined
        }
      >
        <TextArea
          value={textDialect}
          onChange={(event) => setTextDialect(event.target.value)}
          readOnly={!canRecord}
          lang="nap"
          // Italian spellcheck would underline every Neapolitan word.
          spellCheck={false}
          autoCapitalize="sentences"
          maxLength={MAX_STORY_TEXT_LENGTH}
          placeholder={canRecord ? 'Scrivi qui il racconto in dialetto…' : 'Nessun testo in dialetto.'}
        />
      </Field>

      <Field label="Traduzione in italiano" hint={canRecord ? 'Facoltativa.' : undefined}>
        <TextArea
          value={textItalian}
          onChange={(event) => setTextItalian(event.target.value)}
          readOnly={!canRecord}
          lang="it"
          spellCheck
          autoCapitalize="sentences"
          maxLength={MAX_STORY_TEXT_LENGTH}
          placeholder={canRecord ? 'Scrivi qui la traduzione…' : 'Nessuna traduzione.'}
        />
      </Field>

      {saveError && <ErrorBanner message={saveError} />}

      {canRecord && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-canvas via-canvas/90 to-transparent px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8">
          <Button
            type="submit"
            loading={saving}
            disabled={!dirty}
            className="pointer-events-auto w-full max-w-xs py-3.5"
          >
            {dirty ? 'Salva i testi' : 'Tutto salvato'}
          </Button>
        </div>
      )}
    </form>
  )
}
