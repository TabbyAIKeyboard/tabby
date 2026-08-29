import { globalShortcut, screen } from 'electron'
import { AppState } from '../app-state'
import {
  captureLastActiveWindow,
  captureSelectedText,
  sendTextToLastWindow,
  initializeGhostText,
  createKeyboardMonitor,
  cancelTyping,
} from '../services'
import { createBrainPanelWindow, createSuggestionWindow } from '../windows'

export const registerGlobalShortcuts = (): void => {
  globalShortcut.register('CommandOrControl+\\', async () => {
    if (!AppState.mainWindow) return

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
    console.log('[GhostText] Shift+Tab - accepting suggestion:', suggestion.slice(0, 30))

    AppState.ghostOverlay.hide()
    AppState.keyboardMonitor?.clearBuffer()

    if (suggestion) {
      await captureLastActiveWindow()
      await sendTextToLastWindow(suggestion, AppState.textOutputMode)
      console.log('[GhostText] Suggestion inserted')
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
    AppState.ghostOverlay?.hide()
  })
}

export const unregisterGlobalShortcuts = (): void => {
  globalShortcut.unregisterAll()
}
