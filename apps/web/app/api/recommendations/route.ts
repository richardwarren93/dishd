import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// POST /api/recommendations — AI ingredient-based recipe suggestions
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if ('error' in auth) return auth.error

  const admin = createAdminClient()

  // Fetch pantry
  const { data: pantry } = await admin
    .from('pantry_items')
    .select('quantity, unit, expires_at, ingredients(name)')
    .eq('user_id', auth.user.id)
    .order('expires_at', { ascending: true, nullsFirst: false })

  if (!pantry || pantry.length === 0) {
    return NextResponse.json({
      suggestions: [],
      message: 'Add some items to your pantry first!'
    })
  }

  // Fetch recent cook history (last 10)
  const { data: recentCooks } = await admin
    .from('cook_logs')
    .select('cooked_at, rating, recipes(title)')
    .eq('user_id', auth.user.id)
    .order('cooked_at', { ascending: false })
    .limit(10)

  // Fetch user's saved recipe titles for matching
  const { data: savedRecipes } = await admin
    .from('recipes')
    .select('id, title')
    .eq('user_id', auth.user.id)
    .eq('extraction_status', 'done')
    .not('title', 'is', null)

  const pantryText = pantry.map(item => {
    const name = (item.ingredients as { name: string } | null)?.name ?? 'unknown'
    const qty = item.quantity ? `${item.quantity}${item.unit ? ' ' + item.unit : ''}` : ''
    const exp = item.expires_at ? ` (expires ${item.expires_at})` : ''
    return `- ${name}${qty ? ': ' + qty : ''}${exp}`
  }).join('\n')

  const cookHistoryText = recentCooks?.map(c => {
    const title = (c.recipes as { title: string | null } | null)?.title ?? 'Unknown recipe'
    return `- ${title} (cooked ${c.cooked_at.slice(0, 10)}${c.rating ? ', rated ' + c.rating + '/5' : ''})`
  }).join('\n') ?? 'No cook history yet'

  const prompt = `You are a helpful cooking assistant focused on reducing food waste.

The user's pantry contains:
${pantryText}

Their recent cook history:
${cookHistoryText}

Suggest 5 recipes they could make that use up as many pantry ingredients as possible.
Prioritize ingredients that expire soonest.
Be creative but practical. Vary difficulty levels.

Respond ONLY with valid JSON in this exact format:
{
  "suggestions": [
    {
      "recipe_title": "string",
      "reason": "string (1 sentence about which pantry items this uses up)",
      "pantry_ingredients_used": ["ingredient name"],
      "missing_ingredients": ["ingredient name"],
      "estimated_cook_time_min": number,
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const jsonStr = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  let result: { suggestions: Array<{
    recipe_title: string
    reason: string
    pantry_ingredients_used: string[]
    missing_ingredients: string[]
    estimated_cook_time_min: number
    difficulty: string
    saved_recipe?: { id: string; title: string }
  }> }

  try {
    result = JSON.parse(jsonStr)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }

  // Match suggestions against saved recipes
  if (savedRecipes && result.suggestions) {
    result.suggestions = result.suggestions.map(suggestion => {
      const titleLower = suggestion.recipe_title.toLowerCase()
      const saved = savedRecipes.find(r =>
        r.title && (
          r.title.toLowerCase().includes(titleLower) ||
          titleLower.includes(r.title.toLowerCase())
        )
      )
      return saved ? { ...suggestion, saved_recipe: { id: saved.id, title: saved.title! } } : suggestion
    })
  }

  return NextResponse.json(result)
}
