'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  recipeId: string
  initialStatus: string
}

const MESSAGES: Record<string, string> = {
  pending: 'Queued for extraction...',
  processing: 'Reading recipe...',
  done: '',
  failed: 'Could not extract recipe details. ',
}

export default function ExtractionStatus({ recipeId, initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus)

  useEffect(() => {
    if (status === 'done') return

    const supabase = createClient()
    const channel = supabase
      .channel(`recipe:${recipeId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'recipes', filter: `id=eq.${recipeId}` },
        (payload) => {
          const newStatus = (payload.new as unknown as { extraction_status: string }).extraction_status
          setStatus(newStatus)
          if (newStatus === 'done') {
            // Reload to show extracted content
            window.location.reload()
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [recipeId, status])

  const message = MESSAGES[status]
  if (!message) return null

  return (
    <div className={`inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-full mb-3 ${
      status === 'failed'
        ? 'bg-red-50 text-red-600'
        : 'bg-blue-50 text-blue-600'
    }`}>
      {status !== 'failed' && (
        <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
      )}
      {message}
      {status === 'failed' && (
        <button
          onClick={async () => {
            await fetch(`/api/recipes/${recipeId}/extract`, { method: 'POST' })
            setStatus('pending')
          }}
          className="underline hover:no-underline"
        >
          Retry
        </button>
      )}
    </div>
  )
}
