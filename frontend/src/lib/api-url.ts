/**
 * API URL utilities for connecting to the backend service.
 * Uses environment variables with fallbacks for local development.
 *
 * Auth is fully local: there is no bearer token. Requests are scoped by the
 * locally-generated user UUID, read from the Electron main process.
 */

import { DefaultChatTransport, UIMessage } from 'ai'

/**
 * Get the full URL for an API endpoint on the main backend.
 * @param path - The API path (e.g., '/api/chat')
 * @returns Full URL to the API endpoint
 */
export function getApiUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  return `${baseUrl}${path}`
}

/**
 * Get the full URL for an API endpoint on the Memory service.
 * @param path - The API path (e.g., '/memories')
 * @returns Full URL to the Memory API endpoint
 */
export function getMemoryApiUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_MEMORY_API_URL || 'http://localhost:8000'
  return `${baseUrl}${path}`
}

/**
 * Read the local user id from the main process.
 *
 * Deliberately NOT cached in module scope: each Electron window is its own
 * renderer, so a cached id goes stale the moment the user signs in or out in
 * a different window - which silently sends the previous account's id to the
 * API. The IPC round-trip is cheap; always ask.
 */
export async function getUserId(): Promise<string | null> {
  if (typeof window === 'undefined' || !window.electron?.auth) return null

  try {
    const user = await window.electron.auth.getCurrentUser()
    return user?.id ?? null
  } catch (error) {
    console.error('[api-url] Failed to load local user:', error)
    return null
  }
}

/**
 * Create fetch options for API calls.
 * @param options - Additional fetch options to merge
 */
export async function createAuthenticatedFetchOptions(
  options: RequestInit = {}
): Promise<RequestInit> {
  return {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }
}

/**
 * Create a chat transport for useChat that scopes every request to the
 * local user by injecting `userId` into the request body.
 * @param apiPath - The API path (e.g., '/api/chat')
 * @returns Configured DefaultChatTransport
 */
export function createAuthenticatedChatTransport(apiPath: string): DefaultChatTransport<UIMessage> {
  return new DefaultChatTransport<UIMessage>({
    api: getApiUrl(apiPath),
    // Resolved per request so it always reflects the current account.
    body: async () => ({ userId: await getUserId() }),
  })
}
