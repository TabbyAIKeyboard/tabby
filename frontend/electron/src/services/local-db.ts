import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'

let db: Database.Database | null = null

/**
 * Get or initialize the SQLite database.
 * Creates tables if they don't exist.
 */
export function getDatabase(): Database.Database {
  if (db) return db

  const dbPath = path.join(app.getPath('userData'), 'tabby.db')
  console.log('[LocalDB] Opening database at:', dbPath)

  db = new Database(dbPath)

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT NOT NULL DEFAULT 'New Chat',
      type TEXT NOT NULL DEFAULT 'chat',
      lastContext TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      parts TEXT NOT NULL DEFAULT '[]',
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      onboarding_complete INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS suggestion_log (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      memory_baseline_mode INTEGER NOT NULL DEFAULT 0,
      memory_types TEXT NOT NULL DEFAULT '[]',
      memories TEXT NOT NULL DEFAULT '[]',
      context TEXT NOT NULL DEFAULT '',
      suggestion TEXT NOT NULL DEFAULT '',
      shown_at INTEGER NOT NULL,
      decision_at INTEGER,
      time_to_decision_ms INTEGER,
      outcome TEXT NOT NULL,
      final_text TEXT,
      edit_distance INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
    CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);
    CREATE INDEX IF NOT EXISTS idx_suggestion_log_shown_at ON suggestion_log(shown_at);
    CREATE INDEX IF NOT EXISTS idx_suggestion_log_outcome ON suggestion_log(outcome);
  `)

  // Added after the users table shipped - safe to run on every open.
  const userColumns = db.prepare('PRAGMA table_info(users)').all() as { name: string }[]
  if (!userColumns.some((column) => column.name === 'onboarding_complete')) {
    db.exec('ALTER TABLE users ADD COLUMN onboarding_complete INTEGER NOT NULL DEFAULT 0')
    console.log('[LocalDB] Added users.onboarding_complete')
  }

  // Added after suggestion_log shipped - safe to run on every open.
  const suggestionLogColumns = db.prepare('PRAGMA table_info(suggestion_log)').all() as {
    name: string
  }[]
  if (!suggestionLogColumns.some((column) => column.name === 'memories')) {
    db.exec(`ALTER TABLE suggestion_log ADD COLUMN memories TEXT NOT NULL DEFAULT '[]'`)
    console.log('[LocalDB] Added suggestion_log.memories')
  }

  console.log('[LocalDB] Database initialized successfully')
  return db
}

/**
 * Close the database connection gracefully.
 */
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    console.log('[LocalDB] Database closed')
  }
}

// ─── Conversation CRUD ───────────────────────────────────────────

export interface ConversationRow {
  id: string
  user_id: string | null
  title: string
  type: string
  lastContext: string | null
  created_at: string
  updated_at: string
}

export interface MessageRow {
  id: string
  conversation_id: string
  role: string
  parts: string // JSON string
  metadata: string | null // JSON string
  created_at: string
}

export function getConversations(type?: string): ConversationRow[] {
  const database = getDatabase()
  if (type) {
    return database
      .prepare('SELECT * FROM conversations WHERE type = ? ORDER BY updated_at DESC')
      .all(type) as ConversationRow[]
  }
  return database
    .prepare('SELECT * FROM conversations ORDER BY updated_at DESC')
    .all() as ConversationRow[]
}

export function getConversationById(id: string): ConversationRow | undefined {
  const database = getDatabase()
  return database.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as
    | ConversationRow
    | undefined
}

export function createConversation(conversation: {
  id: string
  title: string
  type?: string
  userId?: string
}): ConversationRow {
  const database = getDatabase()
  const now = new Date().toISOString()
  database
    .prepare(
      `INSERT INTO conversations (id, user_id, title, type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      conversation.id,
      conversation.userId || null,
      conversation.title,
      conversation.type || 'chat',
      now,
      now
    )
  return getConversationById(conversation.id)!
}

export function renameConversation(id: string, title: string): void {
  const database = getDatabase()
  database
    .prepare('UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?')
    .run(title, new Date().toISOString(), id)
}

export function deleteConversation(id: string): void {
  const database = getDatabase()
  // Messages are cascade-deleted via FK
  database.prepare('DELETE FROM conversations WHERE id = ?').run(id)
}

// ─── Message CRUD ────────────────────────────────────────────────

export function getMessages(conversationId: string): MessageRow[] {
  const database = getDatabase()
  return database
    .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
    .all(conversationId) as MessageRow[]
}

export function saveMessages(
  messages: Array<{
    id: string
    conversation_id: string
    role: string
    parts: unknown
    metadata?: unknown
  }>
): void {
  const database = getDatabase()
  const upsert = database.prepare(
    `INSERT INTO messages (id, conversation_id, role, parts, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       parts = excluded.parts,
       metadata = excluded.metadata`
  )

  const now = new Date().toISOString()
  const transaction = database.transaction(() => {
    for (const msg of messages) {
      upsert.run(
        msg.id,
        msg.conversation_id,
        msg.role,
        JSON.stringify(msg.parts),
        msg.metadata ? JSON.stringify(msg.metadata) : null,
        now
      )
    }
  })
  transaction()

  // Update conversation timestamp
  if (messages.length > 0) {
    database
      .prepare('UPDATE conversations SET updated_at = ? WHERE id = ?')
      .run(now, messages[0].conversation_id)
  }
}

// ─── Suggestion Log ──────────────────────────────────────────────
// Behavioral instrumentation for the NORA pilot. Rows are written by
// suggestion-logger.ts (which also mirrors them to suggestion-log.jsonl for
// the offline analysis script) and read back by the Settings > Suggestions
// tab. Reads take an optional user id so the tab can scope every figure to one
// participant, or omit it to pool every session recorded on the machine.

export interface SuggestionLogRow {
  id: string
  user_id: string | null
  memory_baseline_mode: number // 0 = memory ON (KG-grounded), 1 = memory-free baseline
  memory_types: string // JSON string array
  memories: string // JSON string array - the memory text sent to the model
  context: string
  suggestion: string
  shown_at: number
  decision_at: number | null
  time_to_decision_ms: number | null
  outcome: string
  final_text: string | null
  edit_distance: number | null
}

export interface SuggestionLogInput {
  id: string
  userId: string | null
  memoryBaselineMode: boolean
  memoryTypes: string[]
  memories: string[]
  context: string
  suggestion: string
  shownAt: number
  decisionAt: number | null
  timeToDecisionMs: number | null
  outcome: string
  finalText: string | null
  editDistance: number | null
}

function suggestionLogInsert(database: Database.Database) {
  // OR IGNORE so re-importing an existing JSONL log is idempotent - ids are
  // generated once per shown suggestion and never reused.
  return database.prepare(
    `INSERT OR IGNORE INTO suggestion_log
       (id, user_id, memory_baseline_mode, memory_types, memories, context, suggestion,
        shown_at, decision_at, time_to_decision_ms, outcome, final_text, edit_distance)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
}

function suggestionLogParams(entry: SuggestionLogInput): unknown[] {
  return [
    entry.id,
    entry.userId,
    entry.memoryBaselineMode ? 1 : 0,
    JSON.stringify(entry.memoryTypes ?? []),
    JSON.stringify(entry.memories ?? []),
    entry.context,
    entry.suggestion,
    entry.shownAt,
    entry.decisionAt,
    entry.timeToDecisionMs,
    entry.outcome,
    entry.finalText,
    entry.editDistance,
  ]
}

export function insertSuggestionLogEntry(entry: SuggestionLogInput): void {
  const database = getDatabase()
  suggestionLogInsert(database).run(...suggestionLogParams(entry))
}

export function insertSuggestionLogEntries(entries: SuggestionLogInput[]): number {
  if (entries.length === 0) return 0
  const database = getDatabase()
  const insert = suggestionLogInsert(database)
  let inserted = 0
  const transaction = database.transaction(() => {
    for (const entry of entries) {
      inserted += insert.run(...suggestionLogParams(entry)).changes
    }
  })
  transaction()
  return inserted
}

/**
 * Sentinel for rows logged while nobody was signed in (user_id IS NULL). Real
 * ids are UUIDs, so this can never collide with one.
 */
export const UNATTRIBUTED_USER_ID = '__unattributed__'

/**
 * WHERE fragment scoping a suggestion_log query to one participant.
 * An undefined/empty userId means "every user".
 */
function suggestionLogScope(userId?: string | null): { clause: string; params: unknown[] } {
  if (!userId) return { clause: '', params: [] }
  if (userId === UNATTRIBUTED_USER_ID) return { clause: ' WHERE user_id IS NULL', params: [] }
  return { clause: ' WHERE user_id = ?', params: [userId] }
}

export interface SuggestionLogUser {
  userId: string // UNATTRIBUTED_USER_ID when the row carried no user
  email: string | null
  displayName: string | null
  total: number
}

/** The participants present in the log, for the tab's user picker. */
export function getSuggestionLogUsers(): SuggestionLogUser[] {
  const database = getDatabase()
  const rows = database
    .prepare(
      `SELECT s.user_id AS userId, u.email AS email, u.display_name AS displayName,
              COUNT(*) AS total
       FROM suggestion_log s
       LEFT JOIN users u ON u.id = s.user_id
       GROUP BY s.user_id
       ORDER BY total DESC`
    )
    .all() as Array<{
    userId: string | null
    email: string | null
    displayName: string | null
    total: number
  }>

  return rows.map((row) => ({
    userId: row.userId ?? UNATTRIBUTED_USER_ID,
    email: row.email,
    displayName: row.displayName,
    total: row.total,
  }))
}

export function getSuggestionLogEntries(options?: {
  limit?: number
  offset?: number
  userId?: string | null
}): SuggestionLogRow[] {
  const database = getDatabase()
  const scope = suggestionLogScope(options?.userId)
  return database
    .prepare(`SELECT * FROM suggestion_log${scope.clause} ORDER BY shown_at DESC LIMIT ? OFFSET ?`)
    .all(...scope.params, options?.limit ?? 200, options?.offset ?? 0) as SuggestionLogRow[]
}

export function getSuggestionLogRowCount(userId?: string | null): number {
  const database = getDatabase()
  const scope = suggestionLogScope(userId)
  const row = database
    .prepare(`SELECT COUNT(*) AS count FROM suggestion_log${scope.clause}`)
    .get(...scope.params) as { count: number }
  return row.count
}

export function clearSuggestionLog(userId?: string | null): void {
  const database = getDatabase()
  const scope = suggestionLogScope(userId)
  database.prepare(`DELETE FROM suggestion_log${scope.clause}`).run(...scope.params)
}

// ─── Suggestion Log Aggregates ───────────────────────────────────

export interface SuggestionConditionStats {
  total: number
  accepted: number
  acceptedAsIs: number
  acceptedEdited: number
  dismissedExplicit: number
  dismissedImplicit: number
  pending: number
  acceptanceRate: number | null // null when the condition has no logged suggestions
  meanTimeToDecisionMs: number | null
  medianTimeToDecisionMs: number | null
  meanEditDistance: number | null // over accepted-and-edited entries only
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

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function summarizeSuggestions(rows: SuggestionLogRow[]): SuggestionConditionStats {
  const accepted = rows.filter((r) => r.outcome === 'accepted')
  const acceptedEdited = accepted.filter((r) => r.edit_distance !== null && r.edit_distance > 0)
  const decisionTimes = rows
    .filter((r) => r.time_to_decision_ms !== null)
    .map((r) => r.time_to_decision_ms as number)

  return {
    total: rows.length,
    accepted: accepted.length,
    acceptedAsIs: accepted.filter((r) => r.edit_distance === 0).length,
    acceptedEdited: acceptedEdited.length,
    dismissedExplicit: rows.filter((r) => r.outcome === 'dismissed_explicit').length,
    dismissedImplicit: rows.filter((r) => r.outcome === 'dismissed_implicit').length,
    pending: rows.filter((r) => r.outcome === 'pending').length,
    acceptanceRate: rows.length ? accepted.length / rows.length : null,
    meanTimeToDecisionMs: mean(decisionTimes),
    medianTimeToDecisionMs: median(decisionTimes),
    meanEditDistance: mean(acceptedEdited.map((r) => r.edit_distance as number)),
  }
}

function parseMemoryTypes(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : []
  } catch {
    return []
  }
}

/**
 * Aggregate the suggestion log for the Settings > Suggestions tab, scoped to
 * one participant when userId is given and pooled across all of them when it
 * is not. Pilot logs run to hundreds of rows, so this reads them and reduces
 * in JS rather than pushing medians and JSON-array fan-out into SQL.
 */
export function getSuggestionLogStats(userId?: string | null): SuggestionLogStats {
  const database = getDatabase()
  const scope = suggestionLogScope(userId)
  const rows = database
    .prepare(`SELECT * FROM suggestion_log${scope.clause} ORDER BY shown_at ASC`)
    .all(...scope.params) as SuggestionLogRow[]

  const kgRows = rows.filter((r) => r.memory_baseline_mode === 0)
  const baselineRows = rows.filter((r) => r.memory_baseline_mode === 1)

  const typeTotals = new Map<string, { accepted: number; shown: number }>()
  for (const row of rows) {
    for (const type of parseMemoryTypes(row.memory_types)) {
      const bucket = typeTotals.get(type) ?? { accepted: 0, shown: 0 }
      bucket.shown += 1
      if (row.outcome === 'accepted') bucket.accepted += 1
      typeTotals.set(type, bucket)
    }
  }

  const dayTotals = new Map<string, { kgGrounded: number; memoryFree: number; accepted: number }>()
  for (const row of rows) {
    const date = new Date(row.shown_at).toISOString().slice(0, 10)
    const bucket = dayTotals.get(date) ?? { kgGrounded: 0, memoryFree: 0, accepted: 0 }
    if (row.memory_baseline_mode === 1) bucket.memoryFree += 1
    else bucket.kgGrounded += 1
    if (row.outcome === 'accepted') bucket.accepted += 1
    dayTotals.set(date, bucket)
  }

  return {
    total: rows.length,
    overall: summarizeSuggestions(rows),
    kgGrounded: summarizeSuggestions(kgRows),
    memoryFree: summarizeSuggestions(baselineRows),
    memoryTypes: [...typeTotals.entries()]
      .map(([type, counts]) => ({ type, ...counts }))
      .sort((a, b) => b.shown - a.shown),
    daily: [...dayTotals.entries()]
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    firstShownAt: rows.length ? rows[0].shown_at : null,
    lastShownAt: rows.length ? rows[rows.length - 1].shown_at : null,
  }
}
