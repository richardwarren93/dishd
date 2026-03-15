import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import RecipesList from '@/components/RecipesList'

export const metadata: Metadata = { title: 'Your Recipes | dishd' }

export default async function FeedPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: recipes } = await supabase
    .from('recipes')
    .select(`
      id, user_id, source_url, title, description, image_url,
      cook_time_min, prep_time_min, servings, cuisine,
      extraction_status, is_public, notes, created_at
    `)
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Your Recipes</h1>
      </div>

      <RecipesList initialRecipes={recipes ?? []} />
    </div>
  )
}
