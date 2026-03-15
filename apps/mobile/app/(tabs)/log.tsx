import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'

interface CookLogEntry {
  id: string
  cooked_at: string
  rating: number | null
  notes: string | null
  recipes: { id: string; title: string | null } | null
}

export default function LogScreen() {
  const router = useRouter()
  const [logs, setLogs] = useState<CookLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('cook_logs')
      .select('id, cooked_at, rating, notes, recipes(id, title)')
      .eq('user_id', user.id)
      .order('cooked_at', { ascending: false })
      .limit(50)
    setLogs((data as unknown as CookLogEntry[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#f97316" />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={l => l.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#f97316" />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nothing cooked yet</Text>
              <Text style={styles.emptySubText}>Tap "Made it!" on a recipe to log your first cook</Text>
            </View>
          }
          renderItem={({ item }) => {
            const date = new Date(item.cooked_at)
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => item.recipes && router.push(`/recipe/${item.recipes.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.dateBadge}>
                  <Text style={styles.dateMonth}>
                    {date.toLocaleDateString('en', { month: 'short' })}
                  </Text>
                  <Text style={styles.dateDay}>{date.getDate()}</Text>
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.recipes?.title ?? 'Unknown recipe'}
                  </Text>
                  {item.rating && (
                    <Text style={styles.stars}>
                      {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
                    </Text>
                  )}
                  {item.notes && <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>}
                </View>
              </TouchableOpacity>
            )
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf9' },
  list: { padding: 12, gap: 8 },
  row: { flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  dateBadge: { width: 44, alignItems: 'center' },
  dateMonth: { fontSize: 10, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: 0.5 },
  dateDay: { fontSize: 24, fontWeight: '700', color: '#1c1917', lineHeight: 28 },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#1c1917' },
  stars: { color: '#f97316', fontSize: 13, marginTop: 2 },
  notes: { fontSize: 12, color: '#78716c', marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: '#78716c', fontWeight: '500' },
  emptySubText: { fontSize: 13, color: '#a8a29e', marginTop: 6, textAlign: 'center', paddingHorizontal: 24 },
})
