import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, RefreshControl, Image
} from 'react-native'
import { useRouter } from 'expo-router'
import { recipesApi } from '../../lib/api'
import type { Recipe } from '@dishd/shared/types'

export default function FeedScreen() {
  const router = useRouter()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await recipesApi.list()
    if ('data' in res) setRecipes(res.data)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function saveUrl() {
    if (!url.trim()) return
    setSaving(true)
    setError(null)
    const res = await recipesApi.save({ source_url: url.trim() })
    setSaving(false)
    if ('error' in res) { setError(res.error); return }
    setUrl('')
    router.push(`/recipe/${res.data.id}`)
    load()
  }

  const renderItem = ({ item }: { item: Recipe }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/recipe/${item.id}`)}
      activeOpacity={0.8}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
          <Text style={{ fontSize: 32 }}>🍽️</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        {item.extraction_status === 'pending' || item.extraction_status === 'processing' ? (
          <Text style={styles.cardStatusPending}>Extracting recipe...</Text>
        ) : item.extraction_status === 'failed' ? (
          <Text style={styles.cardStatusFailed}>Extraction failed</Text>
        ) : null}
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title ?? new URL(item.source_url).hostname}
        </Text>
        <View style={styles.cardMeta}>
          {item.cuisine ? <Text style={styles.metaText}>{item.cuisine}</Text> : null}
          {item.cook_time_min ? <Text style={styles.metaText}>{item.cook_time_min}m</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      {/* Save URL bar */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="Paste a TikTok or Instagram URL..."
          autoCapitalize="none"
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={saveUrl}
        />
        <TouchableOpacity style={styles.saveBtn} onPress={saveUrl} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? '...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#f97316" />
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={r => r.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#f97316" />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No recipes yet</Text>
              <Text style={styles.emptySubText}>Paste a URL above or share from TikTok/Instagram</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf9' },
  inputRow: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f5f5f4' },
  input: { flex: 1, borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#fafaf9' },
  saveBtn: { backgroundColor: '#f97316', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  error: { color: '#dc2626', fontSize: 12, paddingHorizontal: 12, marginTop: 4 },
  list: { padding: 12, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardImage: { width: '100%', height: 160 },
  cardImagePlaceholder: { backgroundColor: '#fef3e2', alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 12 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#1c1917', marginBottom: 4 },
  cardStatusPending: { fontSize: 11, color: '#3b82f6', marginBottom: 4 },
  cardStatusFailed: { fontSize: 11, color: '#ef4444', marginBottom: 4 },
  cardMeta: { flexDirection: 'row', gap: 12 },
  metaText: { fontSize: 12, color: '#a8a29e' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: '#78716c', fontWeight: '500' },
  emptySubText: { fontSize: 13, color: '#a8a29e', marginTop: 6, textAlign: 'center', paddingHorizontal: 24 },
})
