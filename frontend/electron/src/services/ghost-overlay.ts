import { BrowserWindow, screen, ipcMain } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import { getCaretPosition, CaretPosition, startCaretTracking } from './caret-tracker'

export interface GhostTextState {
  suggestion: string
  x: number
  y: number
  visible: boolean
}

export class GhostTextOverlay {
  private windows: BrowserWindow[] = []
  private currentSuggestion = ''
  private isVisible = false
  private caretPosition: CaretPosition = { x: 0, y: 0, isValid: false }
  private caretTrackingCleanup: (() => void) | null = null
  private isEnabled = false
  private nextJSPort: number | null = null
  private ipcSetup = false

  constructor(port?: number) {
    this.nextJSPort = port || null
  }

  setPort(port: number): void {
    this.nextJSPort = port
  }

  create(): void {
    // Create overlay for each display (for multi-monitor support)
    const displays = screen.getAllDisplays()

    for (const display of displays) {
      const { x, y, width, height } = display.bounds

      const window = new BrowserWindow({
        x,
        y,
        width,
        height,
        transparent: true,
        backgroundColor: '#00000000',
        frame: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        focusable: false, // CRITICAL: Don't steal focus from other apps
        hasShadow: false,
        resizable: false,
        movable: false,
        show: false, // Start hidden
        webPreferences: {
          preload: join(__dirname, 'preload.js'),
          contextIsolation: true,
          nodeIntegration: false,
        },
      })

      // Make window invisible to screen recorders/sharing
      // Disabled on Linux - can cause black/invisible windows on some Wayland compositors
      if (process.platform === 'win32') {
        window.setContentProtection(true)
      }

      // Critical: Make entire window click-through
      window.setIgnoreMouseEvents(true, { forward: true })

      // Stay on top even over fullscreen apps
      window.setAlwaysOnTop(true, 'screen-saver', 1)

      // Visible on all workspaces/virtual desktops
      window.setVisibleOnAllWorkspaces(true)

      // Load the ghost overlay page
      const port = this.nextJSPort || 3000
      window.loadURL(`http://localhost:${port}/ghost-overlay`)
      console.log(`[GhostOverlay] Loading from http://localhost:${port}/ghost-overlay`)

      this.windows.push(window)
    }

    // Setup IPC handlers
    this.setupIPC()

    console.log('[GhostOverlay] Created overlay windows for', displays.length, 'displays')
  }

  private setupIPC(): void {
    if (this.ipcSetup) return
    this.ipcSetup = true

    ipcMain.handle('get-ghost-state', () => ({
      suggestion: this.currentSuggestion,
      position: this.caretPosition,
      visible: this.isVisible,
    }))
  }

  private cleanupIPC(): void {
    if (!this.ipcSetup) return
    this.ipcSetup = false
    ipcMain.removeHandler('get-ghost-state')
  }

  async showLoading(): Promise<void> {
    // Get current caret position for loading indicator
    this.caretPosition = await getCaretPosition()

    if (!this.caretPosition.isValid) {
      console.log('[GhostOverlay] No valid caret position for loading')
      return
    }

    // Show all overlay windows
    for (const window of this.windows) {
      if (!window.isDestroyed()) {
        window.showInactive()
      }
    }

    // Broadcast loading state
    this.broadcast('ghost-loading', {
      visible: true,
      x: this.caretPosition.x,
      y: this.caretPosition.y,
    })

    console.log('[GhostOverlay] Showing loading at', this.caretPosition.x, this.caretPosition.y)
  }

  hideLoading(): void {
    this.broadcast('ghost-loading', { visible: false, x: 0, y: 0 })
  }

  async showSuggestion(suggestion: string): Promise<void> {
    // Hide loading indicator
    this.hideLoading()

    if (!this.isEnabled) return

    this.currentSuggestion = suggestion

    // Get current caret position
    this.caretPosition = await getCaretPosition()

    if (!this.caretPosition.isValid) {
      console.log('[GhostOverlay] No valid caret position, not showing')
      return
    }

    this.isVisible = true

    // Show all overlay windows
    for (const window of this.windows) {
      if (!window.isDestroyed()) {
        window.showInactive() // Show without stealing focus
      }
    }

    // Broadcast to all renderer windows
    this.broadcast('ghost-update', {
      suggestion,
      x: this.caretPosition.x,
      y: this.caretPosition.y,
      visible: true,
    })

    // Start tracking caret position while suggestion is visible
    this.startPositionTracking()

    console.log('[GhostOverlay] Showing suggestion at', this.caretPosition.x, this.caretPosition.y)
  }

  private startPositionTracking(): void {
    if (this.caretTrackingCleanup) return // Already tracking

    this.caretTrackingCleanup = startCaretTracking((pos) => {
      if (this.isVisible && pos.isValid) {
        this.caretPosition = pos
        this.broadcast('ghost-position', { x: pos.x, y: pos.y })
      }
    }, 50) // Update every 50ms while visible
  }

  private stopPositionTracking(): void {
    if (this.caretTrackingCleanup) {
      this.caretTrackingCleanup()
      this.caretTrackingCleanup = null
    }
  }

  updateSuggestion(suggestion: string): void {
    if (!this.isVisible) return
    this.currentSuggestion = suggestion
    this.broadcast('ghost-update', {
      suggestion,
      x: this.caretPosition.x,
      y: this.caretPosition.y,
      visible: true,
    })
  }

  hide(): void {
    this.isVisible = false
    this.currentSuggestion = ''
    this.stopPositionTracking()

    // Hide all overlay windows
    for (const window of this.windows) {
      if (!window.isDestroyed()) {
        window.hide()
      }
    }

    this.broadcast('ghost-update', { visible: false, suggestion: '', x: 0, y: 0 })
    console.log('[GhostOverlay] Hidden')
  }

  getCurrentSuggestion(): string {
    return this.currentSuggestion
  }

  isShowing(): boolean {
    return this.isVisible
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    if (!enabled && this.isVisible) {
      this.hide()
    }
    console.log('[GhostOverlay] Enabled:', enabled)
  }

  isGhostTextEnabled(): boolean {
    return this.isEnabled
  }

  private broadcast(channel: string, data: unknown): void {
    for (const window of this.windows) {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, data)
      }
    }
  }

  setContentProtection(enabled: boolean): void {
    for (const window of this.windows) {
      if (!window.isDestroyed()) {
        window.setContentProtection(enabled)
      }
    }
  }

  destroy(): void {
    this.stopPositionTracking()
    this.cleanupIPC()
    for (const window of this.windows) {
      if (!window.isDestroyed()) {
        window.close()
      }
    }
    this.windows = []
    console.log('[GhostOverlay] Destroyed')
  }
}
