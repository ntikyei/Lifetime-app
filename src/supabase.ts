import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const supabaseConfigured =
  supabaseUrl.startsWith('https://') && supabaseKey.length > 20

export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'lifetime-auth',
      }
    })
  : (null as unknown as SupabaseClient)