import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Cook Log' }

export default async function LogPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: logs } = await supabase
    .from('cook_logs')
    .select(`
      id, cooked_at, rating, notes, servings_made,
      recipes ( id, title, image_url, source_url )
    `)
    .eq('user_id', user!.id)
    .order('cooked_at', { ascending: false })
    .limit(100)

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Cook Log</h1>

      {!logs || logs.length === 0 ? (
        <div className="text-center text-stone-400 mt-12">
          <p className="text-lg">Nothing cooked yet.</p>
          <p className="text-sm mt-1">Hit "Made it!" on any recipe to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => {
            const recipe = log.recipes as unknown as { id: string; title: string | null; image_url: string | null } | null
            const date = new Date(log.cooked_at)

            return (
              <div key={log.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 flex gap-4 items-start">
                <div className="shrink-0 text-center w-12">
                  <div className="text-xs text-stone-400 uppercase tracking-wider">
                    {date.toLocaleDateString('en', { month: 'short' })}
                  </div>
                  <div className="text-2xl font-bold text-stone-800 leading-none">
                    {date.getDate()}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <Link
                    href={`/recipe/${recipe?.id}`}
                    className="font-semibold text-stone-900 hover:text-orange-600 transition-colors line-clamp-1"
                  >
                    {recipe?.title ?? 'Unknown recipe'}
                  </Link>

                  <div className="flex items-center gap-3 mt-1">
                    {log.rating && (
                      <span className="text-sm text-orange-400">
                        {'★'.repeat(log.rating)}{'☆'.repeat(5 - log.rating)}
                      </span>
                    )}
                    {log.servings_made && (
                      <span className="text-xs text-stone-400">{log.servings_made} servings</span>
                    )}
                  </div>

                  {log.notes && (
                    <p className="text-sm text-stone-500 mt-1 line-clamp-2">{log.notes}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
