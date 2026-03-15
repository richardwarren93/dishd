import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { LogCookSchema } from '@dishd/shared/validators'

// POST /api/recipes/:id/cooked — log a cook
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await req.json()
  const parsed = LogCookSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify recipe exists (own or public)
  const { data: recipe } = await admin
    .from('recipes')
    .select('id')
    .eq('id', id)
    .or(`user_id.eq.${auth.user.id},is_public.eq.true`)
    .single()

  if (!recipe) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })

  const { data, error } = await admin
    .from('cook_logs')
    .insert({
      user_id: auth.user.id,
      recipe_id: id,
      cooked_at: parsed.data.cooked_at ?? new Date().toISOString(),
      servings_made: parsed.data.servings_made ?? null,
      rating: parsed.data.rating ?? null,
      notes: parsed.data.notes ?? null,
      photo_url: parsed.data.photo_url ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
