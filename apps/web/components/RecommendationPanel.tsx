'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Suggestion {
  recipe_title: string
  reason: string
  pantry_ingredients_used: string[]
  missing_ingredients: string[]
  estimated_cook_time_min: number
  difficulty: string
  saved_recipe?: { id: string; title: string }
}

export default function RecommendationPanel() {
  const supabase = createClient()
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function getSuggestions() {
    setLoading(true)
    setSuggestions(null)
    setMessage('')

    const { data: { session } } = await supabase.auth.getSession()

    const res = await fetch('/api/recommendations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
    })

    const data = await res.json()
    setSuggestions(data.suggestions ?? [])
    setMessage(data.message ?? '')
    setLoading(false)
  }

  const difficultyColor: Record<string, string> = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-stone-900">Recipe Suggestions</h2>
        <button
          onClick={getSuggestions}
          disabled={loading}
          className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Thinking...' : suggestions ? 'Refresh' : 'Get suggestions'}
        </button>
      </div>

      {message && <p className="text-sm text-stone-500 mb-4">{message}</p>}

      {suggestions && suggestions.length === 0 && !message && (
        <p className="text-sm text-stone-400">No suggestions available. Add more pantry items.</p>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  {s.saved_recipe ? (
                    <Link
                      href={`/recipe/${s.saved_recipe.id}`}
                      className="font-semibold text-orange-600 hover:underline"
                    >
                      {s.recipe_title} →
                    </Link>
                  ) : (
                    <h3 className="font-semibold text-stone-900">{s.recipe_title}</h3>
                  )}
                  {s.saved_recipe && (
                    <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">
                      Already saved!
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColor[s.difficulty] ?? ''}`}>
                    {s.difficulty}
                  </span>
                  <span className="text-xs text-stone-400">{s.estimated_cook_time_min}m</span>
                </div>
              </div>

              <p className="text-sm text-stone-600 mt-2">{s.reason}</p>

              <div className="mt-3 flex flex-wrap gap-1">
                {s.pantry_ingredients_used.map(ing => (
                  <span key={ing} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                    ✓ {ing}
                  </span>
                ))}
                {s.missing_ingredients.map(ing => (
                  <span key={ing} className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                    + {ing}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
