'use client'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Singleton browser client — safe to call from any client component.
// Typed as SupabaseClient (no generic) so Database defaults to `any`,
// which lets .insert() / .update() accept plain objects without `never` errors.
let _client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient | null {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) return null

  _client = createClient(url, key)
  return _client
}

// Convenience check used by UI to show "setup required" state
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
