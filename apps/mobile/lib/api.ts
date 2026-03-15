import { configureApiClient } from '@dishd/shared/api-client'
import { supabase } from './supabase'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

configureApiClient({
  baseUrl: API_URL,
  getToken: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  },
})

export { recipesApi, pantryApi, recommendationsApi, usersApi } from '@dishd/shared/api-client'
