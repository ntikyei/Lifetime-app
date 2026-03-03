import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const supabaseConfigured =
  supabaseUrl.startsWith('https://') && supabaseKey.length > 20

// Session persists for 7 days - user stays logged in automatically
// Run in Supabase SQL Editor:
// This is handled via Supabase dashboard Auth settings
// Set JWT expiry to 604800 for 7 day sessions

export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'lifetime-auth-token',
      }
    })
  : (null as unknown as SupabaseClient)