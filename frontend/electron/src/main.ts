import { app, BrowserWindow } from 'electron'
import { AppState } from './app-state'
import { createMainWindow, createSettingsWindow } from './windows'
import { createTray, destroyTray } from './tray'
import { initializeContextCapture } from './services'
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from './shortcuts'
import { registerAllIpcHandlers } from './ipc'

console.log('[Main] Loaded User ID:', AppState.currentUserId)
console.log('[Main] Onboarding Complete:', AppState.onboardingComplete)

app.whenReady().then(() => {
  createMainWindow()
  createTray()
  initializeContextCapture()
  registerGlobalShortcuts()
  registerAllIpcHandlers()

  // If onboarding is not complete, show settings window at signin
  if (!AppState.onboardingComplete) {
    console.log('[Main] First launch - opening settings at signin')
    const settingsWin = createSettingsWindow('/signin')
    settingsWin.show()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('will-quit', () => {
  unregisterGlobalShortcuts()
  destroyTray()
})

app.on('window-all-closed', () => {
  if (process.platform === 'linux') {
    app.quit()
  }
})
