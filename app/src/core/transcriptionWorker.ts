/// <reference lib="webworker" />
import { env as hfEnv, pipeline } from '@huggingface/transformers'

/**
 * Runs Whisper off the main thread, so the page stays responsive while a story is
 * transcribed. It receives 16 kHz mono samples and answers with raw chunks; turning
 * them into segments happens on the main thread (`segmentsFromChunks`).
 */

export interface WorkerRunMessage {
  type: 'run'
  /** A Hugging Face model id, e.g. `Xenova/whisper-base`. */
  model: string
  audio: Float32Array
}

export interface RawChunk {
  timestamp: [number, number | null]
  text: string
}

export type WorkerReply =
  | { type: 'progress'; phase: 'download' | 'transcribe'; fraction: number | null }
  | { type: 'result'; chunks: RawChunk[] }
  | { type: 'error'; message: string }

interface FileProgress {
  loaded: number
  total: number
}

function reply(message: WorkerReply): void {
  self.postMessage(message)
}

function isFileProgress(info: unknown): info is { file: string; loaded: number; total: number } {
  if (typeof info !== 'object' || info === null) return false
  const candidate = info as Record<string, unknown>
  return (
    candidate.status === 'progress' &&
    typeof candidate.file === 'string' &&
    typeof candidate.loaded === 'number' &&
    typeof candidate.total === 'number'
  )
}

self.onmessage = async (event: MessageEvent<WorkerRunMessage>) => {
  const { model, audio } = event.data
  try {
    // Models come from the Hugging Face hub and are cached by the browser.
    hfEnv.allowLocalModels = false

    const files = new Map<string, FileProgress>()
    const transcriber = await pipeline('automatic-speech-recognition', model, {
      device: 'wasm',
      dtype: 'q8',
      progress_callback: (info: unknown) => {
        if (!isFileProgress(info)) return
        files.set(info.file, { loaded: info.loaded, total: info.total })
        let loaded = 0
        let total = 0
        for (const file of files.values()) {
          loaded += file.loaded
          total += file.total
        }
        reply({ type: 'progress', phase: 'download', fraction: total > 0 ? loaded / total : null })
      },
    })

    // The library reports no progress while decoding: the screen shows a plain wait.
    reply({ type: 'progress', phase: 'transcribe', fraction: null })
    const output = (await transcriber(audio, {
      language: 'italian',
      task: 'transcribe',
      return_timestamps: true,
      chunk_length_s: 30,
      stride_length_s: 5,
    })) as { text?: string; chunks?: RawChunk[] }

    const chunks: RawChunk[] =
      output.chunks && output.chunks.length > 0
        ? output.chunks
        : output.text
          ? [{ timestamp: [0, null], text: output.text }]
          : []
    reply({ type: 'result', chunks })
  } catch (error) {
    reply({
      type: 'error',
      message: error instanceof Error ? error.message : 'Trascrizione non riuscita.',
    })
  }
}
