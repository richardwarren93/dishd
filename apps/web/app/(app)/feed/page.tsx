import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import RecipeCard from '@/components/RecipeCard'
import SaveRecipeForm from '@/components/SaveRecipeForm'

export const metadata: Metadata = { title: 'Feed' }

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

      <SaveRecipeForm />

      {recipes && recipes.length === 0 ? (
        <div className="mt-12 text-center text-stone-400">
          <p className="text-lg">No recipes yet.</p>
          <p className="text-sm mt-1">Paste a TikTok or Instagram URL above to save your first recipe.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes?.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  )
}
