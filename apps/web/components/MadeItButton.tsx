'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  recipeId: string
}

export default function MadeItButton({ recipeId }: Props) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState('')
  const [servings, setServings] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()

    const res = await fetch(`/api/recipes/${recipeId}/cooked`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        rating: rating || null,
        notes: notes || null,
        servings_made: servings ? parseInt(servings) : null,
      }),
    })

    setLoading(false)
    if (res.ok) {
      setDone(true)
      setOpen(false)
    }
  }

  if (done) {
    return (
      <div className="w-full rounded-2xl bg-green-50 border border-green-200 px-5 py-3 text-center text-sm font-semibold text-green-700">
        Logged! Great cook.
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl bg-orange-500 px-5 py-3.5 text-sm font-semibold text-white hover:bg-orange-600 shadow-lg transition-colors"
      >
        Made it!
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-stone-900 mb-4">How did it go?</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Star rating */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(rating === n ? 0 : n)}
                      className={`text-2xl transition-transform ${rating >= n ? 'text-orange-400' : 'text-stone-200'} hover:scale-110`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Servings made</label>
                <input
                  type="number"
                  min={1}
                  value={servings}
                  onChange={e => setServings(e.target.value)}
                  placeholder="e.g. 4"
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any tweaks or thoughts..."
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Saving...' : 'Log it'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
