import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/users/:username/recipes — public recipes from a user
export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const auth = await requireAuth(req)
  if ('error' in auth) return auth.error
  const { username } = await params

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()

  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data, error } = await admin
    .from('recipes')
    .select('id, title, description, image_url, cook_time_min, cuisine, created_at')
    .eq('user_id', profile.id)
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
