'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Ingredient { id: string; name: string; category: string | null }
interface PantryItem {
  id: string
  quantity: number | null
  unit: string | null
  expires_at: string | null
  source: string | null
  ingredients: Ingredient | null
}

interface Props {
  initialItems: PantryItem[]
}

export default function PantryManager({ initialItems }: Props) {
  const supabase = createClient()
  const [items, setItems] = useState(initialItems)
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [expires, setExpires] = useState('')
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)

    const { data: { session } } = await supabase.auth.getSession()

    const res = await fetch('/api/pantry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        ingredient_name: name,
        quantity: quantity ? parseFloat(quantity) : null,
        unit: unit || null,
        expires_at: expires || null,
      }),
    })

    if (res.ok) {
      const newItem = await res.json()
      setItems(prev => {
        const filtered = prev.filter(i => i.id !== newItem.id)
        return [newItem, ...filtered]
      })
      setName('')
      setQuantity('')
      setUnit('')
      setExpires('')
      setShowForm(false)
    }

    setAdding(false)
  }

  async function removeItem(id: string) {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`/api/pantry/${id}`, {
      method: 'DELETE',
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false
    const diff = new Date(date).getTime() - Date.now()
    return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-stone-900">
          Ingredients ({items.length})
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          + Add item
        </button>
      </div>

      {showForm && (
        <form onSubmit={addItem} className="bg-white rounded-2xl border border-stone-100 p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ingredient (e.g. garlic)"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <input
              type="number"
              step="any"
              min={0}
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="Quantity"
              className="rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <input
              value={unit}
              onChange={e => setUnit(e.target.value)}
              placeholder="Unit (cup, g...)"
              className="rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <div className="col-span-2">
              <label className="block text-xs text-stone-500 mb-1">Expiry date (optional)</label>
              <input
                type="date"
                value={expires}
                onChange={e => setExpires(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adding}
              className="flex-1 rounded-xl bg-orange-500 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {adding ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-stone-400 py-8 text-center">
          Your pantry is empty. Add ingredients or sync from your cook log.
        </p>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-100 divide-y divide-stone-50">
          {items.map(item => {
            const ing = item.ingredients
            const expiringSoon = isExpiringSoon(item.expires_at)
            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-stone-800">{ing?.name ?? 'Unknown'}</span>
                  {(item.quantity || item.unit) && (
                    <span className="text-sm text-stone-500 ml-2">
                      {[item.quantity, item.unit].filter(Boolean).join(' ')}
                    </span>
                  )}
                  {item.expires_at && (
                    <span className={`ml-2 text-xs ${expiringSoon ? 'text-red-500 font-medium' : 'text-stone-400'}`}>
                      {expiringSoon ? '⚠ ' : ''}Exp {item.expires_at}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-stone-300 hover:text-red-400 transition-colors text-lg leading-none"
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
