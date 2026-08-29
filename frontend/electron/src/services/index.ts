import { is } from '@electron-toolkit/utils'
import { clipboard } from 'electron'
import { randomUUID } from 'crypto'
import { AppState } from '../app-state'
import { getApiUrl } from '../utils/api-url'
import { ContextCaptureService } from './context-capture'
import { GhostTextOverlay } from './ghost-overlay'
import { KeyboardMonitor } from './keyboard-monitor'
import { KeystrokeListener } from './keystroke-listener'
import { showSuggestionForContext } from '../windows/suggestion-window'
import { recordSuggestionShown, recordSuggestionDecision, feedPostAcceptKeystroke } from './suggestion-logger'

export const createKeyboardMonitor = (): KeyboardMonitor => {
  return new KeyboardMonitor({
    debounceMs: 500,
    minContextLength: 10,
    onSuggestionReady: async (suggestion, context, memoryTypes) => {
      console.log('[GhostText] Suggestion ready:', suggestion.slice(0, 30))
      const id = randomUUID()
      recordSuggestionShown({
        id,
        userId: AppState.currentUserId,
        memoryBaselineMode: AppState.memoryBaselineMode,
        memoryTypes,
        context,
        suggestion,
      })
      await AppState.ghostOverlay?.showSuggestion(suggestion, id)
    },
    onClear: () => {
      // Implicit dismiss: the user kept typing through a shown suggestion
      // without pressing Shift+Tab or Shift+Escape.
      const id = AppState.ghostOverlay?.getCurrentSuggestionId()
      if (id) recordSuggestionDecision(id, 'dismissed_implicit')
      AppState.ghostOverlay?.hide()
    },
    getSuggestion: async (context, signal) => {
      try {
        const response = await fetch(getApiUrl('/api/suggest-inline'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context,
            userId: AppState.currentUserId,
            // Pilot memory-free baseline: omit cached memories client-side
            // too, not just the server-side disableMemory flag, so the two
            // conditions can't accidentally share a code path.
            cachedMemories: AppState.memoryBaselineMode ? [] : AppState.cachedMemories,
            disableMemory: AppState.memoryBaselineMode,
          }),
          signal,
        })
        const data = await response.json()
        return { suggestion: data.suggestion || '', memoryTypes: data.memoryTypes || [] }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('[GhostText] API error:', error)
        }
        return { suggestion: '', memoryTypes: [] }
      }
    },
  })
}

export const startKeystrokeListening = (): void => {
  if (AppState.keystrokeListener?.isRunning()) return

  if (!AppState.keystrokeListener) {
    AppState.keystrokeListener = new KeystrokeListener()
  }

  AppState.keystrokeListener.onKeystroke((char, isBackspace) => {
    feedPostAcceptKeystroke(char, isBackspace)
    AppState.keyboardMonitor?.appendCharacter(char, isBackspace)
  })

  AppState.keystrokeListener.start()
  console.log('[GhostText] Keystroke listening started for auto-trigger')
}

export const stopKeystrokeListening = (): void => {
  if (AppState.keystrokeListener) {
    AppState.keystrokeListener.stop()
    console.log('[GhostText] Keystroke listening stopped')
  }
}

export const initializeGhostText = (): void => {
  if (!AppState.ghostOverlay) {
    AppState.ghostOverlay = new GhostTextOverlay()
    AppState.ghostOverlay.setPort(is.dev ? 3000 : AppState.nextJSPort || 3000)
    AppState.ghostOverlay.create()
  }
  AppState.ghostOverlay.setEnabled(true)

  if (!AppState.keyboardMonitor) {
    AppState.keyboardMonitor = createKeyboardMonitor()
  }
}

export const cleanupGhostText = (): void => {
  stopKeystrokeListening()
  if (AppState.ghostOverlay) {
    AppState.ghostOverlay.destroy()
    AppState.ghostOverlay = null
  }
  if (AppState.keyboardMonitor) {
    AppState.keyboardMonitor.clearBuffer()
    AppState.keyboardMonitor = null
  }
}

export const startClipboardWatcher = (): void => {
  if (AppState.clipboardWatcher) return

  AppState.lastClipboardContent = clipboard.readText()

  AppState.clipboardWatcher = setInterval(() => {
    if (AppState.isInternalClipboardOp) return

    const currentContent = clipboard.readText()

    if (currentContent !== AppState.lastClipboardContent && currentContent.length >= 5) {
      AppState.lastClipboardContent = currentContent
      console.log('[Auto-suggest] Clipboard changed:', currentContent.slice(0, 50))
      showSuggestionForContext(currentContent)
    }
  }, 500)

  console.log('[Auto-suggest] Clipboard watcher started')
}

export const stopClipboardWatcher = (): void => {
  if (AppState.clipboardWatcher) {
    clearInterval(AppState.clipboardWatcher)
    AppState.clipboardWatcher = null
    console.log('[Auto-suggest] Clipboard watcher stopped')
  }
}

export const initializeContextCapture = (): void => {
  AppState.contextCaptureService = new ContextCaptureService()
  AppState.contextCaptureService.onMemoryStored((memory) => {
    if (AppState.brainPanelWindow && !AppState.brainPanelWindow.isDestroyed()) {
      AppState.brainPanelWindow.webContents.send('memory-stored', memory)
    }
  })
}

// Re-export types and classes from service files
export { ContextCaptureService } from './context-capture'
export { GhostTextOverlay } from './ghost-overlay'
export { KeyboardMonitor } from './keyboard-monitor'
export { KeystrokeListener } from './keystroke-listener'
export { getCaretPosition, startCaretTracking } from './caret-tracker'
export {
  recordSuggestionDecision,
  beginPostAcceptEditCapture,
  getSuggestionLogPath,
} from './suggestion-logger'
export type { CaretPosition } from './caret-tracker'
export type { TextOutputMode } from './text-handler'
export {
  captureLastActiveWindow,
  captureSelectedText,
  sendTextToLastWindow,
  pasteToLastWindow,
  cancelTyping,
} from './text-handler'
