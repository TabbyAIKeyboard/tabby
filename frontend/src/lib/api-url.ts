/**
 * API URL utilities for connecting to the backend service.
 * Uses environment variables with fallbacks for local development.
 */

import { createSupabaseBrowser } from '@/lib/supabase/client';
import { DefaultChatTransport, UIMessage } from 'ai';

// Cache for the current session token (refreshed on auth state changes)
let cachedAccessToken: string | null = null;

// Initialize the auth listener to keep the token cache updated
if (typeof window !== 'undefined') {
  const supabase = createSupabaseBrowser();
  
  // Get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    cachedAccessToken = session?.access_token || null;
  });
  
  // Listen for auth state changes
  supabase.auth.onAuthStateChange((_event, session) => {
    cachedAccessToken = session?.access_token || null;
  });
}

/**
 * Get the full URL for an API endpoint on the main backend.
 * @param path - The API path (e.g., '/api/chat')
 * @returns Full URL to the API endpoint
 */
export function getApiUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return `${baseUrl}${path}`;
}

/**
 * Get the full URL for an API endpoint on the Memory service.
 * @param path - The API path (e.g., '/memories')
 * @returns Full URL to the Memory API endpoint
 */
export function getMemoryApiUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_MEMORY_API_URL || 'http://localhost:8000';
  return `${baseUrl}${path}`;
}

/**
 * Get authentication headers synchronously using the cached access token.
 * This is useful for useChat transport which requires a sync headers function.
 * @returns Headers object with Authorization header if authenticated
 */
export function getAuthHeadersSync(): Record<string, string> {
  if (cachedAccessToken) {
    return {
      'Authorization': `Bearer ${cachedAccessToken}`,
    };
  }
  return {};
}

/**
 * Get authentication headers with the Supabase access token (async version).
 * This is necessary for cross-origin requests where cookies can't be shared
 * (e.g., Electron app calling hosted backend).
 * @returns Headers object with Authorization header if authenticated
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  try {
    const supabase = createSupabaseBrowser();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      // Also update the cache
      cachedAccessToken = session.access_token;
      return {
        'Authorization': `Bearer ${session.access_token}`,
      };
    }
  } catch (error) {
    console.error('[getAuthHeaders] Error getting session:', error);
  }
  
  return {};
}

/**
 * Create fetch options with authentication headers.
 * Use this for all API calls to ensure auth works across origins.
 * @param options - Additional fetch options to merge
 * @returns Fetch options with auth headers included
 */
export async function createAuthenticatedFetchOptions(
  options: RequestInit = {}
): Promise<RequestInit> {
  const authHeaders = await getAuthHeaders();
  
  return {
    ...options,
    credentials: 'include' as RequestCredentials,
    headers: {
      ...authHeaders,
      ...options.headers,
    },
  };
}

/**
 * Create an authenticated DefaultChatTransport for useChat.
 * This transport includes both credentials and Authorization headers
 * to work across origins (Electron app -> hosted backend).
 * @param apiPath - The API path (e.g., '/api/chat')
 * @returns Configured DefaultChatTransport
 */
export function createAuthenticatedChatTransport(apiPath: string): DefaultChatTransport<UIMessage> {
  return new DefaultChatTransport<UIMessage>({
    api: getApiUrl(apiPath),
    credentials: 'include',
    headers: () => getAuthHeadersSync(),
  });
}
