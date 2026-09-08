/**
 * Suggestion log API — renderer-side wrapper around Electron IPC.
 *
 * Reads the pilot instrumentation written by electron/src/services/suggestion-logger.ts.
 * Every read takes an optional user id: pass one to scope the figures to a
 * single participant, omit it to pool every session recorded on this machine.
 */

/** Rows logged while nobody was signed in. Mirrors the constant in local-db.ts. */
export const UNATTRIBUTED_USER_ID = '__unattributed__'

export type SuggestionOutcome = 'pending' | 'accepted' | 'dismissed_explicit' | 'dismissed_implicit'

export interface SuggestionLogRow {
  id: string
  user_id: string | null
  memory_baseline_mode: number // 0 = KG-grounded (memory ON), 1 = memory-free baseline
  memory_types: string // JSON string array
  memories: string // JSON string array - the memory text sent to the model
  context: string
  suggestion: string
  shown_at: number
  decision_at: number | null
  time_to_decision_ms: number | null
  outcome: SuggestionOutcome
  final_text: string | null
  edit_distance: number | null
}

export interface SuggestionConditionStats {
  total: number
  accepted: number
  acceptedAsIs: number
  acceptedEdited: number
  dismissedExplicit: number
  dismissedImplicit: number
  pending: number
  acceptanceRate: number | null
  meanTimeToDecisionMs: number | null
  medianTimeToDecisionMs: number | null
  meanEditDistance: number | null
}

export interface SuggestionLogStats {
  total: number
  overall: SuggestionConditionStats
  kgGrounded: SuggestionConditionStats
  memoryFree: SuggestionConditionStats
  memoryTypes: Array<{ type: string; accepted: number; shown: number }>
  daily: Array<{ date: string; kgGrounded: number; memoryFree: number; accepted: number }>
  firstShownAt: number | null
  lastShownAt: number | null
}

export interface SuggestionLogUser {
  userId: string // UNATTRIBUTED_USER_ID when the row carried no user
  email: string | null
  displayName: string | null
  total: number
}

interface ElectronSuggestionLogDB {
  getSuggestionLogEntries(options?: {
    limit?: number
    offset?: number
    userId?: string | null
  }): Promise<SuggestionLogRow[]>
  getSuggestionLogCount(userId?: string | null): Promise<number>
  getSuggestionLogStats(userId?: string | null): Promise<SuggestionLogStats>
  getSuggestionLogUsers(): Promise<SuggestionLogUser[]>
  getSuggestionLogPath(): Promise<string>
  clearSuggestionLog(userId?: string | null): Promise<void>
}

function getDb(): ElectronSuggestionLogDB {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const electron = (window as any).electron
  if (!electron?.db) {
    throw new Error('Electron DB API not available — are you running in Electron?')
  }
  return electron.db as ElectronSuggestionLogDB
}

export async function getSuggestionLogStats(userId?: string | null): Promise<SuggestionLogStats> {
  return getDb().getSuggestionLogStats(userId)
}

export async function getSuggestionLogEntries(
  limit = 200,
  userId?: string | null
): Promise<SuggestionLogRow[]> {
  return getDb().getSuggestionLogEntries({ limit, userId })
}

export async function getSuggestionLogCount(userId?: string | null): Promise<number> {
  return getDb().getSuggestionLogCount(userId)
}

export async function getSuggestionLogUsers(): Promise<SuggestionLogUser[]> {
  return getDb().getSuggestionLogUsers()
}

/** Display name for a participant in the picker and the table. */
export function userLabel(user: SuggestionLogUser): string {
  if (user.userId === UNATTRIBUTED_USER_ID) return 'Not signed in'
  return user.displayName || user.email || `${user.userId.slice(0, 8)}…`
}

export async function getSuggestionLogPath(): Promise<string> {
  return getDb().getSuggestionLogPath()
}

export async function clearSuggestionLog(userId?: string | null): Promise<void> {
  return getDb().clearSuggestionLog(userId)
}

/** Reads a JSON string-array column (memory_types, memories) defensively. */
export function parseStringList(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : []
  } catch {
    return []
  }
}

export const OUTCOME_LABELS: Record<SuggestionOutcome, string> = {
  accepted: 'Accepted',
  dismissed_explicit: 'Dismissed (explicit)',
  dismissed_implicit: 'Dismissed (implicit)',
  pending: 'Pending',
}

/** Exports the full log as CSV text for offline analysis. */
export function toCsv(rows: SuggestionLogRow[]): string {
  const headers = [
    'id',
    'user_id',
    'condition',
    'memory_types',
    'memories',
    'context',
    'suggestion',
    'shown_at',
    'decision_at',
    'time_to_decision_ms',
    'outcome',
    'final_text',
    'edit_distance',
  ]

  const escape = (value: unknown): string => {
    const text = value === null || value === undefined ? '' : String(value)
    return `"${text.replace(/"/g, '""')}"`
  }

  const lines = rows.map((row) =>
    [
      row.id,
      row.user_id,
      row.memory_baseline_mode === 1 ? 'memory_free' : 'kg_grounded',
      parseStringList(row.memory_types).join('|'),
      parseStringList(row.memories).join('|'),
      row.context,
      row.suggestion,
      new Date(row.shown_at).toISOString(),
      row.decision_at ? new Date(row.decision_at).toISOString() : '',
      row.time_to_decision_ms,
      row.outcome,
      row.final_text,
      row.edit_distance,
    ]
      .map(escape)
      .join(',')
  )

  return [headers.join(','), ...lines].join('\n')
}
