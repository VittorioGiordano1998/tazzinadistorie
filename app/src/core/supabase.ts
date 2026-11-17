import { createClient } from '@supabase/supabase-js'

import { env, isSupabaseConfigured } from './env'

/**
 * The app's single Supabase client. Without configuration a placeholder client is
 * created: the app shows the setup screen and never calls the backend.
 */
export const supabase = createClient(
  isSupabaseConfigured ? env.supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? env.supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
)
