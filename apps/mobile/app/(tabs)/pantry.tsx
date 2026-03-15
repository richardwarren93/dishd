import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, RefreshControl, Alert
} from 'react-native'
import { pantryApi, recommendationsApi } from '../../lib/api'
import type { PantryItem, AIRecommendation } from '@dishd/shared/types'

export default function PantryScreen() {
  const [items, setItems] = useState<PantryItem[]>([])
  const [suggestions, setSuggestions] = useState<AIRecommendation[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingRecs, setLoadingRecs] = useState(false)
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')
  const [unit, setUnit] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    const res = await pantryApi.list()
    if ('data' in res) setItems(res.data)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addItem() {
    if (!name.trim()) return
    setAdding(true)
    const res = await pantryApi.upsert({
      ingredient_name: name.trim(),
      quantity: qty ? parseFloat(qty) : null,
      unit: unit || null,
    })
    setAdding(false)
    if ('data' in res) {
      setItems(prev => [res.data, ...prev.filter(i => i.id !== res.data.id)])
      setName('')
      setQty('')
      setUnit('')
    }
  }

  async function removeItem(id: string) {
    await pantryApi.delete(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function getRecommendations() {
    setLoadingRecs(true)
    const res = await recommendationsApi.get()
    setLoadingRecs(false)
    if ('data' in res) setSuggestions(res.data.suggestions)
    else Alert.alert('Error', res.error)
  }

  return (
    <View style={styles.container}>
      {/* Add item form */}
      <View style={styles.addForm}>
        <TextInput
          style={[styles.input, { flex: 2 }]}
          value={name}
          onChangeText={setName}
          placeholder="Ingredient"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          value={qty}
          onChangeText={setQty}
          placeholder="Qty"
          keyboardType="decimal-pad"
        />
        <TextInput
          style={styles.input}
          value={unit}
          onChangeText={setUnit}
          placeholder="Unit"
        />
        <TouchableOpacity style={styles.addBtn} onPress={addItem} disabled={adding}>
          <Text style={styles.addBtnText}>{adding ? '...' : '+'}</Text>
        </TouchableOpacity>
      </View>

      {/* Recommendations button */}
      <TouchableOpacity style={styles.recBtn} onPress={getRecommendations} disabled={loadingRecs}>
        <Text style={styles.recBtnText}>{loadingRecs ? 'Thinking...' : '✨ Get recipe suggestions'}</Text>
      </TouchableOpacity>

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsBox}>
          <Text style={styles.sectionTitle}>Suggestions</Text>
          {suggestions.map((s, i) => (
            <View key={i} style={styles.suggestion}>
              <Text style={styles.suggestionTitle}>{s.recipe_title}</Text>
              <Text style={styles.suggestionReason}>{s.reason}</Text>
              <Text style={styles.suggestionMeta}>{s.estimated_cook_time_min}m · {s.difficulty}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Pantry list */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#f97316" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#f97316" />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>Pantry is empty. Add ingredients above.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowBody}>
                <Text style={styles.ingredientName}>{item.ingredient?.name ?? 'Unknown'}</Text>
                {(item.quantity || item.unit) && (
                  <Text style={styles.ingredientMeta}>
                    {[item.quantity, item.unit].filter(Boolean).join(' ')}
                  </Text>
                )}
                {item.expires_at && (
                  <Text style={styles.expires}>Exp {item.expires_at}</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => removeItem(item.id)}>
                <Text style={styles.removeBtn}>×</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf9' },
  addForm: { flexDirection: 'row', padding: 12, gap: 6, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f5f5f4' },
  input: { borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, backgroundColor: '#fafaf9', flex: 1 },
  addBtn: { backgroundColor: '#f97316', borderRadius: 10, width: 36, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 20, fontWeight: '600', lineHeight: 24 },
  recBtn: { margin: 12, backgroundColor: '#fff7ed', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#fed7aa' },
  recBtnText: { color: '#ea580c', fontWeight: '600', fontSize: 14 },
  suggestionsBox: { marginHorizontal: 12, marginBottom: 8, backgroundColor: '#fff', borderRadius: 14, padding: 12, gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#78716c', marginBottom: 4 },
  suggestion: { paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f4' },
  suggestionTitle: { fontSize: 14, fontWeight: '600', color: '#1c1917' },
  suggestionReason: { fontSize: 12, color: '#78716c', marginTop: 2 },
  suggestionMeta: { fontSize: 11, color: '#a8a29e', marginTop: 2 },
  list: { padding: 12, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  rowBody: { flex: 1 },
  ingredientName: { fontSize: 14, fontWeight: '500', color: '#1c1917' },
  ingredientMeta: { fontSize: 12, color: '#78716c' },
  expires: { fontSize: 11, color: '#a8a29e', marginTop: 2 },
  removeBtn: { fontSize: 22, color: '#d6d3d1', paddingHorizontal: 4 },
  empty: { textAlign: 'center', color: '#a8a29e', marginTop: 40, fontSize: 14 },
})
