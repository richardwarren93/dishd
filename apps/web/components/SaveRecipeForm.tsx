'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SaveRecipeForm() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ source_url: url }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save recipe')
      }

      const recipe = await res.json()
      setUrl('')
      router.push(`/recipe/${recipe.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
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
        {loading ? 'Saving...' : 'Save'}
      </button>
      {error && <p className="absolute mt-14 text-xs text-red-600">{error}</p>}
    </form>
  )
}
