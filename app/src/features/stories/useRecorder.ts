import { useCallback, useEffect, useRef, useState } from 'react'

import { pickRecorderMime } from '../../core/audioFormat'
import {
  appendBufferedChunk,
  deleteBufferedSession,
  listBufferedSessions,
  readBufferedAudio,
  startBufferedSession,
} from '../../core/recordingBuffer'
import type { BufferedSession } from '../../core/recordingBuffer'

/**
 * In-browser recording (state layer). Built for a phone on the coffee table:
 *  - the screen is kept awake while recording (Wake Lock);
 *  - every chunk is mirrored to IndexedDB, so a locked phone, a killed tab or a failed
 *    upload never loses the audio (see `useRecoverableRecordings`);
 *  - if the microphone stream ends by itself, what was captured is kept and flagged.
 */

export type RecorderStatus = 'idle' | 'starting' | 'recording' | 'stopped'

export interface RecordingResult {
  blob: Blob
  /** Full recorder mime type, e.g. `audio/webm;codecs=opus`. */
  mime: string
  /** Seconds; `null` when unknown (a recovered recording). */
  durationSeconds: number | null
  /** The IndexedDB session to delete once the story is saved. */
  sessionId: string | null
  /** True when the recording ended by itself instead of being stopped by the user. */
  interrupted: boolean
}

const TIMESLICE_MS = 3000
const AUDIO_BITS_PER_SECOND = 96_000

function describeMicError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Il microfono è bloccato: consentilo dalle impostazioni del browser e riprova.'
  if (name === 'NotFoundError') return 'Non trovo nessun microfono su questo dispositivo.'
  if (name === 'NotReadableError') return 'Il microfono è in uso da un’altra app.'
  return 'Non riesco ad avviare la registrazione.'
}

export function useRecorder() {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<RecordingResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const sessionIdRef = useRef<string | null>(null)
  const startedAtRef = useRef(0)
  const timerRef = useRef<number | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const userStoppedRef = useRef(false)

  const releaseResources = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    void wakeLockRef.current?.release().catch(() => undefined)
    wakeLockRef.current = null
  }, [])

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator && !wakeLockRef.current) {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null
        })
      }
    } catch {
      // Not available or refused: recording still works, the screen just may dim.
    }
  }, [])

  // The browser drops the wake lock when the tab is hidden: take it back on return.
  useEffect(() => {
    if (status !== 'recording') return
    const onVisible = () => {
      if (document.visibilityState === 'visible') void requestWakeLock()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [status, requestWakeLock])

  const start = useCallback(async () => {
    setError(null)
    setResult(null)
    setElapsed(0)
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Questo browser non può registrare. Prova con Chrome, oppure carica un file.')
      return
    }
    setStatus('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } })
      streamRef.current = stream

      const chosen = pickRecorderMime()
      const recorder = new MediaRecorder(stream, {
        ...(chosen ? { mimeType: chosen } : {}),
        audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
      })
      const mime = recorder.mimeType || chosen || 'audio/webm'

      const sessionId = crypto.randomUUID()
      sessionIdRef.current = sessionId
      chunksRef.current = []
      userStoppedRef.current = false
      let chunkIndex = 0
      let bufferReady = true
      await startBufferedSession({ id: sessionId, mime, startedAt: new Date().toISOString() }).catch(
        () => {
          bufferReady = false
        },
      )

      recorder.ondataavailable = (event) => {
        if (event.data.size === 0) return
        chunksRef.current.push(event.data)
        if (bufferReady) {
          const index = chunkIndex
          chunkIndex += 1
          void appendBufferedChunk(sessionId, index, event.data).catch(() => undefined)
        }
      }
      recorder.onerror = () => {
        if (recorder.state !== 'inactive') recorder.stop()
      }
      recorder.onstop = () => {
        const seconds = (Date.now() - startedAtRef.current) / 1000
        const blob = new Blob(chunksRef.current, { type: mime })
        releaseResources()
        recorderRef.current = null
        if (blob.size === 0) {
          setError('Non è stato registrato nulla.')
          setStatus('idle')
          return
        }
        setElapsed(seconds)
        setResult({
          blob,
          mime,
          durationSeconds: seconds,
          sessionId: bufferReady ? sessionId : null,
          interrupted: !userStoppedRef.current,
        })
        setStatus('stopped')
      }

      // The stream ending by itself (permission revoked, another app took the mic).
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          if (recorder.state !== 'inactive') recorder.stop()
        }
      })

      recorderRef.current = recorder
      startedAtRef.current = Date.now()
      recorder.start(TIMESLICE_MS)
      timerRef.current = window.setInterval(() => {
        setElapsed((Date.now() - startedAtRef.current) / 1000)
      }, 500)
      await requestWakeLock()
      setStatus('recording')
    } catch (err) {
      releaseResources()
      recorderRef.current = null
      setError(describeMicError(err))
      setStatus('idle')
    }
  }, [releaseResources, requestWakeLock])

  const stop = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    userStoppedRef.current = true
    recorder.stop()
  }, [])

  /** Back to the start screen. The IndexedDB copy is kept unless `discardSession` is called. */
  const reset = useCallback(() => {
    setResult(null)
    setElapsed(0)
    setError(null)
    setStatus('idle')
  }, [])

  /** Deletes the IndexedDB copy of a recording (after a save, or when discarding). */
  const discardSession = useCallback(async (sessionId: string | null) => {
    if (sessionId) await deleteBufferedSession(sessionId).catch(() => undefined)
  }, [])

  // Leaving the screen mid-recording stops the recorder but keeps the IndexedDB copy:
  // it will be offered for recovery next time.
  useEffect(
    () => () => {
      const recorder = recorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null
        recorder.stop()
      }
      releaseResources()
    },
    [releaseResources],
  )

  return { status, elapsed, result, error, start, stop, reset, discardSession }
}

/** Recordings that never made it into a story: found in IndexedDB when the screen opens. */
export function useRecoverableRecordings() {
  const [sessions, setSessions] = useState<BufferedSession[]>([])

  useEffect(() => {
    let active = true
    void listBufferedSessions()
      .then((found) => {
        if (active) setSessions(found)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  const recover = useCallback(async (session: BufferedSession): Promise<RecordingResult | null> => {
    const blob = await readBufferedAudio(session)
    if (!blob) return null
    return {
      blob,
      mime: session.mime,
      durationSeconds: null,
      sessionId: session.id,
      interrupted: true,
    }
  }, [])

  const forget = useCallback(async (sessionId: string) => {
    await deleteBufferedSession(sessionId).catch(() => undefined)
    setSessions((current) => current.filter((session) => session.id !== sessionId))
  }, [])

  return { sessions, recover, forget }
}
