import { Link } from 'react-router-dom'

import { formatDuration, formatLongDate } from '../../core/dates'
import { AudioPlayer } from '../../ui/AudioPlayer'
import { Card, EmptyState, ErrorBanner, PageHeader, Spinner } from '../../ui/components'
import { CupIcon, MicIcon } from '../../ui/icons'
import { useDiary } from '../diary/DiaryProvider'
import { useStories } from './useStories'

export function StoriesPage() {
  const { diary, canRecord } = useDiary()
  const { stories, loading, error, audioUrl } = useStories()

  return (
    <div className="page-enter space-y-5 pb-28">
      <PageHeader
        title="Le storie"
        description={
          stories.length > 0
            ? `${stories.length} ${stories.length === 1 ? 'racconto' : 'racconti'} in ${diary?.name ?? 'questo diario'}`
            : (diary?.name ?? undefined)
        }
      />

      {error && <ErrorBanner message={error} />}

      {loading && stories.length === 0 ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-accent-glyph" />
        </div>
      ) : stories.length === 0 && !error ? (
        <EmptyState
          icon={<CupIcon className="h-9 w-9" />}
          title="Ancora nessuna storia"
          description={
            canRecord
              ? 'Metti il caffè sul tavolo, premi “Registra” e lascia che racconti.'
              : 'Quando verranno registrate, le storie compariranno qui.'
          }
        />
      ) : (
        <ul className="space-y-3">
          {stories.map((story) => (
            <li key={story.id}>
              <Card className="space-y-3">
                <div className="space-y-0.5">
                  <h2 className="font-display text-lg font-semibold leading-snug text-ink">
                    <Link to={`/storia/${story.id}`} className="hover:underline">
                      {story.title}
                    </Link>
                  </h2>
                  <p className="text-xs text-ink-muted">
                    {formatLongDate(story.toldOn)}
                    {story.durationSeconds ? ` · ${formatDuration(story.durationSeconds)}` : ''}
                  </p>
                  {(story.textDialect || story.textItalian) && (
                    <p className="flex gap-1.5 pt-1">
                      {story.textDialect && (
                        <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[11px] font-semibold text-accent-ink">
                          Dialetto
                        </span>
                      )}
                      {story.textItalian && (
                        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
                          Italiano
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <AudioPlayer
                  label={story.title}
                  knownDuration={story.durationSeconds}
                  resolveSrc={() => audioUrl(story)}
                />
              </Card>
            </li>
          ))}
        </ul>
      )}

      {canRecord && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-canvas via-canvas/90 to-transparent px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8">
          <Link
            to="/registra"
            className="pointer-events-auto flex w-full max-w-xs items-center justify-center gap-2.5 rounded-full bg-gradient-to-br from-accent-500 to-accent-700 px-6 py-4 text-lg font-semibold text-white shadow-lift transition active:scale-[0.98]"
          >
            <MicIcon className="h-6 w-6" />
            Registra
          </Link>
        </div>
      )}
    </div>
  )
}
