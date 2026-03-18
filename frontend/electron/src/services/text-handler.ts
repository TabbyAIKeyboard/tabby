import { clipboard } from 'electron'
import { execFileSync } from 'child_process'

let lastActiveWindowId: string | null = null
let isTypingCancelled = false

export function cancelTyping(): void {
  isTypingCancelled = true
  console.log('Typing cancelled by user')
}

export async function captureLastActiveWindow(): Promise<void> {
  try {
    // Use xdotool to get the active window ID on Linux
    const windowId = execFileSync('xdotool', ['getactivewindow'], {
      encoding: 'utf-8',
    }).trim()
    lastActiveWindowId = windowId || null
    console.log('Captured window ID:', lastActiveWindowId)
  } catch (error) {
    console.error('Failed to capture active window:', error)
    lastActiveWindowId = null
  }
}

export async function captureSelectedText(): Promise<string> {
  const original = clipboard.readText()

  try {
    // Use xdotool to simulate Ctrl+C on Linux
    execFileSync('xdotool', ['key', '--clearmodifiers', 'ctrl+c'], { encoding: 'utf-8' })
  } catch (error) {
    console.error('Failed to simulate Ctrl+C:', error)
  }

  await new Promise((r) => setTimeout(r, 150))

  const selected = clipboard.readText()
  clipboard.writeText(original)

  return selected
}

async function restoreFocusToLastWindow(): Promise<boolean> {
  if (lastActiveWindowId) {
    try {
      execFileSync('xdotool', ['windowactivate', lastActiveWindowId], {
        encoding: 'utf-8',
      })
      await new Promise((r) => setTimeout(r, 100))
      return true
    } catch (error) {
      console.error('Failed to restore focus:', error)
    }
  }
  return false
}

export async function pasteToLastWindow(text: string): Promise<void> {
  const originalClipboard = clipboard.readText()

  try {
    await restoreFocusToLastWindow()

    // Write text to clipboard
    clipboard.writeText(text)
    await new Promise((r) => setTimeout(r, 50))

    // Paste using xdotool
    execFileSync('xdotool', ['key', '--clearmodifiers', 'ctrl+v'], { encoding: 'utf-8' })

    await new Promise((r) => setTimeout(r, 100))

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
  await restoreFocusToLastWindow()

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
  await restoreFocusToLastWindow()

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
