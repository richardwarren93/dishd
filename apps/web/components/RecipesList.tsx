'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import RecipeCard from './RecipeCard'
import SaveRecipeForm from './SaveRecipeForm'
import { createClient } from '@/lib/supabase/client'

interface Recipe {
  id: string
  user_id?: string
  source_url: string
  title: string | null
  description: string | null
  image_url: string | null
  cook_time_min: number | null
  prep_time_min?: number | null
  servings?: number | null
  cuisine: string | null
  extraction_status: string
  is_public?: boolean
  notes?: string | null
  created_at: string
}

interface RecipesListProps {
  initialRecipes: Recipe[]
}

async function fetchRecipes(): Promise<Recipe[]> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  const res = await fetch('/api/recipes', {
    headers: {
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
  })
  
  if (!res.ok) throw new Error('Failed to fetch recipes')
  return res.json()
}

export default function RecipesList({ initialRecipes }: RecipesListProps) {
  const [optimisticRecipes, setOptimisticRecipes] = useState<Recipe[]>([])
  
  const { data: recipes } = useSWR<Recipe[]>('/api/recipes', fetchRecipes, {
    fallbackData: initialRecipes,
    revalidateOnFocus: true,
    refreshInterval: 5000, // Poll every 5s to pick up extraction updates
  })

  const handleOptimisticAdd = useCallback((recipe: Recipe) => {
    setOptimisticRecipes(prev => [recipe, ...prev])
  }, [])

  // Merge optimistic recipes with real data, filtering out temp IDs that now have real data
  const allRecipes = [...optimisticRecipes, ...(recipes ?? [])]
    .filter((recipe, index, self) => {
      // Keep optimistic recipes only if we don't have a real version with the same URL
      if (recipe.id.startsWith('temp-')) {
        const hasRealVersion = self.some(
          r => !r.id.startsWith('temp-') && r.source_url === recipe.source_url
        )
        return !hasRealVersion
      }
      return true
    })
    // Remove duplicate real recipes
    .filter((recipe, index, self) => 
      index === self.findIndex(r => r.id === recipe.id)
    )

  return (
    <>
      <SaveRecipeForm onOptimisticAdd={handleOptimisticAdd} />

      {allRecipes.length === 0 ? (
        <div className="mt-12 text-center text-stone-400">
          <p className="text-lg">No recipes yet.</p>
          <p className="text-sm mt-1">Paste a TikTok or Instagram URL above to save your first recipe.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allRecipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </>
  )
}
