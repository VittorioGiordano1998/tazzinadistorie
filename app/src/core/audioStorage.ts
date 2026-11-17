import { baseMime } from './audioFormat'
import { supabase } from './supabase'

/**
 * Where story audio lives. The app only talks to this interface, so the backend
 * (Supabase Storage today) can be swapped or mirrored without touching the features.
 */
export interface AudioStorage {
  /** Stores `data` at `path` (a new object: it never overwrites). */
  upload(path: string, data: Blob, mime: string): Promise<void>
  /** The stored audio itself (used to transcribe it on the device). */
  download(path: string): Promise<Blob>
  /** Removes objects; missing ones are ignored. */
  remove(paths: string[]): Promise<void>
  /** A time-limited URL an `<audio>` element can play from. */
  signedUrl(path: string, ttlSeconds?: number): Promise<string>
}

export const AUDIO_BUCKET = 'story-audio'
const DEFAULT_URL_TTL_SECONDS = 60 * 60

function createSupabaseAudioStorage(): AudioStorage {
  const bucket = () => supabase.storage.from(AUDIO_BUCKET)
  return {
    async upload(path, data, mime) {
      const { error } = await bucket().upload(path, data, {
        // The bucket checks the plain type; the full one (with codecs) lives on the row.
        contentType: baseMime(mime) || 'application/octet-stream',
        upsert: false,
      })
      if (error) {
        if (/bucket not found/i.test(error.message)) {
          throw new Error(
            `Il bucket «${AUDIO_BUCKET}» non esiste su Supabase: applica la migrazione nel SQL Editor.`,
          )
        }
        throw new Error(error.message)
      }
    },
    async download(path) {
      const { data, error } = await bucket().download(path)
      if (error || !data) throw new Error(error?.message ?? 'Audio non disponibile.')
      return data
    },
    async remove(paths) {
      if (paths.length === 0) return
      const { error } = await bucket().remove(paths)
      if (error) throw new Error(error.message)
    },
    async signedUrl(path, ttlSeconds = DEFAULT_URL_TTL_SECONDS) {
      const { data, error } = await bucket().createSignedUrl(path, ttlSeconds)
      if (error || !data?.signedUrl) throw new Error(error?.message ?? 'URL audio non disponibile.')
      return data.signedUrl
    },
  }
}

/** The audio storage in use. */
export const audioStorage: AudioStorage = createSupabaseAudioStorage()
