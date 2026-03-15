import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// POST /api/webhooks/extract-complete
// Called by the extract-recipe Edge Function when extraction finishes.
// Broadcasts a Supabase Realtime event so clients update in real time.
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret')
  if (secret !== process.env.EXTRACT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { recipe_id } = await req.json()
  if (!recipe_id) return NextResponse.json({ error: 'Missing recipe_id' }, { status: 400 })

  // The Supabase Realtime postgres_changes listener on the client will already
  // pick up the UPDATE to recipes automatically.
  // This webhook is a belt-and-suspenders notification for immediate updates.

  const admin = createAdminClient()
  const { data: recipe } = await admin
    .from('recipes')
    .select('id, title, extraction_status')
    .eq('id', recipe_id)
    .single()

  return NextResponse.json({ received: true, recipe })
}
