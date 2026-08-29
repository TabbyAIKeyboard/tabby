'use client'

import { useEffect } from 'react'
import { getAllMemories, type MemoryResult } from '@/lib/ai/tools/memory/client'
import type { CachedMemory, MemoryType } from '@/lib/memory-types'

/**
 * Initializes and caches user memories at app startup for low-latency inline suggestions.
 * Fetches every classifier type and stores each memory alongside its type in electron-store,
 * so /api/suggest-inline can report memory-type attribution without a second lookup.
 */

// Every label backend/main.py's MemoryClassifier can assign. All five are cached:
// the pilot log attributes accepted completions to the types that grounded them,
// so a type missing from the cache is a type that can never be credited.
const MEMORY_TYPES: MemoryType[] = [
  'LONG_TERM',
  'SHORT_TERM',
  'EPISODIC',
  'SEMANTIC',
  'PROCEDURAL',
]

export function MemoryInitializer() {
  useEffect(() => {
    const initializeMemories = async () => {
      if (typeof window === 'undefined' || !window.electron) return

      try {
        const userId = await window.electron.getUserId()
        if (!userId) {
          console.log('[MemoryInitializer] No user ID, skipping memory cache')
          return
        }

        console.log('[MemoryInitializer] Fetching memories for user:', userId)

        const results = await Promise.all(
          MEMORY_TYPES.map((type) =>
            getAllMemories(userId, type).catch((err) => {
              console.error(`[MemoryInitializer] Failed to fetch ${type}:`, err)
              return { memories: { results: [] } }
            })
          )
        )

        // Response structure is { success, memories: { results: [...] } }.
        // Each request filtered on one type, so the type is known from the
        // request itself - no need to read it back off m.metadata.
        const allMemories: CachedMemory[] = results.flatMap((result, i) =>
          ((result?.memories?.results || []) as MemoryResult[]).map((m) => ({
            memory: m.memory,
            memoryType: MEMORY_TYPES[i],
          }))
        )

        console.log('[MemoryInitializer] Caching', allMemories.length, 'memories')
        window.electron.setCachedMemories(allMemories)
      } catch (error) {
        console.error('[MemoryInitializer] Failed to initialize memories:', error)
      }
    }

    initializeMemories()

    // Re-cache when the account changes, so a signed-in user never inherits
    // the previous account's memories.
    return window.electron?.auth?.onAuthChanged?.(() => {
      initializeMemories()
    })
  }, [])

  return null
}
