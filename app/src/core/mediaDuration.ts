/**
 * Length in seconds of an audio file, read from its metadata; `null` when the browser
 * cannot tell (some containers, e.g. recorded WebM, carry no duration).
 */
export function readAudioDuration(file: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()
    const finish = (value: number | null) => {
      audio.removeAttribute('src')
      URL.revokeObjectURL(url)
      resolve(value)
    }
    const timeout = window.setTimeout(() => finish(null), 8000)
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      window.clearTimeout(timeout)
      finish(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null)
    }
    audio.onerror = () => {
      window.clearTimeout(timeout)
      finish(null)
    }
    audio.src = url
  })
}
