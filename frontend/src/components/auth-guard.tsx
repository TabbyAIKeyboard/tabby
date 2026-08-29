'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import useUser from '@/hooks/use-user'
import { authPaths, onboardingPath, postAuthPath, protectedPaths } from '@/lib/constants'

/**
 * Route gating for the local-auth flow. Replaces the Supabase Next.js
 * middleware, which can't work here: the session now lives in the Electron
 * store, which is only reachable from the renderer.
 *
 * Onboarding state comes from the user record itself, so it is per-account and
 * can't be stale for a freshly registered user.
 */
export function AuthGuard() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: user, isPending } = useUser()

  useEffect(() => {
    if (isPending || !pathname) return

    const isProtected = protectedPaths.includes(pathname)
    const isAuthPage = authPaths.includes(pathname)

    // Overlay routes are never gated.
    if (!isProtected && !isAuthPage) return

    if (!user) {
      if (isProtected) router.replace('/signin')
      return
    }

    if (!user.onboardingComplete) {
      if (pathname !== onboardingPath) router.replace(onboardingPath)
      return
    }

    if (isAuthPage || pathname === onboardingPath) {
      router.replace(postAuthPath)
    }
  }, [isPending, user, pathname, router])

  return null
}
