const rawUrl = import.meta.env.VITE_SUPABASE_URL
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Configuration read from `.env.local` (see `.env.example`).
 * Missing values show the setup screen instead of crashing at startup.
 */
export const env = {
  supabaseUrl: typeof rawUrl === 'string' ? rawUrl.trim() : '',
  supabaseAnonKey: typeof rawAnonKey === 'string' ? rawAnonKey.trim() : '',
}

export const isSupabaseConfigured =
  env.supabaseUrl.startsWith('http') && env.supabaseAnonKey.length > 0
