import { createClient } from '@supabase/supabase-js'

// Creates a fresh server-side client using the service role key.
// Only call from route handlers — never import into client components.
export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase server credentials are not configured.')
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}
