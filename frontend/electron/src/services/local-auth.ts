import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'crypto'
import { AppState, getStore } from '../app-state'
import { getDatabase } from './local-db'

/**
 * Fully local email/password auth.
 *
 * Credentials live in the app's SQLite database; the "session" is just the
 * current user id persisted in electron-store. There are no tokens, no expiry
 * and no network calls — the generated UUID is what scopes every request to
 * the memory API and the hosted AI routes.
 */

// scrypt from node's stdlib rather than bcrypt/argon2: those are native modules
// that would need rebuilding against Electron's ABI on every package.
const SCRYPT_KEYLEN = 64
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 }

const CURRENT_USER_KEY = 'userId'

export interface LocalUser {
  id: string
  email: string
  displayName: string | null
  onboardingComplete: boolean
  createdAt: string
}

interface UserRow {
  id: string
  email: string
  password_hash: string
  display_name: string | null
  onboarding_complete: number
  created_at: string
}

export type AuthResult = { ok: true; user: LocalUser } | { ok: false; error: string }

const toLocalUser = (row: UserRow): LocalUser => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name,
  onboardingComplete: row.onboarding_complete === 1,
  createdAt: row.created_at,
})

const normalizeEmail = (email: string): string => email.trim().toLowerCase()

const hashPassword = (password: string): string => {
  const salt = randomBytes(16)
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS)
  return `${salt.toString('hex')}:${derived.toString('hex')}`
}

const verifyPassword = (password: string, stored: string): boolean => {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false

  try {
    const expected = Buffer.from(hashHex, 'hex')
    const derived = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, SCRYPT_PARAMS)
    return timingSafeEqual(derived, expected)
  } catch (error) {
    console.error('[Auth] Password verification failed:', error)
    return false
  }
}

const findByEmail = (email: string): UserRow | undefined => {
  return getDatabase().prepare('SELECT * FROM users WHERE email = ?').get(email) as
    | UserRow
    | undefined
}

const findById = (id: string): UserRow | undefined => {
  return getDatabase().prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
}

/** Persist the signed-in user so every window and the main process agree on it. */
const setCurrentUser = (userId: string | null): void => {
  const previousUserId = AppState.currentUserId
  AppState.currentUserId = userId

  if (userId) {
    getStore().set(CURRENT_USER_KEY, userId)
  } else {
    getStore().delete(CURRENT_USER_KEY)
  }

  // Memories are cached globally for low-latency inline suggestions, so they
  // must be dropped on any account change - otherwise the previous account's
  // memories get sent to the API under the new user's id.
  if (previousUserId !== userId) {
    AppState.cachedMemories = []
    getStore().set('cachedMemories', [])
  }
}

export const registerUser = (
  email: string,
  password: string,
  displayName?: string
): AuthResult => {
  const normalized = normalizeEmail(email)

  if (!normalized.includes('@')) {
    return { ok: false, error: 'Enter a valid email address' }
  }
  if (password.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters' }
  }
  if (findByEmail(normalized)) {
    return { ok: false, error: 'An account with this email already exists' }
  }

  const id = randomUUID()
  getDatabase()
    .prepare('INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)')
    .run(id, normalized, hashPassword(password), displayName?.trim() || null)

  const row = findById(id)!
  setCurrentUser(id)
  console.log('[Auth] Registered local user:', normalized, id)

  return { ok: true, user: toLocalUser(row) }
}

export const signInUser = (email: string, password: string): AuthResult => {
  const row = findByEmail(normalizeEmail(email))

  // Same message either way so the form can't be used to enumerate accounts.
  if (!row || !verifyPassword(password, row.password_hash)) {
    return { ok: false, error: 'Invalid email or password' }
  }

  setCurrentUser(row.id)
  console.log('[Auth] Signed in local user:', row.email, row.id)

  return { ok: true, user: toLocalUser(row) }
}

export const signOutUser = (): void => {
  console.log('[Auth] Signing out local user:', AppState.currentUserId)
  setCurrentUser(null)
}

export const getCurrentUser = (): LocalUser | null => {
  const userId = AppState.currentUserId
  if (!userId) return null

  const row = findById(userId)
  if (!row) {
    // Store points at a user that no longer exists — treat it as signed out.
    setCurrentUser(null)
    return null
  }

  return toLocalUser(row)
}

export const updateDisplayName = (displayName: string): AuthResult => {
  const userId = AppState.currentUserId
  if (!userId) return { ok: false, error: 'Not signed in' }

  getDatabase()
    .prepare('UPDATE users SET display_name = ? WHERE id = ?')
    .run(displayName.trim() || null, userId)

  const row = findById(userId)
  if (!row) return { ok: false, error: 'Not signed in' }

  return { ok: true, user: toLocalUser(row) }
}

export const changePassword = (currentPassword: string, newPassword: string): AuthResult => {
  const userId = AppState.currentUserId
  if (!userId) return { ok: false, error: 'Not signed in' }

  const row = findById(userId)
  if (!row || !verifyPassword(currentPassword, row.password_hash)) {
    return { ok: false, error: 'Current password is incorrect' }
  }
  if (newPassword.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters' }
  }

  getDatabase()
    .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .run(hashPassword(newPassword), userId)

  return { ok: true, user: toLocalUser(row) }
}

/** True when at least one account exists, so the UI can open signin vs. register. */
export const hasAnyUser = (): boolean => {
  const row = getDatabase().prepare('SELECT COUNT(*) as count FROM users').get() as {
    count: number
  }
  return row.count > 0
}

/**
 * Onboarding state is stored per user rather than globally: a new local
 * account must run onboarding even if a previous account on this machine
 * already did.
 */
export const isOnboardingComplete = (): boolean => {
  const user = getCurrentUser()
  return user?.onboardingComplete ?? false
}

export const setOnboardingComplete = (complete: boolean): void => {
  const userId = AppState.currentUserId
  if (!userId) return

  getDatabase()
    .prepare('UPDATE users SET onboarding_complete = ? WHERE id = ?')
    .run(complete ? 1 : 0, userId)
}
