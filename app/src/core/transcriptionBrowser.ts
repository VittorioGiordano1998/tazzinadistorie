import { decodeToMono16k } from './audioDecode'
import { abortError, segmentsFromChunks } from './transcription'
import type { TranscriptionProvider, TranscriptSegment } from './transcription'
import type { WorkerReply, WorkerRunMessage } from './transcriptionWorker'

/**
 * Whisper in the browser (transformers.js, in a Web Worker): free, and the audio
 * never leaves the device. Aborting terminates the worker, which frees its memory.
 */
export function createBrowserWhisperProvider(model: string): TranscriptionProvider {
  return {
    id: 'browser-whisper',
    label: 'Whisper (sul dispositivo)',
    firstUseNote: `La prima volta scarica il modello ${model}.`,
    async transcribe({ audio, onProgress, signal }) {
      if (signal?.aborted) throw abortError()
      onProgress?.({ phase: 'prepare', fraction: null })
      const samples = await decodeToMono16k(audio)
      if (signal?.aborted) throw abortError()

      const worker = new Worker(new URL('./transcriptionWorker.ts', import.meta.url), {
        type: 'module',
      })

      return new Promise<TranscriptSegment[]>((resolve, reject) => {
        const finish = (action: () => void) => {
          signal?.removeEventListener('abort', onAbort)
          worker.terminate()
          action()
        }
        const onAbort = () => finish(() => reject(abortError()))
        signal?.addEventListener('abort', onAbort, { once: true })

        worker.onmessage = (event: MessageEvent<WorkerReply>) => {
          const message = event.data
          if (message.type === 'progress') {
            onProgress?.({ phase: message.phase, fraction: message.fraction })
          } else if (message.type === 'result') {
            finish(() => resolve(segmentsFromChunks(message.chunks)))
          } else {
            finish(() => reject(new Error(message.message)))
          }
        }
        worker.onerror = (event) => {
          finish(() => reject(new Error(event.message || 'Trascrizione non riuscita.')))
        }

        const run: WorkerRunMessage = { type: 'run', model, audio: samples }
        worker.postMessage(run, [samples.buffer])
      })
    },
  }
}
