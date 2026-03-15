import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { FollowUserSchema } from '@dishd/shared/validators'

// POST /api/users/follow
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if ('error' in auth) return auth.error

  const body = await req.json()
  const parsed = FollowUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: target } = await admin
    .from('profiles')
    .select('id')
    .eq('username', parsed.data.username)
    .single()

  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (target.id === auth.user.id) return NextResponse.json({ error: "Can't follow yourself" }, { status: 400 })

  const { error } = await admin
    .from('follows')
    .upsert({ follower_id: auth.user.id, following_id: target.id })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
