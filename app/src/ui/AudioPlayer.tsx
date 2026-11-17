import { useImperativeHandle, useRef, useState } from 'react'
import type { Ref } from 'react'

import { formatDuration } from '../core/dates'
import { Spinner } from './components'
import { PauseIcon, PlayIcon } from './icons'

/** What a parent can ask of the player (e.g. "play from this sentence"). */
export interface AudioPlayerHandle {
  /** Jumps to `seconds`; plays from there unless `play` is false. */
  seekTo: (seconds: number, options?: { play?: boolean }) => void
  /** Where the playback is now, in seconds. */
  currentTime: () => number
}

/**
 * Audio player. The source is either given (`src`) or resolved lazily on the first
 * press of play (`resolveSrc`), so a long list does not sign an URL for every story.
 *
 * `knownDuration` is the stored length: recorded WebM files often report an unknown
 * duration; those are repaired on load (see `repairUnknownDuration`) so that seeking
 * works, and the stored length drives the slider meanwhile.
 */
export function AudioPlayer({
  resolveSrc,
  src,
  knownDuration,
  label,
  onTime,
  handleRef,
}: {
  /** Resolves the playable URL when the user first plays. */
  resolveSrc?: () => Promise<string>
  /** A ready URL (a local preview, or an already signed one). */
  src?: string
  knownDuration?: number | null
  label: string
  /** Called with the playback position while it moves. */
  onTime?: (seconds: number) => void
  handleRef?: Ref<AudioPlayerHandle>
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)
  const url = src ?? resolvedUrl
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [mediaDuration, setMediaDuration] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  /** A seek/play asked for before the audio was ready; applied once it is. */
  const pending = useRef<{ time: number | null; play: boolean } | null>(null)
  const repairing = useRef(false)

  const duration =
    mediaDuration && Number.isFinite(mediaDuration) ? mediaDuration : (knownDuration ?? 0)

  function report(seconds: number) {
    setCurrent(seconds)
    onTime?.(seconds)
  }

  function applyPending(audio: HTMLAudioElement) {
    const request = pending.current
    if (!request) return
    pending.current = null
    if (request.time !== null) {
      audio.currentTime = request.time
      report(request.time)
    }
    if (request.play) {
      void audio.play().catch(() => setError('Impossibile avviare la riproduzione.'))
    }
  }

  /**
   * MediaRecorder WebM has no duration in its header (`Infinity`) and cannot be sought.
   * Asking for an absurd position makes the browser scan the file and learn its real
   * length; then playback goes back to the start.
   */
  function repairUnknownDuration(audio: HTMLAudioElement) {
    repairing.current = true
    const finish = () => {
      audio.removeEventListener('timeupdate', finish)
      audio.currentTime = 0
      repairing.current = false
      if (Number.isFinite(audio.duration)) setMediaDuration(audio.duration)
      applyPending(audio)
    }
    audio.addEventListener('timeupdate', finish)
    audio.currentTime = 1e101
  }

  async function ensureSource(): Promise<boolean> {
    if (url) return true
    if (!resolveSrc) return false
    setLoading(true)
    try {
      setResolvedUrl(await resolveSrc())
      return true
    } catch (err) {
      pending.current = null
      setError(err instanceof Error ? err.message : 'Impossibile caricare l’audio.')
      return false
    } finally {
      setLoading(false)
    }
  }

  useImperativeHandle(handleRef, () => ({
    seekTo(seconds, options) {
      const play = options?.play ?? true
      const audio = audioRef.current
      if (audio && url && audio.readyState >= 1 && !repairing.current) {
        audio.currentTime = seconds
        report(seconds)
        if (play) void audio.play().catch(() => setError('Impossibile avviare la riproduzione.'))
        return
      }
      pending.current = { time: seconds, play }
      if (!url) void ensureSource()
    },
    currentTime() {
      return audioRef.current?.currentTime ?? current
    },
  }))

  async function toggle() {
    setError(null)
    const audio = audioRef.current
    if (!url) {
      pending.current = { time: null, play: true }
      await ensureSource()
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
    report(seconds)
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
            const audio = event.currentTarget
            if (audio.duration === Infinity) {
              repairUnknownDuration(audio)
              return
            }
            if (Number.isFinite(audio.duration)) setMediaDuration(audio.duration)
            applyPending(audio)
          }}
          onDurationChange={(event) => {
            const value = event.currentTarget.duration
            if (Number.isFinite(value)) setMediaDuration(value)
          }}
          onTimeUpdate={(event) => {
            if (!repairing.current) report(event.currentTarget.currentTime)
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false)
            report(0)
          }}
          onError={() => setError('Impossibile riprodurre questo audio.')}
        />
      )}
    </div>
  )
}
