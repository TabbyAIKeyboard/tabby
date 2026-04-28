import { describe, it, expect, beforeEach, vi } from 'vitest'

// Stub electron + AppState before the SUT imports them. text-handler only
// touches `clipboard` and `AppState.{mainWindow,...}` at module load time;
// runtime calls go through the injected CaptureDeps in our tests.
vi.mock('electron', () => ({
  clipboard: {
    readText: vi.fn(() => ''),
    writeText: vi.fn(),
  },
}))

vi.mock('../app-state', () => ({
  AppState: {
    mainWindow: null,
    settingsWindow: null,
    suggestionWindow: null,
    brainPanelWindow: null,
  },
}))

import {
  captureSelectedTextWithDeps,
  captureLastActiveWindowWithDeps,
  EMPTY_SELECTION_SENTINEL,
  CaptureDeps,
  __resetCaptureStateForTests,
  __getLastActiveWindowIdForTests,
  __setLastActiveWindowIdForTests,
  __getLastCaptureHadSelectionForTests,
} from './text-handler'

interface FakeClipboard {
  contents: string
  // Simulates a target app's response to xdotool key ctrl+c. When called,
  // overwrites the clipboard with `selection` (or leaves it alone if null).
  copyHandler: ((current: string) => string | null) | null
  // PRIMARY X11 selection - what the user has highlighted right now.
  // Defaults to empty (no selection); tests set this when simulating a
  // user-highlighted region.
  primarySelection: string
}

function makeFakeDeps(overrides: Partial<CaptureDeps> = {}): {
  deps: CaptureDeps
  fake: FakeClipboard
  xdotoolCalls: string[][]
  ownIds: Set<string>
} {
  const fake: FakeClipboard = { contents: '', copyHandler: null, primarySelection: '' }
  const xdotoolCalls: string[][] = []
  const ownIds = new Set<string>()

  let virtualNow = 0

  const deps: CaptureDeps = {
    readClipboard: () => fake.contents,
    writeClipboard: (text: string) => {
      fake.contents = text
    },
    readPrimarySelection: () => fake.primarySelection,
    runXdotool: (args: string[]) => {
      xdotoolCalls.push([...args])
      if (args[0] === 'getactivewindow') return '12345\n'
      if (args[0] === 'key' && args.includes('ctrl+c')) {
        const result = fake.copyHandler?.(fake.contents)
        if (typeof result === 'string') fake.contents = result
      }
      return ''
    },
    getOwnWindowIds: () => ownIds,
    sleep: async (ms: number) => {
      virtualNow += ms
    },
    now: () => virtualNow,
    ...overrides,
  }

  return { deps, fake, xdotoolCalls, ownIds }
}

describe('captureSelectedTextWithDeps', () => {
  beforeEach(() => {
    __resetCaptureStateForTests()
  })

  // ===== PRIMARY selection path (the preferred one) =====

  it('reads from the PRIMARY X11 selection when text is highlighted', async () => {
    // The user highlighted text in gedit/GNOME Text Editor. That text is
    // automatically published to PRIMARY without any Ctrl+C. We must use
    // it directly: this avoids GTK4 selection-clear and ibus key-event
    // filtering that synthetic Ctrl+C runs into.
    const { deps, fake } = makeFakeDeps()
    fake.primarySelection = 'Hello from hello.txt'
    fake.contents = 'unrelated clipboard contents'

    const result = await captureSelectedTextWithDeps(deps)

    expect(result).toBe('Hello from hello.txt')
  })

  it('does NOT touch the clipboard when reading from PRIMARY succeeds', async () => {
    // The whole reason we prefer PRIMARY is to avoid clipboard mutation.
    // Verify we don't write to it on the happy path.
    const { deps, fake, xdotoolCalls } = makeFakeDeps()
    fake.primarySelection = 'Hello from hello.txt'
    fake.contents = 'user-was-copying-this'

    await captureSelectedTextWithDeps(deps)

    expect(fake.contents).toBe('user-was-copying-this')
    // No xdotool key invocation, no windowactivate, no clipboard write.
    expect(xdotoolCalls.find((c) => c[0] === 'key')).toBeUndefined()
    expect(xdotoolCalls.find((c) => c[0] === 'windowactivate')).toBeUndefined()
  })

  it('falls back to Ctrl+C when PRIMARY is empty', async () => {
    const { deps, fake, xdotoolCalls } = makeFakeDeps()
    fake.primarySelection = '' // nothing highlighted on PRIMARY
    fake.contents = 'orig'
    fake.copyHandler = () => 'Hello from hello.txt'

    const result = await captureSelectedTextWithDeps(deps)

    expect(result).toBe('Hello from hello.txt')
    expect(xdotoolCalls.find((c) => c[0] === 'key' && c.includes('ctrl+c'))).toBeDefined()
  })

  it('falls back to Ctrl+C when PRIMARY is whitespace-only', async () => {
    // Whitespace-only PRIMARY likely means stale selection state; try the
    // clipboard route to be safe.
    const { deps, fake, xdotoolCalls } = makeFakeDeps()
    fake.primarySelection = '   \n  '
    fake.contents = 'orig'
    fake.copyHandler = () => 'real selection from ctrl+c'

    const result = await captureSelectedTextWithDeps(deps)

    expect(result).toBe('real selection from ctrl+c')
    expect(xdotoolCalls.find((c) => c[0] === 'key' && c.includes('ctrl+c'))).toBeDefined()
  })

  it('falls back to Ctrl+C when readPrimarySelection throws', async () => {
    // Some platforms / Electron versions may throw on selection read.
    const { deps, fake, xdotoolCalls } = makeFakeDeps({
      readPrimarySelection: () => {
        throw new Error('selection unavailable')
      },
    })
    fake.contents = 'orig'
    fake.copyHandler = () => 'fallback-captured'

    const result = await captureSelectedTextWithDeps(deps)

    expect(result).toBe('fallback-captured')
    expect(xdotoolCalls.find((c) => c[0] === 'key' && c.includes('ctrl+c'))).toBeDefined()
  })

  it('returns the PRIMARY selection even when clipboard would have stale data', async () => {
    // The "pnpm install ghost" scenario - but now PRIMARY is the source
    // of truth, so we never even look at the stale clipboard.
    const { deps, fake } = makeFakeDeps()
    fake.primarySelection = 'Hello from hello.txt'
    fake.contents = 'pnpm install' // stale from previous AI paste
    fake.copyHandler = () => 'pnpm install' // even Ctrl+C would return stale

    const result = await captureSelectedTextWithDeps(deps)

    expect(result).toBe('Hello from hello.txt')
    expect(result).not.toBe('pnpm install')
  })

  // ===== Ctrl+C fallback path =====

  it('returns the selected text when Ctrl+C succeeds', async () => {
    const { deps, fake } = makeFakeDeps()
    fake.primarySelection = '' // force fallback
    fake.contents = 'previous-clipboard-content'
    fake.copyHandler = () => 'Hello from hello.txt'

    const result = await captureSelectedTextWithDeps(deps)

    expect(result).toBe('Hello from hello.txt')
  })

  it('returns empty string when Ctrl+C does nothing (sentinel survives)', async () => {
    // This is the user-reported "pnpm install ghost" scenario: previous
    // clipboard had stale text, the user pressed Ctrl+\ on a window where
    // their selection didn't actually trigger Ctrl+C, so the clipboard
    // never updates past the sentinel.
    const { deps, fake } = makeFakeDeps()
    fake.contents = 'pnpm install'
    fake.copyHandler = null // target app doesn't respond to Ctrl+C

    const result = await captureSelectedTextWithDeps(deps)

    expect(result).toBe('')
  })

  it('does not leak the previous clipboard when capture fails', async () => {
    // Even when the AI route would receive '' (no selection), critically
    // the *original* clipboard value must not leak through.
    const { deps, fake } = makeFakeDeps()
    fake.contents = 'pnpm install'
    fake.copyHandler = null

    const result = await captureSelectedTextWithDeps(deps)

    expect(result).not.toBe('pnpm install')
    expect(result).toBe('')
  })

  it('restores the original clipboard contents after capture', async () => {
    const { deps, fake } = makeFakeDeps()
    fake.contents = 'user-was-copying-this'
    fake.copyHandler = () => 'newly-selected-text'

    await captureSelectedTextWithDeps(deps)

    expect(fake.contents).toBe('user-was-copying-this')
  })

  it('restores the original clipboard contents even when capture fails', async () => {
    const { deps, fake } = makeFakeDeps()
    fake.contents = 'user-was-copying-this'
    fake.copyHandler = null

    await captureSelectedTextWithDeps(deps)

    expect(fake.contents).toBe('user-was-copying-this')
  })

  it('returns empty string when the captured text equals the sentinel exactly', async () => {
    const { deps, fake } = makeFakeDeps()
    fake.contents = 'orig'
    // Some pathological app could echo our sentinel back. We still treat
    // it as no selection.
    fake.copyHandler = () => EMPTY_SELECTION_SENTINEL

    const result = await captureSelectedTextWithDeps(deps)

    expect(result).toBe('')
  })

  it('returns empty string when X11 strips the clipboard to empty', async () => {
    // X11 sometimes returns '' immediately after writeText before the
    // target app responds. The poll loop waits, but if nothing ever
    // changes, we eventually see '' and bail out.
    const { deps, fake } = makeFakeDeps()
    fake.contents = ''
    fake.copyHandler = () => ''

    const result = await captureSelectedTextWithDeps(deps)

    expect(result).toBe('')
  })

  it('activates the target window before Ctrl+C when focus has drifted', async () => {
    // The default fake reports active window '12345', and we set the
    // recorded target to '99999' - they differ, so windowactivate must run.
    const { deps, fake, xdotoolCalls } = makeFakeDeps()
    __setLastActiveWindowIdForTests('99999')
    fake.contents = 'orig'
    fake.copyHandler = () => 'captured'

    await captureSelectedTextWithDeps(deps)

    // The activate call must come BEFORE the ctrl+c call to avoid the race
    // where Tabby's main window receives the copy.
    const activateIdx = xdotoolCalls.findIndex((c) => c[0] === 'windowactivate')
    const ctrlCIdx = xdotoolCalls.findIndex((c) => c[0] === 'key' && c.includes('ctrl+c'))

    expect(activateIdx).toBeGreaterThanOrEqual(0)
    expect(ctrlCIdx).toBeGreaterThanOrEqual(0)
    expect(activateIdx).toBeLessThan(ctrlCIdx)
  })

  it('does NOT call windowactivate when focus is already on the target', async () => {
    // The user pressed Ctrl+\ from gedit. gedit still has focus when our
    // handler runs. Re-activating it would fire FocusIn which GTK4 handles
    // by clearing the primary selection - the bug the user reported.
    const x11ActiveId = '12345' // matches what the default fake returns
    const { deps, fake, xdotoolCalls } = makeFakeDeps()
    __setLastActiveWindowIdForTests(x11ActiveId)
    fake.contents = 'orig'
    fake.copyHandler = () => 'Hello from hello.txt'

    const result = await captureSelectedTextWithDeps(deps)

    expect(xdotoolCalls.find((c) => c[0] === 'windowactivate')).toBeUndefined()
    expect(result).toBe('Hello from hello.txt')
  })

  it('does not pass --sync to windowactivate (causes selection clear in GTK4)', async () => {
    // --sync forces the X server to round-trip, which in some GTK apps
    // triggers a selection-clear side effect. We use a small sleep
    // afterward instead.
    const { deps, fake, xdotoolCalls } = makeFakeDeps()
    __setLastActiveWindowIdForTests('99999')
    fake.contents = 'orig'
    fake.copyHandler = () => 'captured'

    await captureSelectedTextWithDeps(deps)

    const activateCall = xdotoolCalls.find((c) => c[0] === 'windowactivate')
    expect(activateCall).toBeDefined()
    expect(activateCall).not.toContain('--sync')
  })

  it('does not call windowactivate when no target window has been captured', async () => {
    const { deps, fake, xdotoolCalls } = makeFakeDeps()
    __setLastActiveWindowIdForTests(null)
    fake.contents = 'orig'
    fake.copyHandler = () => 'captured'

    await captureSelectedTextWithDeps(deps)

    expect(xdotoolCalls.find((c) => c[0] === 'windowactivate')).toBeUndefined()
  })

  it('returns empty string when xdotool throws on Ctrl+C', async () => {
    const fake: FakeClipboard = {
      contents: 'pnpm install',
      copyHandler: null,
      primarySelection: '', // empty - forces fallback to Ctrl+C path
    }
    const deps: CaptureDeps = {
      readClipboard: () => fake.contents,
      writeClipboard: (t: string) => {
        fake.contents = t
      },
      readPrimarySelection: () => fake.primarySelection,
      runXdotool: (args: string[]) => {
        if (args[0] === 'key' && args.includes('ctrl+c')) {
          throw new Error('xdotool: not found')
        }
        return ''
      },
      getOwnWindowIds: () => new Set(),
      sleep: async () => {},
      now: () => 0,
    }

    const result = await captureSelectedTextWithDeps(deps)

    expect(result).toBe('')
    expect(fake.contents).toBe('pnpm install') // restored after failure
  })

  it('handles multibyte selections', async () => {
    const { deps, fake } = makeFakeDeps()
    fake.contents = 'orig'
    fake.copyHandler = () => 'こんにちは — café — 🚀'

    const result = await captureSelectedTextWithDeps(deps)

    expect(result).toBe('こんにちは — café — 🚀')
  })

  it('handles very large selections', async () => {
    const { deps, fake } = makeFakeDeps()
    const big = 'x'.repeat(100_000)
    fake.contents = 'orig'
    fake.copyHandler = () => big

    const result = await captureSelectedTextWithDeps(deps)

    expect(result).toBe(big)
  })

  it('does not return the sentinel even if the polled value matches it', async () => {
    // Defense in depth - the sentinel itself should never propagate to
    // the AI as if it were user-selected text.
    const { deps, fake } = makeFakeDeps()
    fake.contents = 'orig'
    fake.copyHandler = () => EMPTY_SELECTION_SENTINEL

    const result = await captureSelectedTextWithDeps(deps)

    expect(result).not.toBe(EMPTY_SELECTION_SENTINEL)
  })

  it('does not include null bytes in the sentinel (X11 strips them)', () => {
    // Regression test: the first iteration of this fix used a sentinel
    // that contained \0, which X11 silently truncates. The build pipeline
    // also rendered this as literal "\0" bytes in the JS output.
    expect(EMPTY_SELECTION_SENTINEL).not.toContain('\0')
    expect(EMPTY_SELECTION_SENTINEL.length).toBeGreaterThan(0)
    // Must be ASCII printable to survive any reasonable clipboard impl.
    for (const ch of EMPTY_SELECTION_SENTINEL) {
      const code = ch.charCodeAt(0)
      expect(code).toBeGreaterThanOrEqual(0x20)
      expect(code).toBeLessThan(0x7f)
    }
  })

  // ===== lastCaptureHadSelection flag =====

  it('sets the had-selection flag when PRIMARY returns text', async () => {
    // The paste path uses this flag to decide whether to send Delete
    // before Ctrl+V (so paste replaces the user's selection instead of
    // pushing it down). The capture path is the source of truth.
    const { deps, fake } = makeFakeDeps()
    fake.primarySelection = 'highlighted'

    await captureSelectedTextWithDeps(deps)

    expect(__getLastCaptureHadSelectionForTests()).toBe(true)
  })

  it('sets the had-selection flag when fallback Ctrl+C captures text', async () => {
    const { deps, fake } = makeFakeDeps()
    fake.primarySelection = '' // force fallback
    fake.contents = 'orig'
    fake.copyHandler = () => 'captured via clipboard'

    await captureSelectedTextWithDeps(deps)

    expect(__getLastCaptureHadSelectionForTests()).toBe(true)
  })

  it('clears the had-selection flag when nothing is captured', async () => {
    // Important so a previous capture's selection state doesn't bleed
    // into a later paste operation that came from a different capture.
    const { deps, fake } = makeFakeDeps()
    fake.primarySelection = ''
    fake.contents = 'orig'
    fake.copyHandler = null // Ctrl+C is a no-op

    await captureSelectedTextWithDeps(deps)

    expect(__getLastCaptureHadSelectionForTests()).toBe(false)
  })

  it('overwrites a previous true flag when a new capture finds nothing', async () => {
    const { deps, fake } = makeFakeDeps()

    // First capture: selection present
    fake.primarySelection = 'first'
    await captureSelectedTextWithDeps(deps)
    expect(__getLastCaptureHadSelectionForTests()).toBe(true)

    // Second capture: nothing present
    fake.primarySelection = ''
    fake.copyHandler = null
    await captureSelectedTextWithDeps(deps)
    expect(__getLastCaptureHadSelectionForTests()).toBe(false)
  })
})

describe('captureLastActiveWindowWithDeps', () => {
  beforeEach(() => {
    __resetCaptureStateForTests()
  })

  it('records the active window ID reported by xdotool', async () => {
    const { deps } = makeFakeDeps({
      runXdotool: (args: string[]) => {
        if (args[0] === 'getactivewindow') return '67108864\n'
        return ''
      },
    })

    await captureLastActiveWindowWithDeps(deps)

    expect(__getLastActiveWindowIdForTests()).toBe('67108864')
  })

  it('preserves the previous target when the active window is one of our own', async () => {
    // Tabby's main window is currently focused (e.g., user just toggled
    // the menu open). We must not capture our own window as the "target"
    // for paste-back.
    __setLastActiveWindowIdForTests('77777') // previously captured an editor
    const { deps } = makeFakeDeps({
      runXdotool: (args: string[]) => {
        if (args[0] === 'getactivewindow') return '88888\n'
        return ''
      },
      getOwnWindowIds: () => new Set(['88888']),
    })

    await captureLastActiveWindowWithDeps(deps)

    expect(__getLastActiveWindowIdForTests()).toBe('77777')
  })

  it('does not overwrite previous target when xdotool returns empty', async () => {
    __setLastActiveWindowIdForTests('77777')
    const { deps } = makeFakeDeps({
      runXdotool: () => '\n',
    })

    await captureLastActiveWindowWithDeps(deps)

    expect(__getLastActiveWindowIdForTests()).toBe('77777')
  })

  it('does not crash or change state when xdotool throws', async () => {
    __setLastActiveWindowIdForTests('77777')
    const { deps } = makeFakeDeps({
      runXdotool: () => {
        throw new Error('xdotool: not installed')
      },
    })

    await expect(captureLastActiveWindowWithDeps(deps)).resolves.toBeUndefined()
    expect(__getLastActiveWindowIdForTests()).toBe('77777')
  })

  it('updates the target when the focused window is foreign (not ours)', async () => {
    __setLastActiveWindowIdForTests('77777')
    const { deps } = makeFakeDeps({
      runXdotool: (args: string[]) => {
        if (args[0] === 'getactivewindow') return '99999\n'
        return ''
      },
      getOwnWindowIds: () => new Set(['11111', '22222']), // none match
    })

    await captureLastActiveWindowWithDeps(deps)

    expect(__getLastActiveWindowIdForTests()).toBe('99999')
  })
})
