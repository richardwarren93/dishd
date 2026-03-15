import Link from 'next/link'
import Image from 'next/image'

interface Recipe {
  id: string
  title: string | null
  description: string | null
  image_url: string | null
  source_url: string
  cook_time_min: number | null
  cuisine: string | null
  extraction_status: string
  created_at: string
}

interface Props {
  recipe: Recipe
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Saving...', color: 'bg-yellow-100 text-yellow-700' },
  processing: { label: 'Extracting...', color: 'bg-blue-100 text-blue-700' },
  done: { label: '', color: '' },
  failed: { label: 'Extraction failed', color: 'bg-red-100 text-red-600' },
}

export default function RecipeCard({ recipe }: Props) {
  const status = STATUS_LABELS[recipe.extraction_status] ?? STATUS_LABELS.pending
  const hostname = (() => {
    try { return new URL(recipe.source_url).hostname.replace('www.', '') }
    catch { return recipe.source_url }
  })()

  return (
    <Link
      href={`/recipe/${recipe.id}`}
      className="group block rounded-2xl bg-white border border-stone-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
    >
      {recipe.image_url ? (
        <div className="relative h-44 w-full bg-stone-100">
          <Image
            src={recipe.image_url}
            alt={recipe.title ?? 'Recipe'}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      ) : (
        <div className="h-44 w-full bg-gradient-to-br from-orange-50 to-stone-100 flex items-center justify-center text-3xl">
          🍽️
        </div>
      )}

      <div className="p-4">
        {status.label && (
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2 ${status.color}`}>
            {status.label}
          </span>
        )}

        <h3 className="font-semibold text-stone-900 line-clamp-2 group-hover:text-orange-600 transition-colors">
          {recipe.title ?? hostname}
        </h3>

        {recipe.description && (
          <p className="mt-1 text-xs text-stone-500 line-clamp-2">{recipe.description}</p>
        )}

        <div className="mt-3 flex items-center gap-3 text-xs text-stone-400">
          {recipe.cuisine && <span>{recipe.cuisine}</span>}
          {recipe.cook_time_min && <span>{recipe.cook_time_min}m</span>}
          <span className="ml-auto">{hostname}</span>
        </div>
      </div>
    </Link>
  )
}
