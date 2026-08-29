'use client'

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { LocalUser } from '@/lib/auth/types'

/**
 * Reads the signed-in user from the local Electron store.
 * There is no remote auth provider — the user id is a UUID generated
 * on this device at registration.
 */
export default function useUser() {
  const queryClient = useQueryClient()

  // Each window has its own cache, so a signin elsewhere has to invalidate here.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electron?.auth?.onAuthChanged) return
    return window.electron.auth.onAuthChanged(() => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
    })
  }, [queryClient])

  return useQuery<LocalUser | null>({
    queryKey: ['user'],
    queryFn: async () => {
      if (typeof window === 'undefined' || !window.electron?.auth) return null
      return (await window.electron.auth.getCurrentUser()) ?? null
    },
    staleTime: Infinity,
  })
}

/** Invalidate the cached user after signin/signout/profile edits. */
export function useRefreshUser() {
  const queryClient = useQueryClient()
  return (user?: LocalUser | null) => {
    // Seed the cache synchronously when we already have the fresh user, so
    // navigation doesn't race an in-flight refetch.
    if (user !== undefined) queryClient.setQueryData(['user'], user)
    return queryClient.invalidateQueries({ queryKey: ['user'] })
  }
}
