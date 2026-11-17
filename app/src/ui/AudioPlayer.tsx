import { useRef, useState } from 'react'

import { formatDuration } from '../core/dates'
import { PauseIcon, PlayIcon } from './icons'
import { Spinner } from './components'

/**
 * Audio player. The source is resolved lazily, on the first press of play, so a long
 * list does not sign an URL for every story up front.
 *
 * `knownDuration` is the stored length: recorded WebM files often report an unknown
 * duration, in which case the stored value drives the slider.
 */
export function AudioPlayer({
  resolveSrc,
  src,
  knownDuration,
  label,
}: {
  /** Resolves the playable URL when the user first plays. */
  resolveSrc?: () => Promise<string>
  /** A ready URL (a local preview). */
  src?: string
  knownDuration?: number | null
  label: string
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)
  const url = src ?? resolvedUrl
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [mediaDuration, setMediaDuration] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const startOnReady = useRef(false)

  const duration =
    mediaDuration && Number.isFinite(mediaDuration) ? mediaDuration : (knownDuration ?? 0)

  async function toggle() {
    setError(null)
    const audio = audioRef.current
    if (!url) {
      if (!resolveSrc) return
      setLoading(true)
      try {
        startOnReady.current = true
        setResolvedUrl(await resolveSrc())
      } catch (err) {
        startOnReady.current = false
        setError(err instanceof Error ? err.message : 'Impossibile caricare l’audio.')
      } finally {
        setLoading(false)
      }
      return
    }
    if (!audio) return
    if (audio.paused) {
      try {
        await audio.play()
      } catch {
        setError('Impossibile avviare la riproduzione.')
      }
    } else {
      audio.pause()
    }
  }

  function seek(seconds: number) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = seconds
    setCurrent(seconds)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void toggle()}
          aria-label={playing ? `Metti in pausa: ${label}` : `Ascolta: ${label}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-ink transition hover:bg-accent-200 active:scale-95"
        >
          {loading ? (
            <Spinner className="h-5 w-5" />
          ) : playing ? (
            <PauseIcon className="h-5 w-5" />
          ) : (
            <PlayIcon className="h-5 w-5" />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={duration > 0 ? duration : 1}
          step={0.1}
          value={Math.min(current, duration > 0 ? duration : 1)}
          disabled={!url || duration <= 0}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label={`Posizione: ${label}`}
          className="h-1.5 min-w-0 flex-1 cursor-pointer accent-accent-600 disabled:cursor-default"
        />
        <span className="w-[4.5rem] shrink-0 text-right text-xs tabular-nums text-ink-muted">
          {formatDuration(current)} / {formatDuration(duration)}
        </span>
      </div>
      {error && <p className="text-xs text-rec-ink">{error}</p>}
      {url && (
        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onLoadedMetadata={(event) => {
            const value = event.currentTarget.duration
            if (Number.isFinite(value)) setMediaDuration(value)
            if (startOnReady.current) {
              startOnReady.current = false
              void event.currentTarget.play().catch(() => setError('Impossibile avviare la riproduzione.'))
            }
          }}
          onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false)
            setCurrent(0)
          }}
          onError={() => setError('Impossibile riprodurre questo audio.')}
        />
      )}
    </div>
  )
}
