import { createBrowserClient, createServerClient as createSSRServerClient } from '@supabase/ssr'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ─── Browser client (React components, Expo) ────────────────────────────────
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

// ─── Server client (Next.js Route Handlers, Server Components) ──────────────
// Pass `cookies()` from `next/headers`
export function createServerClient(cookieStore: {
  getAll(): Array<{ name: string; value: string }>
  setAll(cookies: Array<{ name: string; value: string; options?: object }>): void
}) {
  return createSSRServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookieStore.setAll(cookiesToSet)
        } catch {
          // Server Components can't set cookies — safe to ignore
        }
      },
    },
  })
}

// ─── Admin client (server-only, uses service role key) ──────────────────────
// Only import this in server-side code (API routes, edge functions)
export function createAdminClient() {
  const { createClient } = require('@supabase/supabase-js')
  return createClient<Database>(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
