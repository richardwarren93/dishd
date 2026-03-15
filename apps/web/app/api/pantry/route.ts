import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { UpsertPantryItemSchema } from '@dishd/shared/validators'

// GET /api/pantry
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if ('error' in auth) return auth.error

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('pantry_items')
    .select(`
      id, quantity, unit, expires_at, source, cook_log_id, created_at,
      ingredients ( id, name, category )
    `)
    .eq('user_id', auth.user.id)
    .order('expires_at', { ascending: true, nullsFirst: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

// POST /api/pantry — upsert a pantry item
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if ('error' in auth) return auth.error

  const body = await req.json()
  const parsed = UpsertPantryItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const admin = createAdminClient()
  const ingredientName = parsed.data.ingredient_name.toLowerCase().trim()

  // Get or create ingredient
  let { data: ingredient } = await admin
    .from('ingredients')
    .select('id')
    .eq('name', ingredientName)
    .single()

  if (!ingredient) {
    const { data: created } = await admin
      .from('ingredients')
      .insert({ name: ingredientName })
      .select('id')
      .single()
    ingredient = created
  }

  if (!ingredient) {
    return NextResponse.json({ error: 'Failed to create ingredient' }, { status: 500 })
  }

  // Upsert pantry item (update if exists for this user+ingredient)
  const { data, error } = await admin
    .from('pantry_items')
    .upsert({
      user_id: auth.user.id,
      ingredient_id: ingredient.id,
      quantity: parsed.data.quantity ?? null,
      unit: parsed.data.unit ?? null,
      expires_at: parsed.data.expires_at ?? null,
      source: parsed.data.source,
    }, { onConflict: 'user_id,ingredient_id' })
    .select(`
      id, quantity, unit, expires_at, source, cook_log_id, created_at,
      ingredients ( id, name, category )
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
