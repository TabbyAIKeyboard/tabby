import { app } from 'electron'
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { insertSuggestionLogEntries, insertSuggestionLogEntry } from './local-db'

// Behavioral instrumentation for the NORA pilot: every ghost-text suggestion
// becomes one JSONL line recording whether it was accepted, edited after
// acceptance, or dismissed, plus timing and which memory condition produced
// it. Every entry is written twice: to SQLite (read back by the Settings >
// Suggestions tab) and to a JSONL file (consumed by
// scripts/analyze-suggestion-log.js). See docs/pilot-protocol.md for how to
// run a session and read this log.

export type SuggestionOutcome = 'pending' | 'accepted' | 'dismissed_explicit' | 'dismissed_implicit'

export interface SuggestionLogEntry {
  id: string
  userId: string | null
  memoryBaselineMode: boolean // true = memory retrieval was disabled for this suggestion
  memoryTypes: string[] // classifier labels (EPISODIC/SEMANTIC/PROCEDURAL/...) of memories used, if any
  memories: string[] // the memory text sent to the model, parallel in meaning to memoryTypes
  context: string
  suggestion: string
  shownAt: number
  decisionAt: number | null
  timeToDecisionMs: number | null
  outcome: SuggestionOutcome
  finalText: string | null // reconstructed post-accept text, only set if edited
  editDistance: number | null // Levenshtein distance vs. the accepted suggestion; 0 if accepted as-is
}

const LOG_FILE_NAME = 'suggestion-log.jsonl'
const EDIT_CAPTURE_WINDOW_MS = 4000 // resets on each keystroke after accept
const EDIT_CAPTURE_MAX_WINDOW_MS = 10000 // hard cap regardless of activity

const pendingEntries = new Map<string, SuggestionLogEntry>()

let editCapture: {
  id: string
  acceptedText: string
  reconstructed: string
  windowTimer: NodeJS.Timeout
  maxTimer: NodeJS.Timeout
} | null = null

function getLogFilePath(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, LOG_FILE_NAME)
}

let hasLoggedPath = false

function toDbInput(entry: SuggestionLogEntry) {
  return {
    id: entry.id,
    userId: entry.userId,
    memoryBaselineMode: entry.memoryBaselineMode,
    memoryTypes: entry.memoryTypes,
    memories: entry.memories,
    context: entry.context,
    suggestion: entry.suggestion,
    shownAt: entry.shownAt,
    decisionAt: entry.decisionAt,
    timeToDecisionMs: entry.timeToDecisionMs,
    outcome: entry.outcome,
    finalText: entry.finalText,
    editDistance: entry.editDistance,
  }
}

// The two stores are written independently, so a failure in one (a locked
// database, a full disk) still leaves the pilot with the other.
function persist(entry: SuggestionLogEntry): void {
  try {
    const path = getLogFilePath()
    if (!hasLoggedPath) {
      hasLoggedPath = true
      console.log('[SuggestionLogger] Logging suggestions to:', path)
    }
    appendFileSync(path, JSON.stringify(entry) + '\n', 'utf-8')
  } catch (error) {
    console.error('[SuggestionLogger] Failed to persist entry to JSONL:', error)
  }

  try {
    insertSuggestionLogEntry(toDbInput(entry))
  } catch (error) {
    console.error('[SuggestionLogger] Failed to persist entry to database:', error)
  }
}

// Classic O(mn) edit distance - suggestion/edit strings are short (a few
// words), so no need for a dependency here.
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  let curr = new Array(n + 1).fill(0)

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

export function recordSuggestionShown(params: {
  id: string
  userId: string | null
  memoryBaselineMode: boolean
  memoryTypes: string[]
  memories: string[]
  context: string
  suggestion: string
}): void {
  pendingEntries.set(params.id, {
    id: params.id,
    userId: params.userId,
    memoryBaselineMode: params.memoryBaselineMode,
    memoryTypes: params.memoryTypes,
    memories: params.memories,
    context: params.context,
    suggestion: params.suggestion,
    shownAt: Date.now(),
    decisionAt: null,
    timeToDecisionMs: null,
    outcome: 'pending',
    finalText: null,
    editDistance: null,
  })
}

export function recordSuggestionDecision(
  id: string,
  outcome: Exclude<SuggestionOutcome, 'pending'>
): void {
  const entry = pendingEntries.get(id)
  if (!entry) return

  entry.decisionAt = Date.now()
  entry.timeToDecisionMs = entry.decisionAt - entry.shownAt
  entry.outcome = outcome

  if (outcome === 'accepted') {
    // Held open, not persisted yet - beginPostAcceptEditCapture/finalizeEditCapture
    // writes the final line once the edit-capture window closes, so
    // accepted-as-is vs. accepted-edited lands on the same log entry.
    return
  }

  pendingEntries.delete(id)
  persist(entry)
}

// Approximates post-acceptance edits by reconstructing the final text from
// keystrokes captured in a short window right after acceptance, assuming the
// cursor stays where the suggestion was inserted (no repositioning). This is
// a proxy, not a read-back of the target application's real text - Tabby has
// no accessibility hook into arbitrary external apps. Document this as a
// limitation in the paper.
export function beginPostAcceptEditCapture(id: string, acceptedText: string): void {
  finalizeEditCapture()

  editCapture = {
    id,
    acceptedText,
    reconstructed: acceptedText,
    windowTimer: setTimeout(finalizeEditCapture, EDIT_CAPTURE_WINDOW_MS),
    maxTimer: setTimeout(finalizeEditCapture, EDIT_CAPTURE_MAX_WINDOW_MS),
  }
}

export function feedPostAcceptKeystroke(char: string, isBackspace: boolean): void {
  if (!editCapture) return

  editCapture.reconstructed = isBackspace
    ? editCapture.reconstructed.slice(0, -1)
    : editCapture.reconstructed + char

  clearTimeout(editCapture.windowTimer)
  editCapture.windowTimer = setTimeout(finalizeEditCapture, EDIT_CAPTURE_WINDOW_MS)
}

function finalizeEditCapture(): void {
  if (!editCapture) return

  const { id, acceptedText, reconstructed, windowTimer, maxTimer } = editCapture
  clearTimeout(windowTimer)
  clearTimeout(maxTimer)
  editCapture = null

  const entry = pendingEntries.get(id)
  pendingEntries.delete(id)
  if (!entry) return

  const edited = reconstructed !== acceptedText
  entry.finalText = edited ? reconstructed : null
  entry.editDistance = edited ? levenshtein(acceptedText, reconstructed) : 0
  persist(entry)
}

export function getSuggestionLogPath(): string {
  return getLogFilePath()
}

/**
 * One-time import of a pre-existing suggestion-log.jsonl into SQLite, so
 * sessions recorded before the database existed still show up in Settings >
 * Suggestions. Inserts are OR IGNORE keyed on the entry id, so running this on
 * every launch is harmless and never duplicates a row.
 */
export function importJsonlLogIntoDatabase(): number {
  const path = getLogFilePath()
  if (!existsSync(path)) return 0

  try {
    const entries: SuggestionLogEntry[] = []
    for (const line of readFileSync(path, 'utf-8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        entries.push(JSON.parse(trimmed) as SuggestionLogEntry)
      } catch {
        // A truncated final line (app killed mid-write) shouldn't sink the import.
        console.warn('[SuggestionLogger] Skipping unparseable log line')
      }
    }

    const imported = insertSuggestionLogEntries(
      entries.map((entry) => toDbInput({ ...entry, memories: entry.memories ?? [] }))
    )
    if (imported > 0) {
      console.log(`[SuggestionLogger] Imported ${imported} entries from ${path} into SQLite`)
    }
    return imported
  } catch (error) {
    console.error('[SuggestionLogger] Failed to import JSONL log:', error)
    return 0
  }
}
