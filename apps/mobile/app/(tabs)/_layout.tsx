import { Tabs, useRouter } from 'expo-router'
import { useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function TabsLayout() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/(auth)/login')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/(auth)/login')
    })

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#f97316',
        tabBarInactiveTintColor: '#a8a29e',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#f5f5f4' },
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#1c1917',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{ title: 'Feed', tabBarLabel: 'Feed' }}
      />
      <Tabs.Screen
        name="pantry"
        options={{ title: 'Pantry', tabBarLabel: 'Pantry' }}
      />
      <Tabs.Screen
        name="log"
        options={{ title: 'Cook Log', tabBarLabel: 'Log' }}
      />
    </Tabs>
  )
}
