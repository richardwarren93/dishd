'use client'

import { useState, useCallback, useEffect } from 'react'
import RecipeCard from './RecipeCard'
import SaveRecipeForm from './SaveRecipeForm'
import { createClient } from '@/lib/supabase/client'

// Optimistic UI for instant recipe saving - no SWR dependency

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

export default function RecipesList({ initialRecipes }: RecipesListProps) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes)
  const [optimisticRecipes, setOptimisticRecipes] = useState<Recipe[]>([])
  const supabase = createClient()

  // Poll for updates to pick up extraction status changes
  useEffect(() => {
    const fetchRecipes = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/recipes', {
        headers: {
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
      })
      if (res.ok) {
        const data = await res.json()
        setRecipes(data)
        // Clear optimistic recipes that now have real data
        setOptimisticRecipes(prev => 
          prev.filter(opt => !data.some((r: Recipe) => r.source_url === opt.source_url))
        )
      }
    }

    const interval = setInterval(fetchRecipes, 5000)
    return () => clearInterval(interval)
  }, [supabase])

  const handleOptimisticAdd = useCallback((recipe: Recipe) => {
    setOptimisticRecipes(prev => [recipe, ...prev])
  }, [])

  const handleRecipeSaved = useCallback(async () => {
    // Fetch updated list after save completes
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/recipes', {
      headers: {
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
    })
    if (res.ok) {
      const data = await res.json()
      setRecipes(data)
      setOptimisticRecipes([])
    }
  }, [supabase])

  // Merge optimistic recipes with real data
  const allRecipes = [...optimisticRecipes, ...recipes]
    .filter((recipe, index, self) => 
      index === self.findIndex(r => r.id === recipe.id)
    )

  return (
    <>
      <SaveRecipeForm 
        onOptimisticAdd={handleOptimisticAdd} 
        onSaveComplete={handleRecipeSaved}
      />

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
