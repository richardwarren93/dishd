import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { SaveRecipeSchema } from '@dishd/shared/validators'

// GET /api/recipes — list user's recipes
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if ('error' in auth) return auth.error

  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 20
  const offset = (page - 1) * limit

  const admin = createAdminClient()
  let query = admin
    .from('recipes')
    .select(`
      id, user_id, source_url, title, description, image_url,
      cook_time_min, prep_time_min, servings, cuisine,
      extraction_status, is_public, notes, created_at, updated_at
    `)
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.ilike('title', `%${search}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

// POST /api/recipes — save a new recipe URL
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if ('error' in auth) return auth.error

  const body = await req.json()
  const parsed = SaveRecipeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const admin = createAdminClient()

  // Insert recipe row
  const { data: recipe, error: recipeError } = await admin
    .from('recipes')
    .insert({
      user_id: auth.user.id,
      source_url: parsed.data.source_url,
      notes: parsed.data.notes ?? null,
      is_public: parsed.data.is_public ?? false,
      extraction_status: 'pending',
    })
    .select()
    .single()

  if (recipeError) return NextResponse.json({ error: recipeError.message }, { status: 500 })

  // Queue extraction job
  await admin.from('extraction_jobs').insert({
    recipe_id: recipe.id,
    status: 'queued',
  })

  return NextResponse.json(recipe, { status: 201 })
}
