import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { UpdateRecipeSchema } from '@dishd/shared/validators'

type Params = { params: Promise<{ id: string }> }

// GET /api/recipes/:id
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req)
  if ('error' in auth) return auth.error
  const { id } = await params

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('recipes')
    .select(`
      id, user_id, source_url, title, description, image_url,
      cook_time_min, prep_time_min, servings, cuisine,
      extraction_status, is_public, notes, created_at, updated_at,
      recipe_steps ( id, step_number, instruction, image_url ),
      recipe_ingredients (
        id, quantity, unit, preparation, is_optional, sort_order,
        ingredients ( id, name, category )
      ),
      recipe_tags ( tags ( id, name ) )
    `)
    .eq('id', id)
    .or(`user_id.eq.${auth.user.id},is_public.eq.true`)
    .single()

  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Sort steps and ingredients
  if (data.recipe_steps) {
    data.recipe_steps.sort((a, b) => a.step_number - b.step_number)
  }
  if (data.recipe_ingredients) {
    data.recipe_ingredients.sort((a, b) => a.sort_order - b.sort_order)
  }

  return NextResponse.json(data)
}

// PATCH /api/recipes/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await req.json()
  const parsed = UpdateRecipeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('recipes')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

// DELETE /api/recipes/:id
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req)
  if ('error' in auth) return auth.error
  const { id } = await params

  const admin = createAdminClient()
  const { error } = await admin
    .from('recipes')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
