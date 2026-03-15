import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { SyncPantryFromCookSchema } from '@dishd/shared/validators'

// POST /api/pantry/sync-from-cook
// After logging a cook, user chooses which leftover ingredients to add to pantry
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if ('error' in auth) return auth.error

  const body = await req.json()
  const parsed = SyncPantryFromCookSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify cook log belongs to this user
  const { data: log } = await admin
    .from('cook_logs')
    .select('id')
    .eq('id', parsed.data.cook_log_id)
    .eq('user_id', auth.user.id)
    .single()

  if (!log) return NextResponse.json({ error: 'Cook log not found' }, { status: 404 })

  const results = []
  for (const item of parsed.data.items) {
    const ingredientName = item.ingredient_name.toLowerCase().trim()

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

    if (!ingredient) continue

    const { data } = await admin
      .from('pantry_items')
      .upsert({
        user_id: auth.user.id,
        ingredient_id: ingredient.id,
        quantity: item.quantity ?? null,
        unit: item.unit ?? null,
        expires_at: item.expires_at ?? null,
        source: 'from_cook_log',
        cook_log_id: parsed.data.cook_log_id,
      }, { onConflict: 'user_id,ingredient_id' })
      .select()
      .single()

    if (data) results.push(data)
  }

  return NextResponse.json(results)
}
