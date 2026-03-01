/**
 * Get the backend API URL for Electron services.
 * Uses NEXT_PUBLIC_API_URL env var or defaults to localhost:3001
 */
export function getApiUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  return `${baseUrl}${path}`;
}

/**
 * Get the Memory API URL for Electron services.
 * Uses NEXT_PUBLIC_MEMORY_API_URL env var or defaults to localhost:8000
 */
export function getMemoryApiUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_MEMORY_API_URL || "http://localhost:8000";
  return `${baseUrl}${path}`;
}
