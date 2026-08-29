import { globalShortcut, screen } from 'electron'
import { AppState } from '../app-state'
import {
  captureLastActiveWindow,
  captureSelectedText,
  sendTextToLastWindow,
  initializeGhostText,
  createKeyboardMonitor,
  cancelTyping,
  recordSuggestionDecision,
  beginPostAcceptEditCapture,
} from '../services'
import { createBrainPanelWindow, createSuggestionWindow } from '../windows'
import { ensureAuthFlow } from '../services/auth-flow'

export const registerGlobalShortcuts = (): void => {
  globalShortcut.register('CommandOrControl+\\', async () => {
    if (!AppState.mainWindow) return

    // Never surface the overlay before signin/onboarding are done - open the
    // settings window on the pending step instead of a half-usable menu.
    if (ensureAuthFlow()) {
      AppState.mainWindow.hide()
      return
    }

    if (AppState.mainWindow.isVisible()) {
      AppState.mainWindow.hide()
    } else {
      try {
        await captureLastActiveWindow()
        const selectedText = await captureSelectedText()
        console.log('Captured text:', selectedText.slice(0, 50))
        AppState.mainWindow.webContents.send('show-menu', selectedText)
        AppState.mainWindow.show()
        AppState.mainWindow.focus()
      } catch (error) {
        console.error('Error capturing text:', error)
      }
    }
  })

  globalShortcut.register('CommandOrControl+Space', async () => {
    try {
      if (
        AppState.suggestionWindow &&
        !AppState.suggestionWindow.isDestroyed() &&
        AppState.suggestionWindow.isVisible()
      ) {
        AppState.suggestionWindow.hide()
        return
      }

      await captureLastActiveWindow()
      const context = await captureSelectedText()

      if (context.length < 5) {
        console.log('Context too short for suggestion')
        return
      }

      console.log('Suggestion requested, context:', context.slice(0, 50))

      const window = createSuggestionWindow(context)

      const cursorPoint = screen.getCursorScreenPoint()
      window.setPosition(cursorPoint.x + 10, cursorPoint.y + 10)

      if (!window.webContents.isLoading()) {
        window.webContents.send('show-suggestion', { context })
        window.show()
        window.focus()
      } else {
        window.webContents.once('did-finish-load', async () => {
          await new Promise((r) => setTimeout(r, 100))
          console.log('Sending show-suggestion IPC')
          window.webContents.send('show-suggestion', { context })
          window.show()
          window.focus()
        })
      }
    } catch (error) {
      console.error('Error getting suggestion:', error)
    }
  })

  globalShortcut.register('CommandOrControl+Shift+B', () => {
    if (!AppState.brainPanelWindow || AppState.brainPanelWindow.isDestroyed()) {
      const window = createBrainPanelWindow()
      window.show()
    } else if (AppState.brainPanelWindow.isVisible()) {
      AppState.brainPanelWindow.hide()
    } else {
      AppState.brainPanelWindow.show()
    }
  })

  globalShortcut.register('CommandOrControl+Alt+G', async () => {
    console.log('[GhostText] Manual trigger via Ctrl+Alt+G')

    if (!AppState.ghostTextEnabled) {
      AppState.ghostTextEnabled = true
      initializeGhostText()
      AppState.ghostOverlay?.setEnabled(true)

      if (!AppState.keyboardMonitor) {
        AppState.keyboardMonitor = createKeyboardMonitor()
      }
    }

    try {
      await captureLastActiveWindow()
      const selectedText = await captureSelectedText()

      if (selectedText.length >= 5) {
        console.log('[GhostText] Context:', selectedText.slice(0, 50))
        AppState.keyboardMonitor?.setContext(selectedText, true)
      } else {
        console.log('[GhostText] Context too short:', selectedText.length)
      }
    } catch (error) {
      console.error('[GhostText] Error capturing context:', error)
    }
  })

  globalShortcut.register('Shift+Tab', async () => {
    if (!AppState.ghostTextEnabled || !AppState.ghostOverlay?.isShowing()) return

    AppState.keystrokeListener?.pause()

    const suggestion = AppState.ghostOverlay.getCurrentSuggestion()
    const suggestionId = AppState.ghostOverlay.getCurrentSuggestionId()
    console.log('[GhostText] Shift+Tab - accepting suggestion:', suggestion.slice(0, 30))

    AppState.ghostOverlay.hide()
    AppState.keyboardMonitor?.clearBuffer()

    if (suggestion) {
      await captureLastActiveWindow()
      await sendTextToLastWindow(suggestion, AppState.textOutputMode)
      console.log('[GhostText] Suggestion inserted')
    }

    if (suggestionId) {
      recordSuggestionDecision(suggestionId, 'accepted')
      // Watches the next few keystrokes to detect corrections made right
      // after acceptance (accepted-as-is vs. accepted-edited).
      beginPostAcceptEditCapture(suggestionId, suggestion)
    }

    setTimeout(() => {
      AppState.keystrokeListener?.resume()
    }, 100)
  })

  // Universal Panic Button (Stop Typing + Hide UI)
  globalShortcut.register('Shift+Escape', () => {
    console.log('[PanicButton] Triggered via Shift+Escape')
    cancelTyping() // Always try to stop typing

    if (!AppState.ghostTextEnabled) return

    if (AppState.ghostOverlay?.isShowing()) {
      const dismissedId = AppState.ghostOverlay.getCurrentSuggestionId()
      if (dismissedId) recordSuggestionDecision(dismissedId, 'dismissed_explicit')
    }
    AppState.ghostOverlay?.hide()
  })

  // Pilot instrumentation: toggle the memory-free baseline condition on/off
  // without restarting the app. See docs/pilot-protocol.md.
  // Plain Ctrl+Alt+M collides with an existing OS/assistive-tech binding on
  // at least Windows (Electron's globalShortcut.register() fails silently
  // in that case, with no error unless the return value is checked) - the
  // extra Shift makes a collision much less likely.
  const memoryToggleRegistered = globalShortcut.register('CommandOrControl+Alt+Shift+M', () => {
    AppState.memoryBaselineMode = !AppState.memoryBaselineMode
    // Both must be cleared - the LRU cache is keyed on typed text only, so a
    // suggestion fetched under one memory condition could otherwise be
    // silently served under the other after the toggle.
    AppState.keyboardMonitor?.clearBuffer()
    AppState.keyboardMonitor?.clearCache()
    AppState.ghostOverlay?.hide()
    console.log(
      `[Pilot] Memory baseline mode ${
        AppState.memoryBaselineMode ? 'ON (memory disabled)' : 'OFF (memory enabled)'
      }`
    )
  })
  if (!memoryToggleRegistered) {
    console.error(
      '[Pilot] Failed to register Ctrl+Alt+Shift+M - another app/OS feature already owns it. ' +
        'Pick a different combo in shortcuts/index.ts before running the pilot.'
    )
  }
}

export const unregisterGlobalShortcuts = (): void => {
  globalShortcut.unregisterAll()
}
