// Share Extension UI — shown when user shares a URL from TikTok/Instagram to dishd
// Requires: expo-share-extension, expo-secure-store configured with keychainAccessGroup

import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'

// These imports are mocked here until expo-share-extension is installed via EAS Build
// import { getShareExtensionURL, closeShareExtension } from 'expo-share-extension'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://your-app.vercel.app'
const SECURE_STORE_KEY = 'supabase.auth.token'

type Status = 'loading' | 'saving' | 'success' | 'error' | 'unauthenticated'

export default function ShareView() {
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')
  const [url, setUrl] = useState('')

  useEffect(() => {
    init()
  }, [])

  async function init() {
    try {
      // 1. Get the shared URL from the extension context
      // const sharedUrl = await getShareExtensionURL()
      // For development, mock this:
      const sharedUrl = 'https://www.tiktok.com/t/mock-recipe'
      setUrl(sharedUrl)

      // 2. Get auth token from shared Keychain
      // In production: expo-secure-store with keychainAccessGroup
      const SecureStore = await import('expo-secure-store')
      const rawSession = await SecureStore.getItemAsync(SECURE_STORE_KEY)
      if (!rawSession) {
        setStatus('unauthenticated')
        return
      }

      const session = JSON.parse(rawSession)
      const token = session?.access_token
      if (!token) {
        setStatus('unauthenticated')
        return
      }

      // 3. Save the recipe
      setStatus('saving')
      const res = await fetch(`${API_URL}/api/recipes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ source_url: sharedUrl }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }

      setStatus('success')

      // Auto-dismiss after 2 seconds
      setTimeout(() => {
        // closeShareExtension()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>dishd</Text>

      {status === 'loading' && (
        <>
          <ActivityIndicator color="#f97316" size="large" />
          <Text style={styles.msg}>Getting URL...</Text>
        </>
      )}

      {status === 'saving' && (
        <>
          <ActivityIndicator color="#f97316" size="large" />
          <Text style={styles.msg}>Saving recipe...</Text>
          {url ? <Text style={styles.url} numberOfLines={1}>{url}</Text> : null}
        </>
      )}

      {status === 'success' && (
        <>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successMsg}>Recipe saved!</Text>
          <Text style={styles.subMsg}>Extracting details in the background</Text>
        </>
      )}

      {status === 'unauthenticated' && (
        <>
          <Text style={styles.errorIcon}>⚠</Text>
          <Text style={styles.errorMsg}>Sign in to dishd first</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={() => { /* closeShareExtension() */ }}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </>
      )}

      {status === 'error' && (
        <>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={init}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={() => { /* closeShareExtension() */ }}>
            <Text style={styles.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#fff', alignItems: 'center',
    justifyContent: 'center', padding: 32, gap: 12,
  },
  logo: { fontSize: 28, fontWeight: '700', color: '#f97316', marginBottom: 8 },
  msg: { fontSize: 15, color: '#78716c' },
  url: { fontSize: 12, color: '#a8a29e', maxWidth: 280 },
  successIcon: { fontSize: 48, color: '#16a34a' },
  successMsg: { fontSize: 20, fontWeight: '700', color: '#15803d' },
  subMsg: { fontSize: 13, color: '#78716c' },
  errorIcon: { fontSize: 40, color: '#ef4444' },
  errorMsg: { fontSize: 15, color: '#dc2626', textAlign: 'center' },
  retryBtn: { backgroundColor: '#f97316', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  closeBtn: { paddingVertical: 8 },
  closeBtnText: { color: '#a8a29e', fontSize: 14 },
})
