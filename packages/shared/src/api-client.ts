import type {
  Recipe,
  CookLog,
  PantryItem,
  Profile,
  RecommendationsResponse,
  ApiResponse,
} from './types'
import type {
  SaveRecipeInput,
  UpdateRecipeInput,
  LogCookInput,
  UpsertPantryItemInput,
  SyncPantryFromCookInput,
} from './validators'

// ─── Typed API client (used by Expo mobile app) ──────────────────────────────
// Configured via EXPO_PUBLIC_API_URL env var

let _baseUrl = ''
let _getToken: (() => Promise<string | null>) | null = null

export function configureApiClient(options: {
  baseUrl: string
  getToken: () => Promise<string | null>
}) {
  _baseUrl = options.baseUrl
  _getToken = options.getToken
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = _getToken ? await _getToken() : null
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const res = await fetch(`${_baseUrl}${path}`, { ...options, headers })
    const json = await res.json()
    if (!res.ok) return { error: json.error ?? `HTTP ${res.status}` }
    return { data: json }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' }
  }
}

// ─── Recipes ─────────────────────────────────────────────────────────────────

export const recipesApi = {
  list: (params?: { search?: string; page?: number }) => {
    const q = new URLSearchParams()
    if (params?.search) q.set('search', params.search)
    if (params?.page) q.set('page', String(params.page))
    return request<Recipe[]>(`/api/recipes?${q}`)
  },

  get: (id: string) => request<Recipe>(`/api/recipes/${id}`),

  save: (body: SaveRecipeInput) =>
    request<Recipe>('/api/recipes', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: string, body: UpdateRecipeInput) =>
    request<Recipe>(`/api/recipes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    request<{ success: true }>(`/api/recipes/${id}`, { method: 'DELETE' }),

  triggerExtraction: (id: string) =>
    request<{ queued: true }>(`/api/recipes/${id}/extract`, { method: 'POST' }),

  logCook: (id: string, body: LogCookInput) =>
    request<CookLog>(`/api/recipes/${id}/cooked`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}

// ─── Pantry ──────────────────────────────────────────────────────────────────

export const pantryApi = {
  list: () => request<PantryItem[]>('/api/pantry'),

  upsert: (body: UpsertPantryItemInput) =>
    request<PantryItem>('/api/pantry', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    request<{ success: true }>(`/api/pantry/${id}`, { method: 'DELETE' }),

  syncFromCook: (body: SyncPantryFromCookInput) =>
    request<PantryItem[]>('/api/pantry/sync-from-cook', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}

// ─── Recommendations ─────────────────────────────────────────────────────────

export const recommendationsApi = {
  get: () =>
    request<RecommendationsResponse>('/api/recommendations', { method: 'POST' }),
}

// ─── Users ───────────────────────────────────────────────────────────────────

export const usersApi = {
  getProfile: (username: string) => request<Profile>(`/api/users/${username}`),

  getRecipes: (username: string) =>
    request<Recipe[]>(`/api/users/${username}/recipes`),

  follow: (username: string) =>
    request<{ success: true }>('/api/users/follow', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),

  unfollow: (username: string) =>
    request<{ success: true }>(`/api/users/follow/${username}`, {
      method: 'DELETE',
    }),
}
