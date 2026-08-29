/**
 * Shape of the locally-stored user, mirrored from
 * `electron/src/services/local-auth.ts`. The id is a UUID generated on the
 * device at registration — it is what scopes memories and AI requests.
 */
export interface LocalUser {
  id: string
  email: string
  displayName: string | null
  onboardingComplete: boolean
  createdAt: string
}

export type AuthResult = { ok: true; user: LocalUser } | { ok: false; error: string }
