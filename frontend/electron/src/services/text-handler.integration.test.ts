import { describe, it, expect, beforeEach, vi } from 'vitest'

// End-to-end style: simulates the full Ctrl+\ flow using the real
// captureSelectedTextWithDeps + captureLastActiveWindowWithDeps with a
// fake X11 environment. Verifies the user-reported "stale clipboard
// leakage" bug stays fixed across realistic scenarios.

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
  CaptureDeps,
  __resetCaptureStateForTests,
  __setLastActiveWindowIdForTests,
  __getLastActiveWindowIdForTests,
} from './text-handler'

// A toy X11 simulator: tracks which "app" is focused and what each app's
// "selection" currently is. The PRIMARY X11 selection follows whoever has
// a current text selection; Ctrl+C writes the focused app's selection to
// the CLIPBOARD selection. This matches real X11 semantics.
class FakeX11 {
  clipboard = ''
  focusedWindow = '0'
  windows = new Map<string, { name: string; selection: string; isGtk4: boolean }>()

  registerApp(id: string, name: string, selection = '', isGtk4 = false): void {
    this.windows.set(id, { name, selection, isGtk4 })
  }

  setSelection(id: string, selection: string): void {
    const w = this.windows.get(id)
    if (w) w.selection = selection
  }

  focus(id: string): void {
    if (this.windows.has(id)) this.focusedWindow = id
  }

  // PRIMARY selection: whoever currently has highlighted text. For our
  // simulator, this is the focused window's `selection` property.
  primarySelection(): string {
    const w = this.windows.get(this.focusedWindow)
    return w?.selection ?? ''
  }

  runXdotool(args: string[]): string {
    if (args[0] === 'getactivewindow') return this.focusedWindow
    if (args[0] === 'windowactivate') {
      const id = args[args.length - 1]
      const w = this.windows.get(id)
      // GTK4 apps clear their selection on FocusIn (the bug we're avoiding).
      if (w?.isGtk4 && this.focusedWindow !== id) {
        w.selection = ''
      }
      this.focus(id)
      return ''
    }
    if (args[0] === 'key' && args.includes('ctrl+c')) {
      const w = this.windows.get(this.focusedWindow)
      // GTK4 apps drop synthetic key events from xdotool (ibus filters
      // them out). Modeling this so the integration tests catch it.
      if (w?.isGtk4) return ''
      if (w && w.selection.length > 0) {
        this.clipboard = w.selection
      }
      return ''
    }
    return ''
  }
}

function makeDeps(x11: FakeX11, ownIds: string[] = []): CaptureDeps {
  return {
    readClipboard: () => x11.clipboard,
    writeClipboard: (t: string) => {
      x11.clipboard = t
    },
    readPrimarySelection: () => x11.primarySelection(),
    runXdotool: (args: string[]) => x11.runXdotool(args),
    getOwnWindowIds: () => new Set(ownIds),
    sleep: async () => {},
    now: (() => {
      let t = 0
      return () => (t += 50)
    })(),
  }
}

describe('text-handler integration', () => {
  beforeEach(() => {
    __resetCaptureStateForTests()
  })

  it('captures text from gedit when Ctrl+\\ is pressed with a selection', async () => {
    const x11 = new FakeX11()
    x11.registerApp('100', 'gedit hello.txt', 'Hello from hello.txt')
    x11.registerApp('200', 'tabby-main', '')
    x11.focus('100')
    const deps = makeDeps(x11, ['200'])

    // Step 1: user pressed Ctrl+\, we capture the active window.
    await captureLastActiveWindowWithDeps(deps)
    expect(__getLastActiveWindowIdForTests()).toBe('100')

    // Step 2: tabby's main window steals focus when it shows.
    x11.focus('200')

    // Step 3: capture selected text - must go back to gedit.
    const text = await captureSelectedTextWithDeps(deps)
    expect(text).toBe('Hello from hello.txt')
  })

  it("captures from GNOME Text Editor (GTK4) where Ctrl+C is silently dropped", async () => {
    // Real-world reproduction of the user's bug:
    //
    //   1. User opens hello.txt in GNOME Text Editor (GTK4).
    //   2. User selects all text. PRIMARY selection now contains it.
    //   3. User presses Ctrl+\.
    //   4. Tabby's old code: tries Ctrl+C, but GTK4's ibus filter drops
    //      the synthetic keystroke; clipboard never updates; Tabby reads
    //      back the previous "pnpm install" string.
    //
    // Tabby's new code reads PRIMARY directly and bypasses the entire
    // synthetic-key path.
    const x11 = new FakeX11()
    x11.registerApp('100', 'gnome-text-editor', 'Dear Rahul,\n\nI am writing this email...', true)
    x11.registerApp('200', 'tabby-main', '')
    x11.clipboard = 'pnpm install' // leftover from a previous AI paste
    x11.focus('100')
    const deps = makeDeps(x11, ['200'])

    await captureLastActiveWindowWithDeps(deps)
    const text = await captureSelectedTextWithDeps(deps)

    expect(text).toBe('Dear Rahul,\n\nI am writing this email...')
    expect(text).not.toBe('pnpm install')
    // Critical: in the GTK4 case the clipboard was untouched by us, AND
    // the user's selection is still alive in the editor.
    expect(x11.clipboard).toBe('pnpm install')
    expect(x11.windows.get('100')?.selection).toBe(
      'Dear Rahul,\n\nI am writing this email...'
    )
  })

  it("does NOT clear the user's selection when Ctrl+\\ is pressed (the deselection bug)", async () => {
    // Direct reproduction of the second user-reported bug:
    //   "the text deselects immediately when I hit Ctrl+\\"
    //
    // The cause was unconditional `windowactivate --sync` re-focusing an
    // already-focused GTK4 window, which clears the selection. The fix
    // (read PRIMARY first) sidesteps the focus dance entirely.
    const x11 = new FakeX11()
    x11.registerApp('100', 'gnome-text-editor', 'Important selected text', true)
    x11.focus('100')
    const deps = makeDeps(x11)

    await captureLastActiveWindowWithDeps(deps)
    const text = await captureSelectedTextWithDeps(deps)

    expect(text).toBe('Important selected text')
    // The selection in the editor must still be intact afterward.
    expect(x11.windows.get('100')?.selection).toBe('Important selected text')
  })

  it('captures text from gedit WITHOUT calling windowactivate when gedit still has focus', async () => {
    // The user-reported regression: in real Linux usage, Electron's
    // globalShortcut fires WITHOUT moving focus away from the app the user
    // was in. So gedit STILL has focus when our handler runs. Re-activating
    // an already-focused GTK window clears the selection (FocusIn → GTK4
    // selection-clear). The fix must skip windowactivate in this case.
    const x11 = new FakeX11()
    x11.registerApp('100', 'gedit hello.txt', 'Hello from hello.txt')
    x11.registerApp('200', 'tabby-main', '')
    x11.focus('100') // gedit is focused throughout
    const deps = makeDeps(x11, ['200'])

    // Track all windowactivate calls so we can assert none happen.
    const activateCalls: string[][] = []
    const wrappedDeps = {
      ...deps,
      runXdotool: (args: string[]) => {
        if (args[0] === 'windowactivate') activateCalls.push([...args])
        return deps.runXdotool(args)
      },
    }

    await captureLastActiveWindowWithDeps(wrappedDeps)
    // Note: we do NOT change focus here - gedit still owns it.
    const text = await captureSelectedTextWithDeps(wrappedDeps)

    expect(text).toBe('Hello from hello.txt')
    // Critical: no windowactivate call, because focus didn't drift.
    expect(activateCalls).toHaveLength(0)
  })

  it('does NOT leak the previous AI-paste when no selection exists in the new window', async () => {
    // The bug the user reported: previous AI output ("pnpm install") was
    // pasted somewhere, then user opened hello.txt (with no selection),
    // pressed Ctrl+\. The "Make Longer" action ran on "pnpm install".
    const x11 = new FakeX11()
    x11.clipboard = 'pnpm install' // leftover from previous AI paste
    x11.registerApp('100', 'gedit hello.txt', '') // user has nothing selected
    x11.registerApp('200', 'tabby-main', '')
    x11.focus('100')
    const deps = makeDeps(x11, ['200'])

    await captureLastActiveWindowWithDeps(deps)
    x11.focus('200')

    const text = await captureSelectedTextWithDeps(deps)

    // Critical assertion: the AI must NOT receive 'pnpm install'
    expect(text).not.toBe('pnpm install')
    expect(text).toBe('')

    // Critical assertion: the user's clipboard must be restored
    expect(x11.clipboard).toBe('pnpm install')
  })

  it('survives the focus race when Tabby steals focus before Ctrl+C', async () => {
    // This is the timing-sensitive part: in production, the global
    // shortcut fires, mainWindow.show() steals focus, then we try to
    // Ctrl+C. Without windowactivate --sync, Ctrl+C goes to Tabby itself.
    const x11 = new FakeX11()
    x11.registerApp('100', 'editor', 'real selection')
    x11.registerApp('200', 'tabby-main', '') // Tabby has nothing selected
    x11.focus('100')
    const deps = makeDeps(x11, ['200'])

    // User presses Ctrl+\, we record window 100 as the target.
    await captureLastActiveWindowWithDeps(deps)

    // Tabby's main window grabs focus while we're about to copy.
    x11.focus('200')

    // captureSelectedText should re-activate window 100 before Ctrl+C.
    const text = await captureSelectedTextWithDeps(deps)
    expect(text).toBe('real selection')
  })

  it('does not capture from Tabby itself when Tabby is the focused window', async () => {
    // User opens Tabby's own brain panel and presses Ctrl+\ while the
    // brain panel is focused. We must not capture text from Tabby's UI.
    const x11 = new FakeX11()
    x11.registerApp('100', 'editor', 'editor content')
    x11.registerApp('200', 'tabby-main', 'tabby UI text')
    x11.focus('100') // first capture is the editor
    const deps = makeDeps(x11, ['200'])

    await captureLastActiveWindowWithDeps(deps)
    expect(__getLastActiveWindowIdForTests()).toBe('100')

    // Now user clicks into Tabby's main window
    x11.focus('200')
    await captureLastActiveWindowWithDeps(deps)

    // Should NOT have updated to '200' since 200 is one of our own windows
    expect(__getLastActiveWindowIdForTests()).toBe('100')
  })

  it('handles consecutive Ctrl+\\ presses without leaking state', async () => {
    const x11 = new FakeX11()
    x11.registerApp('100', 'editor1', 'first selection')
    x11.registerApp('101', 'editor2', 'second selection')
    x11.registerApp('200', 'tabby-main', '')
    const deps = makeDeps(x11, ['200'])

    // First press
    x11.focus('100')
    await captureLastActiveWindowWithDeps(deps)
    x11.focus('200')
    const first = await captureSelectedTextWithDeps(deps)
    expect(first).toBe('first selection')

    // Second press in a different window
    x11.focus('101')
    await captureLastActiveWindowWithDeps(deps)
    x11.focus('200')
    const second = await captureSelectedTextWithDeps(deps)
    expect(second).toBe('second selection')
    expect(second).not.toBe(first)
  })

  it('returns empty when target window disappears between capture and copy', async () => {
    // Window closes mid-capture (rare but possible). Should fail gracefully.
    const x11 = new FakeX11()
    x11.registerApp('100', 'editor', 'content')
    x11.focus('100')
    const deps: CaptureDeps = {
      ...makeDeps(x11),
      runXdotool: (args: string[]) => {
        if (args[0] === 'windowactivate') {
          throw new Error('X Error: BadWindow')
        }
        return x11.runXdotool(args)
      },
    }

    await captureLastActiveWindowWithDeps(deps)
    // simulate window closing
    x11.windows.delete('100')

    // Should not crash; should return empty since Ctrl+C does nothing
    // when no window is focused.
    x11.focusedWindow = '0'
    const text = await captureSelectedTextWithDeps(deps)
    expect(text).toBe('')
  })

  it('preserves user clipboard across the full flow even on error paths', async () => {
    const userClipboard = 'IMPORTANT: do not lose this'
    const x11 = new FakeX11()
    x11.clipboard = userClipboard
    x11.registerApp('100', 'editor', '') // no selection
    x11.focus('100')
    const deps = makeDeps(x11)

    await captureLastActiveWindowWithDeps(deps)
    await captureSelectedTextWithDeps(deps)

    expect(x11.clipboard).toBe(userClipboard)
  })

  it('handles pressing Ctrl+\\ with an empty clipboard and no selection', async () => {
    // Edge case: clean state. Should produce empty string, not anything weird.
    const x11 = new FakeX11()
    x11.clipboard = ''
    x11.registerApp('100', 'editor', '')
    x11.focus('100')
    const deps = makeDeps(x11)

    await captureLastActiveWindowWithDeps(deps)
    const text = await captureSelectedTextWithDeps(deps)

    expect(text).toBe('')
  })

  it('returns selected text even if clipboard previously contained the same string', async () => {
    // Edge case: the user copied 'foo', then selected 'foo' in another app.
    // Capture should still succeed (return 'foo'), not get confused by
    // the seeming "no change". This is what we trade off when comparing
    // captured against original is removed.
    const x11 = new FakeX11()
    x11.clipboard = 'foo'
    x11.registerApp('100', 'editor', 'foo')
    x11.focus('100')
    const deps = makeDeps(x11)

    await captureLastActiveWindowWithDeps(deps)
    const text = await captureSelectedTextWithDeps(deps)

    expect(text).toBe('foo')
  })
})
