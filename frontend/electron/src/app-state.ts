import { BrowserWindow, Tray } from 'electron'
import Store from 'electron-store'
import type { ContextCaptureService } from './services/context-capture'
import type { GhostTextOverlay } from './services/ghost-overlay'
import type { KeyboardMonitor } from './services/keyboard-monitor'
import type { KeystrokeListener } from './services/keystroke-listener'
import type { TextOutputMode } from './services/text-handler'

const store = new Store()

export type MemoryType = 'LONG_TERM' | 'SHORT_TERM' | 'EPISODIC' | 'SEMANTIC' | 'PROCEDURAL'

export interface CachedMemory {
  memory: string
  // Classifier label from backend/main.py's MemoryClassifier. 'UNKNOWN' covers
  // memories cached by a build that predates type-carrying (see normalize below).
  memoryType: MemoryType | 'UNKNOWN'
}

// Older builds persisted cachedMemories as a bare string[]. Reading that shape
// as CachedMemory[] would blow up on `.memory`, so coerce on load.
export const normalizeCachedMemories = (raw: unknown): CachedMemory[] => {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => {
      if (typeof entry === 'string') return { memory: entry, memoryType: 'UNKNOWN' as const }
      if (entry && typeof entry.memory === 'string') {
        return {
          memory: entry.memory,
          memoryType: (entry.memoryType || 'UNKNOWN') as CachedMemory['memoryType'],
        }
      }
      return null
    })
    .filter((m): m is CachedMemory => m !== null)
}

export interface AppStateType {
  mainWindow: BrowserWindow | null
  settingsWindow: BrowserWindow | null
  suggestionWindow: BrowserWindow | null
  brainPanelWindow: BrowserWindow | null
  tray: Tray | null
  nextJSPort: number | null

  contextCaptureService: ContextCaptureService | null
  ghostOverlay: GhostTextOverlay | null
  keyboardMonitor: KeyboardMonitor | null
  keystrokeListener: KeystrokeListener | null

  suggestionMode: 'hotkey' | 'auto'
  textOutputMode: TextOutputMode
  ghostTextEnabled: boolean
  ghostTextAutoTrigger: boolean
  ghostTextAutoTriggerDelay: number
  contentProtectionEnabled: boolean

  defaultModel: string
  defaultFastModel: string

  clipboardWatcher: NodeJS.Timeout | null
  lastClipboardContent: string
  isInternalClipboardOp: boolean

  currentUserId: string | null
  cachedMemories: CachedMemory[]

  // Pilot instrumentation: when true, ghost-text suggestions are fetched with
  // memory retrieval disabled (memory-free baseline condition). Toggle via
  // Ctrl/Cmd+Alt+M. See docs/pilot-protocol.md.
  memoryBaselineMode: boolean
}

export const AppState: AppStateType = {
  mainWindow: null,
  settingsWindow: null,
  suggestionWindow: null,
  brainPanelWindow: null,
  tray: null,
  nextJSPort: null,

  contextCaptureService: null,
  ghostOverlay: null,
  keyboardMonitor: null,
  keystrokeListener: null,

  suggestionMode: 'hotkey',
  textOutputMode: 'paste',
  ghostTextEnabled: false,
  ghostTextAutoTrigger: false,
  ghostTextAutoTriggerDelay: 3000,
  contentProtectionEnabled: true,

  defaultModel: (store.get('defaultModel') as string) || 'gpt-4.1-mini',
  defaultFastModel: (store.get('defaultFastModel') as string) || 'gpt-4.1-mini',

  clipboardWatcher: null,
  lastClipboardContent: '',
  isInternalClipboardOp: false,

  currentUserId: store.get('userId') as string | null,
  cachedMemories: normalizeCachedMemories(store.get('cachedMemories')),

  memoryBaselineMode: false,
}

export const getStore = () => store

export const getPort = (): number => {
  const { is } = require('@electron-toolkit/utils')
  return is.dev ? 3000 : AppState.nextJSPort || 3000
}
