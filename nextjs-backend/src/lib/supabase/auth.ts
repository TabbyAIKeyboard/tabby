import supabaseAdmin from './admin'

/**
 * Get the authenticated user ID from the request.
 *
 * This function uses token-based authentication via the Authorization header.
 * The frontend must send the Supabase access token as: Authorization: Bearer <token>
 *
 * @param request - The incoming request
 * @returns The user ID if authenticated, null otherwise
 */
export async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    console.error('[Auth] Missing or invalid Authorization header')
    return null
  }

  const token = authHeader.substring(7)

  try {
    // Use the admin client to verify the JWT token
    const admin = supabaseAdmin()
    const {
      data: { user },
      error,
    } = await admin.auth.getUser(token)

    if (error) {
      console.error('[Auth] Token verification failed:', error.message)
      return null
    }

    if (user) {
      return user.id
    }
  } catch (error) {
    console.error('[Auth] Error verifying token:', error)
    return null
  }

  return null
}
