/** Sample rate Whisper expects. */
export const WHISPER_SAMPLE_RATE = 16_000

/** Averages the channels of decoded audio into one (a mono signal). */
export function mixToMono(channels: ReadonlyArray<Float32Array>): Float32Array {
  const first = channels[0]
  if (!first) return new Float32Array(0)
  if (channels.length === 1) return first.slice()
  const mono = new Float32Array(first.length)
  for (const channel of channels) {
    for (let index = 0; index < mono.length; index += 1) mono[index] += channel[index] ?? 0
  }
  const scale = 1 / channels.length
  for (let index = 0; index < mono.length; index += 1) mono[index] *= scale
  return mono
}

/**
 * Decodes an audio file (webm/opus, m4a, mp3…) with the browser's own decoder and
 * resamples it to 16 kHz mono, the input a Whisper model wants. Runs on the main
 * thread: workers have no AudioContext.
 */
export async function decodeToMono16k(blob: Blob): Promise<Float32Array> {
  const context = new AudioContext({ sampleRate: WHISPER_SAMPLE_RATE })
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer())
    const channels: Float32Array[] = []
    for (let index = 0; index < buffer.numberOfChannels; index += 1) {
      channels.push(buffer.getChannelData(index))
    }
    return mixToMono(channels)
  } finally {
    await context.close().catch(() => undefined)
  }
}
