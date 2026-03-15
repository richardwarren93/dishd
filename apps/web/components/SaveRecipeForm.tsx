'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { mutate } from 'swr'

interface SaveRecipeFormProps {
  onOptimisticAdd?: (recipe: {
    id: string
    source_url: string
    title: null
    description: null
    image_url: null
    cook_time_min: null
    cuisine: null
    extraction_status: string
    created_at: string
  }) => void
}

export default function SaveRecipeForm({ onOptimisticAdd }: SaveRecipeFormProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    
    const sourceUrl = url.trim()
    if (!sourceUrl) return

    // Generate a temporary ID for optimistic update
    const tempId = `temp-${Date.now()}`
    const optimisticRecipe = {
      id: tempId,
      source_url: sourceUrl,
      title: null,
      description: null,
      image_url: null,
      cook_time_min: null,
      cuisine: null,
      extraction_status: 'pending',
      created_at: new Date().toISOString(),
    }

    // Optimistically add to UI immediately
    onOptimisticAdd?.(optimisticRecipe)
    
    // Clear input immediately for better UX
    setUrl('')
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ source_url: sourceUrl }),
      })

      const text = await res.text()
      let data
      try {
        data = text ? JSON.parse(text) : null
      } catch {
        throw new Error('Invalid response from server')
      }

      if (!res.ok) {
        throw new Error(data?.error ?? 'Failed to save recipe')
      }

      // Revalidate the recipes list to get the real data
      mutate('/api/recipes')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      // Revalidate to remove the optimistic entry on error
      mutate('/api/recipes')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 relative">
      <input
        type="url"
        required
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="Paste a TikTok or Instagram URL..."
        className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-sm"
      >
        Save
      </button>
      {error && <p className="absolute top-full mt-1 text-xs text-red-600">{error}</p>}
    </form>
  )
}
