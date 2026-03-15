// Supabase Edge Function (Deno) — AI Recipe Extraction Worker
// Triggered by pg_cron every 30 seconds.
// Picks up queued extraction_jobs, fetches URL content, calls Claude,
// writes structured recipe data back to the database.

import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })
const WEBHOOK_SECRET = Deno.env.get('EXTRACT_WEBHOOK_SECRET')!
const NEXT_API_URL = Deno.env.get('NEXT_PUBLIC_SITE_URL') ?? 'http://localhost:3000'

// ─── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  try {
    // Claim up to 3 queued jobs atomically
    const { data: jobs, error } = await supabase
      .from('extraction_jobs')
      .select('id, recipe_id')
      .eq('status', 'queued')
      .lt('attempts', 3)
      .order('created_at', { ascending: true })
      .limit(3)

    if (error) throw error
    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { status: 200 })
    }

    // Process each job
    await Promise.allSettled(jobs.map(processJob))

    return new Response(JSON.stringify({ processed: jobs.length }), { status: 200 })
  } catch (err) {
    console.error('extract-recipe worker error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})

// ─── Process a single extraction job ────────────────────────────────────────

async function processJob(job: { id: string; recipe_id: string }) {
  // Mark as running
  await supabase
    .from('extraction_jobs')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', job.id)

  await supabase
    .from('recipes')
    .update({ extraction_status: 'processing' })
    .eq('id', job.recipe_id)

  try {
    // Fetch recipe source URL
    const { data: recipe } = await supabase
      .from('recipes')
      .select('source_url')
      .eq('id', job.recipe_id)
      .single()

    if (!recipe) throw new Error('Recipe not found')

    const content = await fetchUrlContent(recipe.source_url)
    const extracted = await extractWithClaude(recipe.source_url, content)

    if (!extracted.found) {
      await markJobDone(job.id, job.recipe_id, 'done')
      await supabase
        .from('recipes')
        .update({ extraction_status: 'done', title: new URL(recipe.source_url).hostname })
        .eq('id', job.recipe_id)
      return
    }

    await saveExtractedRecipe(job.recipe_id, extracted)
    await markJobDone(job.id, job.recipe_id, 'done')

    // Notify Next.js app to broadcast Realtime update
    await notifyWebhook(job.recipe_id)
  } catch (err) {
    console.error(`Job ${job.id} failed:`, err)
    await supabase.from('extraction_jobs').update({
      status: 'failed',
      error: String(err),
      completed_at: new Date().toISOString(),
    }).eq('id', job.id)
    await supabase
      .from('recipes')
      .update({ extraction_status: 'failed' })
      .eq('id', job.recipe_id)
  }
}

// ─── Fetch URL content with social media fallbacks ──────────────────────────

interface UrlContent {
  title: string
  description: string
  imageUrl: string
  bodyText: string
  ldJson: string
}

async function fetchUrlContent(url: string): Promise<UrlContent> {
  const parsed = new URL(url)

  // TikTok: use oEmbed
  if (parsed.hostname.includes('tiktok.com')) {
    const oembed = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`)
      .then(r => r.json()).catch(() => null)
    return {
      title: oembed?.title ?? '',
      description: oembed?.title ?? '',
      imageUrl: oembed?.thumbnail_url ?? '',
      bodyText: oembed?.title ?? '',
      ldJson: '',
    }
  }

  // Instagram: use oEmbed
  if (parsed.hostname.includes('instagram.com')) {
    const oembed = await fetch(`https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`)
      .then(r => r.json()).catch(() => null)
    return {
      title: oembed?.title ?? '',
      description: oembed?.title ?? '',
      imageUrl: oembed?.thumbnail_url ?? '',
      bodyText: oembed?.title ?? '',
      ldJson: '',
    }
  }

  // Standard page: fetch HTML
  const html = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; dishd-bot/1.0)' }
  }).then(r => r.text()).catch(() => '')

  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? ''
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? ''
  const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? ''
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? ''

  // Extract Schema.org Recipe ld+json
  const ldJsonMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  const ldJson = ldJsonMatches
    .map(m => m[1])
    .find(j => j.includes('"Recipe"') || j.includes('"@type":"Recipe"')) ?? ''

  // Visible text (strip tags, collapse whitespace)
  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 10000)

  return {
    title: ogTitle || title,
    description: ogDesc,
    imageUrl: ogImage,
    bodyText,
    ldJson,
  }
}

// ─── Claude extraction ───────────────────────────────────────────────────────

interface ExtractedIngredient {
  name: string
  quantity: number | null
  unit: string | null
  preparation: string | null
  is_optional: boolean
}

interface ExtractedStep {
  step_number: number
  instruction: string
}

interface ExtractionResult {
  found: boolean
  title?: string
  description?: string | null
  servings?: number | null
  prep_time_min?: number | null
  cook_time_min?: number | null
  cuisine?: string | null
  tags?: string[]
  image_url?: string | null
  ingredients?: ExtractedIngredient[]
  steps?: ExtractedStep[]
}

async function extractWithClaude(url: string, content: UrlContent): Promise<ExtractionResult> {
  const prompt = `Extract a recipe from the following web page content.

Source URL: ${url}
Page Title: ${content.title}
Description: ${content.description}
${content.ldJson ? `\nSchema.org Recipe JSON:\n${content.ldJson.slice(0, 4000)}` : ''}

Page text:
${content.bodyText.slice(0, 6000)}

Rules:
- Ingredient names must be lowercase canonical names with no adjectives (e.g. "garlic" not "fresh garlic cloves", "chicken" not "boneless skinless chicken breast")
- If no recipe is found in this content, return { "found": false }
- Do not invent information not present in the content
- Use null for any field you cannot determine

Respond ONLY with valid JSON matching this exact schema:
{
  "found": true,
  "title": "string",
  "description": "string | null",
  "servings": "number | null",
  "prep_time_min": "number | null",
  "cook_time_min": "number | null",
  "cuisine": "string | null",
  "tags": ["string"],
  "ingredients": [
    {
      "name": "string",
      "quantity": "number | null",
      "unit": "string | null",
      "preparation": "string | null",
      "is_optional": false
    }
  ],
  "steps": [
    { "step_number": 1, "instruction": "string" }
  ]
}`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  // Strip markdown code fences if present
  const jsonStr = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  try {
    return JSON.parse(jsonStr) as ExtractionResult
  } catch {
    console.error('Failed to parse Claude response:', text)
    return { found: false }
  }
}

// ─── Save extracted data to database ────────────────────────────────────────

async function saveExtractedRecipe(recipeId: string, data: ExtractionResult) {
  // Update the recipe row
  await supabase.from('recipes').update({
    title: data.title ?? null,
    description: data.description ?? null,
    image_url: data.image_url ?? null,
    cook_time_min: data.cook_time_min ?? null,
    prep_time_min: data.prep_time_min ?? null,
    servings: data.servings ?? null,
    cuisine: data.cuisine ?? null,
    extraction_status: 'done',
  }).eq('id', recipeId)

  // Upsert steps
  if (data.steps && data.steps.length > 0) {
    await supabase.from('recipe_steps').delete().eq('recipe_id', recipeId)
    await supabase.from('recipe_steps').insert(
      data.steps.map(s => ({
        recipe_id: recipeId,
        step_number: s.step_number,
        instruction: s.instruction,
      }))
    )
  }

  // Upsert ingredients (batch operations for speed)
  if (data.ingredients && data.ingredients.length > 0) {
    await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId)

    // Get all unique ingredient names
    const ingredientNames = [...new Set(data.ingredients.map(ing => ing.name.toLowerCase().trim()))]
    
    // Fetch existing ingredients in one query
    const { data: existingIngredients } = await supabase
      .from('ingredients')
      .select('id, name')
      .in('name', ingredientNames)
    
    const existingMap = new Map(existingIngredients?.map(i => [i.name, i.id]) ?? [])
    
    // Find missing ingredients and insert them in batch
    const missingNames = ingredientNames.filter(name => !existingMap.has(name))
    if (missingNames.length > 0) {
      const { data: newIngredients } = await supabase
        .from('ingredients')
        .insert(missingNames.map(name => ({ name })))
        .select('id, name')
      
      newIngredients?.forEach(i => existingMap.set(i.name, i.id))
    }
    
    // Build all recipe_ingredients rows and insert in batch
    const recipeIngredients = data.ingredients
      .map((ing, i) => {
        const ingredientId = existingMap.get(ing.name.toLowerCase().trim())
        if (!ingredientId) return null
        return {
          recipe_id: recipeId,
          ingredient_id: ingredientId,
          quantity: ing.quantity,
          unit: ing.unit,
          preparation: ing.preparation,
          is_optional: ing.is_optional ?? false,
          sort_order: i,
        }
      })
      .filter(Boolean)
    
    if (recipeIngredients.length > 0) {
      await supabase.from('recipe_ingredients').insert(recipeIngredients)
    }
  }

  // Upsert tags (batch operations for speed)
  if (data.tags && data.tags.length > 0) {
    await supabase.from('recipe_tags').delete().eq('recipe_id', recipeId)

    const tagNames = [...new Set(data.tags.map(t => t.toLowerCase().trim()))]
    
    // Fetch existing tags in one query
    const { data: existingTags } = await supabase
      .from('tags')
      .select('id, name')
      .in('name', tagNames)
    
    const tagMap = new Map(existingTags?.map(t => [t.name, t.id]) ?? [])
    
    // Insert missing tags in batch
    const missingTagNames = tagNames.filter(name => !tagMap.has(name))
    if (missingTagNames.length > 0) {
      const { data: newTags } = await supabase
        .from('tags')
        .insert(missingTagNames.map(name => ({ name })))
        .select('id, name')
      
      newTags?.forEach(t => tagMap.set(t.name, t.id))
    }
    
    // Insert recipe_tags in batch
    const recipeTags = tagNames
      .map(name => {
        const tagId = tagMap.get(name)
        if (!tagId) return null
        return { recipe_id: recipeId, tag_id: tagId }
      })
      .filter(Boolean)
    
    if (recipeTags.length > 0) {
      await supabase.from('recipe_tags').insert(recipeTags)
    }
  }
}

async function markJobDone(jobId: string, _recipeId: string, status: 'done' | 'failed') {
  await supabase.from('extraction_jobs').update({
    status,
    completed_at: new Date().toISOString(),
  }).eq('id', jobId)
}

async function notifyWebhook(recipeId: string) {
  try {
    await fetch(`${NEXT_API_URL}/api/webhooks/extract-complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': WEBHOOK_SECRET,
      },
      body: JSON.stringify({ recipe_id: recipeId }),
    })
  } catch (err) {
    // Non-critical — Realtime subscription will eventually pick up the change
    console.warn('Webhook notification failed:', err)
  }
}
