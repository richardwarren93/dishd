// ─── Core domain types shared between web and mobile ────────────────────────

export type ExtractionStatus = 'pending' | 'processing' | 'done' | 'failed'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
}

export interface Ingredient {
  id: string
  name: string
  category: string | null
}

export interface RecipeIngredient {
  id: string
  recipe_id: string
  ingredient_id: string
  ingredient: Ingredient
  quantity: number | null
  unit: string | null
  preparation: string | null
  is_optional: boolean
  sort_order: number
}

export interface RecipeStep {
  id: string
  recipe_id: string
  step_number: number
  instruction: string
  image_url: string | null
}

export interface Tag {
  id: string
  name: string
}

export interface Recipe {
  id: string
  user_id: string
  source_url: string
  title: string | null
  description: string | null
  image_url: string | null
  cook_time_min: number | null
  prep_time_min: number | null
  servings: number | null
  cuisine: string | null
  extraction_status: ExtractionStatus
  is_public: boolean
  notes: string | null
  created_at: string
  updated_at: string
  // joined relations
  profile?: Profile
  recipe_ingredients?: RecipeIngredient[]
  recipe_steps?: RecipeStep[]
  tags?: Tag[]
  cook_count?: number
}

export interface CookLog {
  id: string
  user_id: string
  recipe_id: string
  cooked_at: string
  servings_made: number | null
  rating: number | null
  notes: string | null
  photo_url: string | null
  // joined
  recipe?: Recipe
}

export interface PantryItem {
  id: string
  user_id: string
  ingredient_id: string
  ingredient: Ingredient
  quantity: number | null
  unit: string | null
  expires_at: string | null
  source: 'manual' | 'from_cook_log' | 'from_leftover' | null
  cook_log_id: string | null
  created_at: string
}

export interface AIRecommendation {
  recipe_title: string
  reason: string
  pantry_ingredients_used: string[]
  missing_ingredients: string[]
  estimated_cook_time_min: number
  difficulty: 'easy' | 'medium' | 'hard'
  saved_recipe?: Recipe // populated if user already has this saved
}

export interface RecommendationsResponse {
  suggestions: AIRecommendation[]
}

// ─── API response wrappers ───────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T
  error?: never
}

export interface ApiError {
  data?: never
  error: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError
