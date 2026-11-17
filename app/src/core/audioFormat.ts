/**
 * Audio format helpers. Recordings are stored exactly as the browser produced them
 * (no transcoding): these helpers only pick the recorder format and name the file.
 */

/**
 * Preferred `MediaRecorder` formats, best first. Opus in WebM is what Chrome on
 * Android records natively and is compact; the others are fallbacks for browsers
 * that do not offer it.
 */
export const RECORDER_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
] as const

/** First candidate the browser can record, or `null` to let it choose its default. */
export function pickRecorderMime(
  isSupported: (mime: string) => boolean = (mime) =>
    typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime),
): string | null {
  return RECORDER_MIME_CANDIDATES.find((mime) => isSupported(mime)) ?? null
}

/** `audio/webm;codecs=opus` -> `audio/webm` (what a storage `Content-Type` wants). */
export function baseMime(mime: string): string {
  return (mime.split(';')[0] ?? '').trim().toLowerCase()
}

const EXTENSIONS: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
}

/** File extension for a mime type; falls back to the file name's, then `bin`. */
export function extensionForMime(mime: string, fileName?: string): string {
  const known = EXTENSIONS[baseMime(mime)]
  if (known) return known
  const fromName = fileName?.includes('.') ? fileName.split('.').pop() : undefined
  const cleaned = (fromName ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)
  return cleaned || 'bin'
}

/** `{diary_id}/{story_id}.{ext}`: the first segment is what the storage policies read. */
export function audioPathFor(diaryId: string, storyId: string, mime: string, fileName?: string): string {
  return `${diaryId}/${storyId}.${extensionForMime(mime, fileName)}`
}
