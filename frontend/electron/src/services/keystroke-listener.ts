// Linux-compatible keystroke listener using Electron's globalShortcut as fallback
// uiohook-napi requires X11 RECORD extension which may not work on Wayland
// This implementation gracefully falls back if uiohook is unavailable

export type KeystrokeCallback = (key: string, isBackspace: boolean) => void

let uIOhookModule: typeof import('uiohook-napi') | null = null

try {
  uIOhookModule = require('uiohook-napi')
} catch (error) {
  console.warn(
    '[KeystrokeListener] uiohook-napi not available, keystroke capture will be limited:',
    (error as Error).message
  )
}

export class KeystrokeListener {
  private callback: KeystrokeCallback | null = null
  private isListening = false
  private isPaused = false
  private lastKeyTime = 0

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this)
  }

  start(): void {
    if (this.isListening) return

    if (uIOhookModule) {
      try {
        uIOhookModule.uIOhook.on('keydown', this.handleKeyDown)
        uIOhookModule.uIOhook.start()
        this.isListening = true
        console.log('[KeystrokeListener] Started global keystroke capture via uiohook')
        return
      } catch (error) {
        console.warn('[KeystrokeListener] uiohook failed to start:', error)
      }
    }

    // If uiohook is unavailable, log that auto-trigger won't work
    console.log(
      '[KeystrokeListener] Global keystroke capture unavailable - manual triggers only'
    )
    this.isListening = true
  }

  stop(): void {
    if (!this.isListening) return

    if (uIOhookModule) {
      try {
        uIOhookModule.uIOhook.off('keydown', this.handleKeyDown)
        uIOhookModule.uIOhook.stop()
      } catch {
        // Already stopped or not started
      }
    }
    this.isListening = false
    console.log('[KeystrokeListener] Stopped global keystroke capture')
  }

  onKeystroke(callback: KeystrokeCallback): void {
    this.callback = callback
  }

  isRunning(): boolean {
    return this.isListening
  }

  getTimeSinceLastKey(): number {
    return Date.now() - this.lastKeyTime
  }

  pause(): void {
    this.isPaused = true
  }

  resume(): void {
    this.isPaused = false
  }

  private handleKeyDown(event: { keycode: number; shiftKey?: boolean }): void {
    if (this.isPaused) return

    this.lastKeyTime = Date.now()

    if (!uIOhookModule) return

    const { UiohookKey } = uIOhookModule

    // Check for backspace
    if (event.keycode === UiohookKey.Backspace) {
      this.callback?.('', true)
      return
    }

    // Check for enter/return
    if (event.keycode === UiohookKey.Enter) {
      this.callback?.('\n', false)
      return
    }

    // Key mappings
    const KEY_MAP: Record<number, string> = {
      [UiohookKey.Space]: ' ',
      [UiohookKey.Comma]: ',',
      [UiohookKey.Period]: '.',
      [UiohookKey.Semicolon]: ';',
      [UiohookKey.Quote]: "'",
      [UiohookKey.Slash]: '/',
      [UiohookKey.Backslash]: '\\',
      [UiohookKey.Equal]: '=',
      [UiohookKey.Minus]: '-',
      [UiohookKey.Backquote]: '`',
      [UiohookKey.BracketLeft]: '[',
      [UiohookKey.BracketRight]: ']',
      [UiohookKey['0']]: '0',
      [UiohookKey['1']]: '1',
      [UiohookKey['2']]: '2',
      [UiohookKey['3']]: '3',
      [UiohookKey['4']]: '4',
      [UiohookKey['5']]: '5',
      [UiohookKey['6']]: '6',
      [UiohookKey['7']]: '7',
      [UiohookKey['8']]: '8',
      [UiohookKey['9']]: '9',
      [UiohookKey.A]: 'a',
      [UiohookKey.B]: 'b',
      [UiohookKey.C]: 'c',
      [UiohookKey.D]: 'd',
      [UiohookKey.E]: 'e',
      [UiohookKey.F]: 'f',
      [UiohookKey.G]: 'g',
      [UiohookKey.H]: 'h',
      [UiohookKey.I]: 'i',
      [UiohookKey.J]: 'j',
      [UiohookKey.K]: 'k',
      [UiohookKey.L]: 'l',
      [UiohookKey.M]: 'm',
      [UiohookKey.N]: 'n',
      [UiohookKey.O]: 'o',
      [UiohookKey.P]: 'p',
      [UiohookKey.Q]: 'q',
      [UiohookKey.R]: 'r',
      [UiohookKey.S]: 's',
      [UiohookKey.T]: 't',
      [UiohookKey.U]: 'u',
      [UiohookKey.V]: 'v',
      [UiohookKey.W]: 'w',
      [UiohookKey.X]: 'x',
      [UiohookKey.Y]: 'y',
      [UiohookKey.Z]: 'z',
    }

    const SHIFT_KEY_MAP: Record<number, string> = {
      [UiohookKey['0']]: ')',
      [UiohookKey['1']]: '!',
      [UiohookKey['2']]: '@',
      [UiohookKey['3']]: '#',
      [UiohookKey['4']]: '$',
      [UiohookKey['5']]: '%',
      [UiohookKey['6']]: '^',
      [UiohookKey['7']]: '&',
      [UiohookKey['8']]: '*',
      [UiohookKey['9']]: '(',
      [UiohookKey.Minus]: '_',
      [UiohookKey.Equal]: '+',
      [UiohookKey.BracketLeft]: '{',
      [UiohookKey.BracketRight]: '}',
      [UiohookKey.Backslash]: '|',
      [UiohookKey.Semicolon]: ':',
      [UiohookKey.Quote]: '"',
      [UiohookKey.Comma]: '<',
      [UiohookKey.Period]: '>',
      [UiohookKey.Slash]: '?',
      [UiohookKey.Backquote]: '~',
    }

    // Check for shifted special characters first
    if (event.shiftKey) {
      const shiftChar = SHIFT_KEY_MAP[event.keycode]
      if (shiftChar) {
        this.callback?.(shiftChar, false)
        return
      }
    }

    let char = KEY_MAP[event.keycode]

    if (char) {
      if (event.shiftKey && char.length === 1 && /[a-z]/.test(char)) {
        char = char.toUpperCase()
      }

      this.callback?.(char, false)
    }
  }

  destroy(): void {
    this.stop()
    this.callback = null
  }
}
