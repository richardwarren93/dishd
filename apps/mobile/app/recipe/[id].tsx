import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image, Alert, Linking
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { recipesApi } from '../../lib/api'
import type { Recipe } from '@dishd/shared/types'

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [madeItDone, setMadeItDone] = useState(false)
  const [logging, setLogging] = useState(false)

  useEffect(() => {
    if (!id) return
    recipesApi.get(id).then(res => {
      if ('data' in res) setRecipe(res.data)
      setLoading(false)
    })
  }, [id])

  async function logMadeIt() {
    if (!id) return
    Alert.prompt(
      'Made it!',
      'Any notes? (optional)',
      async (notes) => {
        setLogging(true)
        await recipesApi.logCook(id, { notes: notes || null })
        setLogging(false)
        setMadeItDone(true)
      },
      'plain-text',
      '',
    )
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 80 }} color="#f97316" />
  if (!recipe) return <Text style={{ padding: 20 }}>Recipe not found</Text>

  const ingredients = [...(recipe.recipe_ingredients ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const steps = [...(recipe.recipe_steps ?? [])].sort((a, b) => a.step_number - b.step_number)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {recipe.image_url && (
        <Image source={{ uri: recipe.image_url }} style={styles.heroImage} />
      )}

      {(recipe.extraction_status === 'pending' || recipe.extraction_status === 'processing') && (
        <View style={styles.statusBanner}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.statusText}>Extracting recipe details...</Text>
        </View>
      )}

      <Text style={styles.title}>{recipe.title ?? 'Untitled Recipe'}</Text>

      {recipe.description && <Text style={styles.description}>{recipe.description}</Text>}

      {/* Meta */}
      <View style={styles.metaRow}>
        {recipe.prep_time_min && <Text style={styles.metaChip}>Prep {recipe.prep_time_min}m</Text>}
        {recipe.cook_time_min && <Text style={styles.metaChip}>Cook {recipe.cook_time_min}m</Text>}
        {recipe.servings && <Text style={styles.metaChip}>Serves {recipe.servings}</Text>}
        {recipe.cuisine && <Text style={styles.metaChip}>{recipe.cuisine}</Text>}
      </View>

      <TouchableOpacity onPress={() => Linking.openURL(recipe.source_url)}>
        <Text style={styles.sourceLink}>View original ↗</Text>
      </TouchableOpacity>

      {/* Ingredients */}
      {ingredients.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {ingredients.map(item => {
            const ing = item.ingredient
            const parts = [item.quantity?.toString(), item.unit, ing?.name, item.preparation ? `(${item.preparation})` : ''].filter(Boolean).join(' ')
            return (
              <View key={item.id} style={styles.ingredientRow}>
                <View style={styles.bullet} />
                <Text style={styles.ingredientText}>{parts}</Text>
              </View>
            )
          })}
        </View>
      )}

      {/* Steps */}
      {steps.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          {steps.map(step => (
            <View key={step.id} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{step.step_number}</Text>
              </View>
              <Text style={styles.stepText}>{step.instruction}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Made it button */}
      <TouchableOpacity
        style={[styles.madeItBtn, madeItDone && styles.madeItDone]}
        onPress={madeItDone ? undefined : logMadeIt}
        disabled={logging}
      >
        <Text style={styles.madeItText}>
          {logging ? '...' : madeItDone ? 'Logged!' : 'Made it!'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf9' },
  content: { paddingBottom: 40 },
  heroImage: { width: '100%', height: 240 },
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eff6ff', margin: 16, borderRadius: 10, padding: 12 },
  statusText: { color: '#3b82f6', fontSize: 13 },
  title: { fontSize: 26, fontWeight: '700', color: '#1c1917', paddingHorizontal: 16, paddingTop: 16 },
  description: { fontSize: 14, color: '#78716c', paddingHorizontal: 16, marginTop: 8 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 12 },
  metaChip: { backgroundColor: '#f5f5f4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, fontSize: 12, color: '#78716c' },
  sourceLink: { color: '#f97316', fontSize: 13, paddingHorizontal: 16, marginTop: 8 },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#1c1917', marginBottom: 12 },
  ingredientRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#f97316', marginTop: 6 },
  ingredientText: { flex: 1, fontSize: 14, color: '#44403c' },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 12, fontWeight: '700', color: '#f97316' },
  stepText: { flex: 1, fontSize: 14, color: '#44403c', paddingTop: 4 },
  madeItBtn: { margin: 16, backgroundColor: '#f97316', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  madeItDone: { backgroundColor: '#16a34a' },
  madeItText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
