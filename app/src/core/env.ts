const rawUrl = import.meta.env.VITE_SUPABASE_URL
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const rawTranscription = import.meta.env.VITE_TRANSCRIPTION
const rawTranscriptionModel = import.meta.env.VITE_TRANSCRIPTION_MODEL

/**
 * Configuration read from `.env.local` (see `.env.example`).
 * Missing values show the setup screen instead of crashing at startup.
 */
export const env = {
  supabaseUrl: typeof rawUrl === 'string' ? rawUrl.trim() : '',
  supabaseAnonKey: typeof rawAnonKey === 'string' ? rawAnonKey.trim() : '',
  /** Which transcription provider to use: `off` (default), `mock` or `browser-whisper`. */
  transcription: typeof rawTranscription === 'string' ? rawTranscription.trim().toLowerCase() : '',
  /** Whisper model for `browser-whisper` (a Hugging Face model id). */
  transcriptionModel:
    typeof rawTranscriptionModel === 'string' && rawTranscriptionModel.trim()
      ? rawTranscriptionModel.trim()
      : 'Xenova/whisper-base',
}

export const isSupabaseConfigured =
  env.supabaseUrl.startsWith('http') && env.supabaseAnonKey.length > 0
