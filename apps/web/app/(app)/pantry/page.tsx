import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import PantryManager from '@/components/PantryManager'
import RecommendationPanel from '@/components/RecommendationPanel'

export const metadata: Metadata = { title: 'Pantry' }

export default async function PantryPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: pantryItems } = await supabase
    .from('pantry_items')
    .select(`
      id, quantity, unit, expires_at, source, created_at,
      ingredients ( id, name, category )
    `)
    .eq('user_id', user!.id)
    .order('expires_at', { ascending: true, nullsFirst: false })

  // Transform data to match PantryManager's expected types
  // Supabase returns ingredients as array but it's a single foreign key relation
  const transformedItems = (pantryItems ?? []).map(item => ({
    ...item,
    ingredients: Array.isArray(item.ingredients) ? item.ingredients[0] ?? null : item.ingredients,
  }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 mb-1">Pantry</h1>
        <p className="text-sm text-stone-500">Track what you have on hand. Get AI recipe suggestions to use it up.</p>
      </div>

      <PantryManager initialItems={transformedItems as Parameters<typeof PantryManager>[0]['initialItems']} />
      <RecommendationPanel />
    </div>
  )
}
