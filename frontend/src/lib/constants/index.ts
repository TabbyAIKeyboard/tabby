/**
 * Full-page routes that require a signed-in local user.
 *
 * Deliberately excludes the overlay routes ('/', '/suggestion',
 * '/ghost-overlay'): those render in frameless always-on-top windows where a
 * sign-in form or a redirect makes no sense.
 */
export const protectedPaths = [
  '/settings',
  '/brain-panel',
  '/onboarding',
  '/dashboard',
  '/analytics',
  '/preferences',
]
export const authPaths = ['/register', '/signin']
export const onboardingPath = '/onboarding'

/** Where a user lands once signin and onboarding are both done. */
export const postAuthPath = '/settings'
