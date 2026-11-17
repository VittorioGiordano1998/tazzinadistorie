import { env } from './env'

/**
 * Automatic transcription is an OPTIONAL draft: a person always corrects it, and
 * nothing in the app depends on it. The service sits behind this interface so it
 * can be replaced or switched off by configuration (`VITE_TRANSCRIPTION`):
 *
 *   off             (default) no draft; the "Trascrivi" button is not shown
 *   mock            a fake draft, to try the screens without downloading a model
 *   browser-whisper Whisper running in the browser (free, the audio never leaves
 *                   the device)
 */

/** One transcribed stretch of audio. Times are in seconds from the start. */
export interface TranscriptSegment {
  start: number
  end: number | null
  text: string
}

export type TranscriptionPhase = 'download' | 'prepare' | 'transcribe'

export interface TranscriptionProgress {
  phase: TranscriptionPhase
  /** 0..1, or `null` when the phase has no measurable progress. */
  fraction: number | null
}

export interface TranscriptionRequest {
  audio: Blob
  /** Reports progress; may be called often. */
  onProgress?: (progress: TranscriptionProgress) => void
  /** Aborting rejects the promise with an `AbortError`. */
  signal?: AbortSignal
}

export interface TranscriptionProvider {
  readonly id: string
  /** Human-readable name, in Italian, for the interface. */
  readonly label: string
  /** A one-off cost worth telling the user about (e.g. a model download). */
  readonly firstUseNote?: string
  transcribe(request: TranscriptionRequest): Promise<TranscriptSegment[]>
}

export function abortError(): DOMException {
  return new DOMException('Trascrizione annullata.', 'AbortError')
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * Turns the chunks a Whisper pipeline returns into clean segments: text trimmed,
 * empty chunks dropped, an open end (`null`) kept as `null`, sorted by start.
 */
export function segmentsFromChunks(
  chunks: ReadonlyArray<{ timestamp: readonly [number, number | null]; text: string }>,
): TranscriptSegment[] {
  return chunks
    .map((chunk) => ({
      start: Math.max(0, Number(chunk.timestamp[0]) || 0),
      end: chunk.timestamp[1] == null ? null : Math.max(0, Number(chunk.timestamp[1]) || 0),
      text: chunk.text.replace(/\s+/g, ' ').trim(),
    }))
    .filter((segment) => segment.text !== '')
    .sort((a, b) => a.start - b.start)
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError())
      return
    }
    const timer = window.setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer)
        reject(abortError())
      },
      { once: true },
    )
  })
}

/** Fake provider: a few invented sentences after a short, visible progress. */
const mockProvider: TranscriptionProvider = {
  id: 'mock',
  label: 'Prova (frasi inventate)',
  async transcribe({ onProgress, signal }) {
    for (let step = 0; step <= 5; step += 1) {
      onProgress?.({ phase: 'transcribe', fraction: step / 5 })
      await delay(500, signal)
    }
    return [
      { start: 0, end: 6, text: 'Frase di prova numero uno, scritta dal provider finto.' },
      { start: 6, end: 13, text: 'Una seconda frase, per vedere come si dividono i tempi.' },
      { start: 13, end: null, text: 'E una terza, l’ultima.' },
    ]
  },
}

let browserProvider: Promise<TranscriptionProvider> | null = null

/** The provider chosen by configuration, or `null` when transcription is off. */
export async function getTranscriptionProvider(): Promise<TranscriptionProvider | null> {
  switch (env.transcription) {
    case 'mock':
      return mockProvider
    case 'browser-whisper':
      // Loaded on demand: the worker and the model code stay out of the main bundle.
      browserProvider ??= import('./transcriptionBrowser').then((module) =>
        module.createBrowserWhisperProvider(env.transcriptionModel),
      )
      return browserProvider
    default:
      return null
  }
}

/** True when a provider is configured (cheap: does not load anything). */
export const isTranscriptionEnabled = env.transcription === 'mock' || env.transcription === 'browser-whisper'

/** What to tell the user before the first run. */
export const transcriptionFirstUseNote: string | null =
  env.transcription === 'browser-whisper'
    ? 'La prima volta scarica il modello di trascrizione (decine di MB). Può richiedere diversi minuti: meglio dal computer che dal telefono.'
    : null
