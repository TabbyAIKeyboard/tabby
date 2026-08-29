/**
 * Shared shape for memories cached in electron-store for inline suggestions.
 * The Electron main process keeps its own structural copy in
 * electron/src/app-state.ts (separate build) - keep the two in sync.
 */

/** Every label backend/main.py's MemoryClassifier can assign. */
export type MemoryType = 'LONG_TERM' | 'SHORT_TERM' | 'EPISODIC' | 'SEMANTIC' | 'PROCEDURAL'

/** A memory plus the classifier label it was stored under. */
export interface CachedMemory {
  memory: string
  // 'UNKNOWN' covers memories cached by a build that predates type-carrying.
  memoryType: MemoryType | 'UNKNOWN'
}
