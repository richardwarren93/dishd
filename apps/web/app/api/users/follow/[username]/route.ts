import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'

// DELETE /api/users/follow/:username
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const auth = await requireAuth(req)
  if ('error' in auth) return auth.error
  const { username } = await params

  const admin = createAdminClient()

  const { data: target } = await admin
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()

  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  await admin
    .from('follows')
    .delete()
    .eq('follower_id', auth.user.id)
    .eq('following_id', target.id)

  return NextResponse.json({ success: true })
}
