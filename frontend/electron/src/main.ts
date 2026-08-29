import { app, BrowserWindow } from 'electron'
import { AppState } from './app-state'
import { createMainWindow } from './windows'
import { createTray, destroyTray } from './tray'
import { initializeContextCapture } from './services'
import { ensureAuthFlow } from './services/auth-flow'
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from './shortcuts'
import { registerAllIpcHandlers } from './ipc'

console.log('[Main] Loaded User ID:', AppState.currentUserId)

app.whenReady().then(() => {
  createMainWindow()
  createTray()
  initializeContextCapture()
  registerGlobalShortcuts()
  registerAllIpcHandlers()

  // Sends the user to register / signin / onboarding if any step is pending.
  ensureAuthFlow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('will-quit', () => {
  unregisterGlobalShortcuts()
  destroyTray()
})

app.on('window-all-closed', () => {
  // Keep app running in system tray
})
