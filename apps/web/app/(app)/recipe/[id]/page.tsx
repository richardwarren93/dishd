import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import MadeItButton from '@/components/MadeItButton'
import ExtractionStatus from '@/components/ExtractionStatus'

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const admin = createAdminClient()
  const { data } = await admin.from('recipes').select('title').eq('id', id).single()
  return { title: data?.title ?? 'Recipe' }
}

export default async function RecipePage({ params }: Params) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: recipe, error } = await admin
    .from('recipes')
    .select(`
      id, user_id, source_url, title, description, image_url,
      cook_time_min, prep_time_min, servings, cuisine,
      extraction_status, is_public, notes, created_at,
      recipe_steps ( id, step_number, instruction ),
      recipe_ingredients (
        id, quantity, unit, preparation, is_optional, sort_order,
        ingredients ( id, name, category )
      ),
      recipe_tags ( tags ( id, name ) )
    `)
    .eq('id', id)
    .or(`user_id.eq.${user!.id},is_public.eq.true`)
    .single()

  if (error || !recipe) notFound()

  const steps = [...(recipe.recipe_steps ?? [])].sort((a, b) => a.step_number - b.step_number)
  const ingredients = [...(recipe.recipe_ingredients ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const isOwner = recipe.user_id === user!.id

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back */}
      <Link href="/feed" className="text-sm text-stone-400 hover:text-stone-700 mb-6 inline-block">
        ← Back to feed
      </Link>

      {/* Header */}
      <div className="mb-6">
        <ExtractionStatus recipeId={recipe.id} initialStatus={recipe.extraction_status} />

        {recipe.image_url && (
          <div className="relative h-64 w-full rounded-2xl overflow-hidden bg-stone-100 mb-4">
            <Image src={recipe.image_url} alt={recipe.title ?? 'Recipe'} fill className="object-cover" />
          </div>
        )}

        <h1 className="text-3xl font-bold text-stone-900 mt-2">
          {recipe.title ?? 'Untitled Recipe'}
        </h1>

        {recipe.description && (
          <p className="mt-2 text-stone-600">{recipe.description}</p>
        )}

        <div className="flex flex-wrap gap-3 mt-4 text-sm text-stone-500">
          {recipe.prep_time_min && <span>Prep: {recipe.prep_time_min}m</span>}
          {recipe.cook_time_min && <span>Cook: {recipe.cook_time_min}m</span>}
          {recipe.servings && <span>Serves {recipe.servings}</span>}
          {recipe.cuisine && <span>{recipe.cuisine}</span>}
        </div>

        <a
          href={recipe.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-orange-500 hover:underline"
        >
          View original ↗
        </a>
      </div>

      {/* Tags */}
      {recipe.recipe_tags && recipe.recipe_tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {recipe.recipe_tags.map(({ tags }: { tags: { id: string; name: string } | null }) =>
            tags ? (
              <span key={tags.id} className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full">
                {tags.name}
              </span>
            ) : null
          )}
        </div>
      )}

      {/* Ingredients */}
      {ingredients.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-stone-900 mb-3">Ingredients</h2>
          <ul className="space-y-2">
            {ingredients.map(item => {
              const ing = item.ingredients as unknown as { name: string } | null
              const parts = [
                item.quantity ? String(item.quantity) : '',
                item.unit ?? '',
                ing?.name ?? '',
                item.preparation ? `(${item.preparation})` : '',
              ].filter(Boolean).join(' ')
              return (
                <li key={item.id} className="flex items-start gap-2 text-sm text-stone-700">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0 mt-2" />
                  <span>{parts}{item.is_optional && <span className="text-stone-400 ml-1">(optional)</span>}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Steps */}
      {steps.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-stone-900 mb-3">Instructions</h2>
          <ol className="space-y-4">
            {steps.map(step => (
              <li key={step.id} className="flex gap-4 text-sm text-stone-700">
                <span className="shrink-0 w-7 h-7 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center">
                  {step.step_number}
                </span>
                <p className="pt-1">{step.instruction}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Notes */}
      {recipe.notes && (
        <section className="mb-8 bg-stone-50 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-stone-700 mb-1">Notes</h2>
          <p className="text-sm text-stone-600">{recipe.notes}</p>
        </section>
      )}

      {/* Made It button */}
      <div className="sticky bottom-6">
        <MadeItButton recipeId={recipe.id} />
      </div>
    </div>
  )
}
