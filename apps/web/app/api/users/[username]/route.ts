import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/users/:username
export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const auth = await requireAuth(req)
  if ('error' in auth) return auth.error
  const { username } = await params

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, created_at')
    .eq('username', username)
    .single()

  if (error) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json(data)
}
