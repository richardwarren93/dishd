import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'

// DELETE /api/pantry/:id
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if ('error' in auth) return auth.error
  const { id } = await params

  const admin = createAdminClient()
  const { error } = await admin
    .from('pantry_items')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
