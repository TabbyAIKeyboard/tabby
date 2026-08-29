import { createSettingsWindow } from '../windows/settings-window'
import { getCurrentUser, hasAnyUser, isOnboardingComplete } from './local-auth'

/**
 * Single source of truth for "where should the user be right now".
 * Both startup and the Ctrl+\ shortcut go through this so the app can never
 * land the user on a route that doesn't match their auth state.
 */
export const getRequiredAuthRoute = (): string | null => {
  if (!getCurrentUser()) {
    // Fresh machine goes straight to register; otherwise sign back in.
    return hasAnyUser() ? '/signin' : '/register'
  }
  if (!isOnboardingComplete()) {
    return '/onboarding'
  }
  return null
}

/**
 * Opens (or focuses and re-routes) the settings window on the step the user
 * still needs to complete. Returns true when the user was sent somewhere,
 * i.e. the app is not ready for normal use yet.
 */
export const ensureAuthFlow = (): boolean => {
  const route = getRequiredAuthRoute()
  if (!route) return false

  const window = createSettingsWindow(route)
  window.show()
  window.focus()
  return true
}

export const isReadyForUse = (): boolean => getRequiredAuthRoute() === null
