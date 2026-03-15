import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { supabase } from '../lib/supabase'
import '../lib/api'

export default function RootLayout() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(() => setReady(true))
  }, [])

  if (!ready) return null

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="recipe/[id]" options={{ headerShown: true, title: 'Recipe' }} />
    </Stack>
  )
}
