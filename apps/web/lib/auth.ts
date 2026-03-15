import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

/** Validate session from either cookie (web) or Authorization header (mobile).
 *  Returns { user, supabase } or a 401 NextResponse. */
export async function requireAuth(req: NextRequest) {
  const authHeader = req.headers.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    // Mobile: validate JWT directly
    const token = authHeader.slice(7)
    const admin = createAdminClient()
    const { data: { user }, error } = await admin.auth.getUser(token)
    if (error || !user) {
      return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }
    return { user, supabase: admin }
  }

  // Web: use cookie-based session
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { user, supabase }
}
