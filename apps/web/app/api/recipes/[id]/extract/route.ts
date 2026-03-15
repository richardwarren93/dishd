import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'

// POST /api/recipes/:id/extract — re-trigger AI extraction
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if ('error' in auth) return auth.error
  const { id } = await params

  const admin = createAdminClient()

  // Verify ownership
  const { data: recipe } = await admin
    .from('recipes')
    .select('id')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .single()

  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Reset status
  await admin.from('recipes').update({ extraction_status: 'pending' }).eq('id', id)

  // Upsert extraction job
  const { data: existing } = await admin
    .from('extraction_jobs')
    .select('id')
    .eq('recipe_id', id)
    .in('status', ['queued', 'running'])
    .single()

  if (!existing) {
    await admin.from('extraction_jobs').insert({ recipe_id: id, status: 'queued' })
  }

  return NextResponse.json({ queued: true })
}
