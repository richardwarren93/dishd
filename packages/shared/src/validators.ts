import { z } from 'zod'

export const SaveRecipeSchema = z.object({
  source_url: z.string().url('Must be a valid URL'),
  notes: z.string().max(2000).optional(),
  is_public: z.boolean().optional().default(false),
})
export type SaveRecipeInput = z.infer<typeof SaveRecipeSchema>

export const UpdateRecipeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  is_public: z.boolean().optional(),
  cook_time_min: z.number().int().positive().optional().nullable(),
  prep_time_min: z.number().int().positive().optional().nullable(),
  servings: z.number().int().positive().optional().nullable(),
  cuisine: z.string().max(100).optional().nullable(),
})
export type UpdateRecipeInput = z.infer<typeof UpdateRecipeSchema>

export const LogCookSchema = z.object({
  cooked_at: z.string().datetime().optional(),
  servings_made: z.number().int().positive().optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  photo_url: z.string().url().optional().nullable(),
})
export type LogCookInput = z.infer<typeof LogCookSchema>

export const UpsertPantryItemSchema = z.object({
  ingredient_name: z.string().min(1).max(200),
  quantity: z.number().positive().optional().nullable(),
  unit: z.string().max(50).optional().nullable(),
  expires_at: z.string().date().optional().nullable(),
  source: z.enum(['manual', 'from_cook_log', 'from_leftover']).optional().default('manual'),
})
export type UpsertPantryItemInput = z.infer<typeof UpsertPantryItemSchema>

export const SyncPantryFromCookSchema = z.object({
  cook_log_id: z.string().uuid(),
  items: z.array(z.object({
    ingredient_name: z.string().min(1),
    quantity: z.number().positive().optional().nullable(),
    unit: z.string().max(50).optional().nullable(),
    expires_at: z.string().date().optional().nullable(),
  })),
})
export type SyncPantryFromCookInput = z.infer<typeof SyncPantryFromCookSchema>

export const GetRecommendationsSchema = z.object({
  limit: z.number().int().min(1).max(10).optional().default(5),
})
export type GetRecommendationsInput = z.infer<typeof GetRecommendationsSchema>

export const FollowUserSchema = z.object({
  username: z.string().min(1),
})
export type FollowUserInput = z.infer<typeof FollowUserSchema>
