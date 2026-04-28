import { clipboard } from 'electron'
import { execFileSync } from 'child_process'
import { AppState } from '../app-state'

let lastActiveWindowId: string | null = null
let isTypingCancelled = false
// Tracks whether the most recent capture saw an actual selection. Set when
// capture returns non-empty text, cleared after a paste consumes it. Used
// by the paste path to decide whether to emit a Delete keystroke first
// (which removes the active selection so Ctrl+V replaces it instead of
// inserting at the cursor).
let lastCaptureHadSelection = false

// Sentinel placed on the clipboard before simulating Ctrl+C. If it survives,
// the target app didn't copy anything (no selection, or focus was wrong).
// Must be ASCII printable - on X11, null bytes get stripped from the
// clipboard, breaking the sentinel comparison.
export const EMPTY_SELECTION_SENTINEL = '<<TABBY_NO_SELECTION_SENTINEL>>'

export function cancelTyping(): void {
  isTypingCancelled = true
  console.log('Typing cancelled by user')
}

// Test seam: lets unit tests reset the module-level state between cases.
export function __resetCaptureStateForTests(): void {
  lastActiveWindowId = null
  isTypingCancelled = false
  lastCaptureHadSelection = false
}

export function __getLastActiveWindowIdForTests(): string | null {
  return lastActiveWindowId
}

export function __setLastActiveWindowIdForTests(id: string | null): void {
  lastActiveWindowId = id
}

export function __getLastCaptureHadSelectionForTests(): boolean {
  return lastCaptureHadSelection
}

// Dependencies that the capture pipeline needs. Pulled out so tests can
// substitute fakes without spinning up Electron + xdotool.
export interface CaptureDeps {
  readClipboard: () => string
  writeClipboard: (text: string) => void
  // PRIMARY X11 selection - what the user has highlighted right now,
  // independent of the clipboard. This is the cleanest way to read a
  // selection on Linux: no synthetic key input needed, no GTK4 input
  // method to fight with, no clipboard mutation.
  readPrimarySelection: () => string
  runXdotool: (args: string[]) => string
  getOwnWindowIds: () => Set<string>
  sleep: (ms: number) => Promise<void>
  now: () => number
}

const realDeps: CaptureDeps = {
  readClipboard: () => clipboard.readText(),
  writeClipboard: (text: string) => clipboard.writeText(text),
  readPrimarySelection: () => clipboard.readText('selection'),
  runXdotool: (args: string[]) => execFileSync('xdotool', args, { encoding: 'utf-8' }),
  getOwnWindowIds: () => {
    const ids = new Set<string>()
    const windows = [
      AppState.mainWindow,
      AppState.settingsWindow,
      AppState.suggestionWindow,
      AppState.brainPanelWindow,
    ]
    for (const w of windows) {
      if (!w || w.isDestroyed()) continue
      try {
        // BrowserWindow.getNativeWindowHandle() returns a Buffer with the X11
        // window ID. xdotool reports the same value as a decimal string.
        const handle = w.getNativeWindowHandle()
        if (handle && handle.length >= 4) {
          ids.add(handle.readUInt32LE(0).toString())
        }
      } catch {
        // ignore
      }
    }
    return ids
  },
  sleep: (ms: number) => new Promise((r) => setTimeout(r, ms)),
  now: () => Date.now(),
}

export async function captureLastActiveWindowWithDeps(deps: CaptureDeps): Promise<void> {
  try {
    const windowId = deps.runXdotool(['getactivewindow']).trim()

    if (!windowId) {
      console.warn('xdotool returned empty active window id')
      return
    }

    const ownIds = deps.getOwnWindowIds()
    if (ownIds.has(windowId)) {
      console.log(
        'Active window is a Tabby window, preserving previous lastActiveWindowId:',
        lastActiveWindowId
      )
      return
    }

    lastActiveWindowId = windowId
    console.log('Captured window ID:', lastActiveWindowId)
  } catch (error) {
    console.error('Failed to capture active window:', error)
  }
}

export async function captureLastActiveWindow(): Promise<void> {
  return captureLastActiveWindowWithDeps(realDeps)
}

async function pollClipboardChange(
  deps: CaptureDeps,
  sentinel: string,
  timeoutMs: number,
  intervalMs = 25
): Promise<string> {
  const deadline = deps.now() + timeoutMs
  while (deps.now() < deadline) {
    const current = deps.readClipboard()
    if (current !== sentinel) return current
    await deps.sleep(intervalMs)
  }
  return deps.readClipboard()
}

export async function captureSelectedTextWithDeps(deps: CaptureDeps): Promise<string> {
  // === Primary path: read the X11 PRIMARY selection ===
  //
  // On Linux, every time you highlight text in any X11 app, that text is
  // automatically published to the PRIMARY selection. We don't need to
  // simulate Ctrl+C, don't need to mess with focus, and don't need to
  // touch the clipboard. This avoids three different bug sources:
  //
  //   1. GTK4 apps (GNOME Text Editor, gedit 46+) silently drop synthetic
  //      keystrokes from xdotool because of ibus input-method filtering.
  //      Ctrl+C never reaches the app, so the clipboard never updates.
  //
  //   2. Calling `windowactivate` on an already-focused window sends
  //      FocusIn, which GTK4 sometimes handles by clearing the primary
  //      selection — visible to the user as "my selection just vanished
  //      when I pressed Ctrl+\".
  //
  //   3. Clipboard ping-pong (write sentinel, send Ctrl+C, read back,
  //      restore original) races with the user's clipboard watcher and
  //      with X11's async selection ownership transfers.
  //
  // PRIMARY just reads what's selected right now. No side effects.
  try {
    const primary = deps.readPrimarySelection()
    if (primary && primary.trim().length > 0) {
      console.log(
        'captureSelectedText: read from PRIMARY selection (len=' + primary.length + ')'
      )
      lastCaptureHadSelection = true
      return primary
    }
  } catch (error) {
    console.warn('Failed to read PRIMARY selection, falling back to clipboard:', error)
  }

  // === Fallback path: synthetic Ctrl+C ===
  //
  // PRIMARY may be empty in two cases: the user has nothing highlighted,
  // or the app doesn't publish to PRIMARY (rare, mostly old Java apps).
  // Try the clipboard route as a last resort.
  const original = deps.readClipboard()

  // Only re-activate the target window if focus has actually drifted away
  // from it. Re-activating an already-focused window can trigger GTK
  // selection-clear, which is exactly the bug we're avoiding above.
  if (lastActiveWindowId) {
    let currentlyFocused: string | null = null
    try {
      currentlyFocused = deps.runXdotool(['getactivewindow']).trim() || null
    } catch {
      // ignore
    }

    if (currentlyFocused !== lastActiveWindowId) {
      try {
        deps.runXdotool(['windowactivate', lastActiveWindowId])
        await deps.sleep(30)
      } catch (error) {
        console.warn('Failed to re-activate target window before copy:', error)
      }
    }
  }

  deps.writeClipboard(EMPTY_SELECTION_SENTINEL)

  try {
    deps.runXdotool(['key', '--clearmodifiers', 'ctrl+c'])
  } catch (error) {
    console.error('Failed to simulate Ctrl+C:', error)
    deps.writeClipboard(original)
    return ''
  }

  const captured = await pollClipboardChange(deps, EMPTY_SELECTION_SENTINEL, 400)

  deps.writeClipboard(original)

  if (captured === EMPTY_SELECTION_SENTINEL || captured === '') {
    console.log('captureSelectedText: no selection detected (PRIMARY empty, clipboard fallback failed)')
    lastCaptureHadSelection = false
    return ''
  }

  lastCaptureHadSelection = true
  return captured
}

export async function captureSelectedText(): Promise<string> {
  return captureSelectedTextWithDeps(realDeps)
}

async function restoreFocusToLastWindow(): Promise<boolean> {
  if (!lastActiveWindowId) return false

  // Skip windowactivate if focus has already returned to the target (which
  // happens automatically when Tabby's main window hides on GNOME Shell).
  // Re-activating an already-focused GTK4 window fires a FocusIn that the
  // app handles by clearing the active selection - exactly what we DON'T
  // want when we're about to paste-replace that selection.
  try {
    const currentlyFocused = execFileSync('xdotool', ['getactivewindow'], {
      encoding: 'utf-8',
    }).trim()
    if (currentlyFocused === lastActiveWindowId) {
      return true
    }
  } catch {
    // ignore - we'll try to activate below
  }

  try {
    execFileSync('xdotool', ['windowactivate', lastActiveWindowId], {
      encoding: 'utf-8',
    })
    await new Promise((r) => setTimeout(r, 100))
    return true
  } catch (error) {
    console.error('Failed to restore focus:', error)
  }
  return false
}

export async function pasteToLastWindow(text: string): Promise<void> {
  const originalClipboard = clipboard.readText()
  const hadSelection = lastCaptureHadSelection

  try {
    await restoreFocusToLastWindow()

    // If the user had a selection during capture, delete it before
    // pasting. Otherwise Ctrl+V inserts at the cursor and pushes the old
    // text down instead of replacing it. This matters most for GTK4 apps
    // (gnome-text-editor, gedit 46+) where the selection's "active" state
    // can become decoupled from focus, so Ctrl+V doesn't reliably replace
    // even with the selection still highlighted.
    //
    // Sending Delete is safe here precisely because we know there was a
    // selection: in any modern text widget, Delete-with-selection removes
    // the selected range. The downside (Delete eats one char if the
    // selection has somehow been lost) is acceptable; without this, the
    // user gets a much worse outcome (their original text preserved AND
    // the AI output appended).
    if (hadSelection) {
      execFileSync('xdotool', ['key', '--clearmodifiers', 'Delete'], { encoding: 'utf-8' })
      await new Promise((r) => setTimeout(r, 30))
    }

    // Write text to clipboard
    clipboard.writeText(text)
    await new Promise((r) => setTimeout(r, 50))

    // Paste
    execFileSync('xdotool', ['key', '--clearmodifiers', 'ctrl+v'], { encoding: 'utf-8' })

    await new Promise((r) => setTimeout(r, 100))

    // Consume the captured selection: a single capture should drive a
    // single paste-replace. Subsequent operations need a fresh capture.
    lastCaptureHadSelection = false

    console.log('Pasted to previous window')
  } finally {
    clipboard.writeText(originalClipboard)
  }
}

// QWERTY keyboard proximity map for realistic typos
const QWERTY_NEIGHBORS: { [key: string]: string } = {
  a: 'qwsz',
  b: 'vghn',
  c: 'xdfv',
  d: 'erfcxs',
  e: 'wrsdf',
  f: 'rtgvcd',
  g: 'tyhbvf',
  h: 'yujnbg',
  i: 'uojkl',
  j: 'uikmnh',
  k: 'iolmj',
  l: 'opk',
  m: 'njk',
  n: 'bhjm',
  o: 'iplk',
  p: 'ol',
  q: 'wa',
  r: 'etdf',
  s: 'weadzx',
  t: 'ryfg',
  u: 'yihj',
  v: 'cfgb',
  w: 'qeas',
  x: 'zsdc',
  y: 'tugh',
  z: 'asx',
  '1': '2q',
  '2': '13qw',
  '3': '24we',
  '4': '35er',
  '5': '46rt',
  '6': '57ty',
  '7': '68yu',
  '8': '79ui',
  '9': '80io',
  '0': '9p',
}

// Human typing configuration
interface HumanTypingConfig {
  errorRate: number
  minDelay: number
  maxDelay: number
  punctuationPauseMin: number
  punctuationPauseMax: number
  spacePauseMin: number
  spacePauseMax: number
  correctionPauseMin: number
  correctionPauseMax: number
  postCorrectionPauseMin: number
  postCorrectionPauseMax: number
}

const DEFAULT_HUMAN_CONFIG: HumanTypingConfig = {
  errorRate: 0.03,
  minDelay: 20,
  maxDelay: 100,
  punctuationPauseMin: 150,
  punctuationPauseMax: 400,
  spacePauseMin: 30,
  spacePauseMax: 100,
  correctionPauseMin: 100,
  correctionPauseMax: 400,
  postCorrectionPauseMin: 50,
  postCorrectionPauseMax: 200,
}

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getRandomNeighborChar(char: string): string {
  const lowerChar = char.toLowerCase()
  const neighbors = QWERTY_NEIGHBORS[lowerChar]
  if (!neighbors) return char

  const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)]
  return char === char.toUpperCase() ? randomNeighbor.toUpperCase() : randomNeighbor
}

function shouldMakeTypo(char: string, errorRate: number): boolean {
  return /[a-zA-Z0-9]/.test(char) && Math.random() < errorRate
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function xdotoolType(char: string): void {
  try {
    if (char === '\n') {
      execFileSync('xdotool', ['key', 'Return'], { encoding: 'utf-8' })
    } else if (char === '\t') {
      execFileSync('xdotool', ['key', 'Tab'], { encoding: 'utf-8' })
    } else if (char === ' ') {
      execFileSync('xdotool', ['key', 'space'], { encoding: 'utf-8' })
    } else {
      execFileSync('xdotool', ['type', '--clearmodifiers', '--', char], { encoding: 'utf-8' })
    }
  } catch {
    console.error('[xdotool] Failed to type character:', char)
  }
}

function xdotoolKey(key: string): void {
  try {
    execFileSync('xdotool', ['key', key], { encoding: 'utf-8' })
  } catch (error) {
    console.error('[xdotool] Failed to press key:', key, error)
  }
}

// Simple typewriter for basic editors (no auto-indent reset)
export async function typeSimpleToLastWindow(
  text: string,
  config: Partial<HumanTypingConfig> = {}
): Promise<void> {
  isTypingCancelled = false
  const hadSelection = lastCaptureHadSelection
  await restoreFocusToLastWindow()

  // Same selection-replace logic as pasteToLastWindow: when the user had
  // a selection during capture, delete it first so the typewriter output
  // replaces it instead of being appended after.
  if (hadSelection) {
    execFileSync('xdotool', ['key', '--clearmodifiers', 'Delete'], { encoding: 'utf-8' })
    await sleep(30)
  }
  lastCaptureHadSelection = false

  const cfg: HumanTypingConfig = { ...DEFAULT_HUMAN_CONFIG, ...config }

  for (const char of text) {
    if (char === '\n') {
      xdotoolKey('Return')
      await sleep(randomInRange(50, 150))
      continue
    }

    if (char === '\r') {
      continue
    }

    if (shouldMakeTypo(char, cfg.errorRate)) {
      const typoChar = getRandomNeighborChar(char)
      xdotoolType(typoChar)
      await sleep(randomInRange(cfg.correctionPauseMin, cfg.correctionPauseMax))
      xdotoolKey('BackSpace')
      await sleep(randomInRange(cfg.postCorrectionPauseMin, cfg.postCorrectionPauseMax))
    }

    xdotoolType(char)

    let delay = randomInRange(cfg.minDelay, cfg.maxDelay)

    if (/[.,!?;:]/.test(char)) {
      delay += randomInRange(cfg.punctuationPauseMin, cfg.punctuationPauseMax)
    }

    if (char === ' ') {
      delay += randomInRange(cfg.spacePauseMin, cfg.spacePauseMax)
    }

    await sleep(delay)

    if (isTypingCancelled) return
  }

  console.log('Typed to previous window (simple typewriter)')
}

// LeetCode typewriter with auto-indent reset for code editors
export async function typeLeetCodeToLastWindow(
  text: string,
  config: Partial<HumanTypingConfig> = {}
): Promise<void> {
  isTypingCancelled = false
  const hadSelection = lastCaptureHadSelection
  await restoreFocusToLastWindow()

  if (hadSelection) {
    execFileSync('xdotool', ['key', '--clearmodifiers', 'Delete'], { encoding: 'utf-8' })
    await sleep(30)
  }
  lastCaptureHadSelection = false

  const cfg: HumanTypingConfig = { ...DEFAULT_HUMAN_CONFIG, ...config }

  const lines = text.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, '')

    if (i > 0) {
      xdotoolKey('Return')
      await sleep(randomInRange(50, 150))

      xdotoolKey('Home')
      await sleep(randomInRange(20, 50))

      xdotoolKey('shift+End')
      await sleep(randomInRange(20, 50))

      xdotoolKey('BackSpace')
      await sleep(randomInRange(20, 50))
    }

    for (const char of line) {
      if (shouldMakeTypo(char, cfg.errorRate)) {
        const typoChar = getRandomNeighborChar(char)
        xdotoolType(typoChar)
        await sleep(randomInRange(cfg.correctionPauseMin, cfg.correctionPauseMax))
        xdotoolKey('BackSpace')
        await sleep(randomInRange(cfg.postCorrectionPauseMin, cfg.postCorrectionPauseMax))
      }

      xdotoolType(char)

      let delay = randomInRange(cfg.minDelay, cfg.maxDelay)

      if (/[.,!?;:]/.test(char)) {
        delay += randomInRange(cfg.punctuationPauseMin, cfg.punctuationPauseMax)
      }

      if (char === ' ') {
        delay += randomInRange(cfg.spacePauseMin, cfg.spacePauseMax)
      }

      await sleep(delay)

      if (isTypingCancelled) return
    }
    if (isTypingCancelled) return
  }

  console.log('Typed to previous window (LeetCode mode with proper indentation)')
}

export type TextOutputMode = 'paste' | 'typewriter' | 'typewriter-leetcode'

export async function sendTextToLastWindow(
  text: string,
  mode: TextOutputMode = 'paste'
): Promise<void> {
  if (mode === 'typewriter') {
    await typeSimpleToLastWindow(text)
  } else if (mode === 'typewriter-leetcode') {
    await typeLeetCodeToLastWindow(text)
  } else {
    await pasteToLastWindow(text)
  }
}
