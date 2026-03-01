import { keyboard, Key } from "@nut-tree-fork/nut-js";
import { clipboard } from "electron";
import { windowManager } from "node-window-manager";

keyboard.config.autoDelayMs = 5;

let lastActiveWindowId: number | null = null;
let isTypingCancelled = false;

export function cancelTyping(): void {
  isTypingCancelled = true;
  console.log("Typing cancelled by user");
}

export async function captureLastActiveWindow(): Promise<void> {
  try {
    const activeWindow = windowManager.getActiveWindow();
    lastActiveWindowId = activeWindow?.id ?? null;
    console.log("Captured window ID:", lastActiveWindowId);
  } catch (error) {
    console.error("Failed to capture active window:", error);
  }
}

export async function captureSelectedText(): Promise<string> {
  const original = clipboard.readText();

  // Release modifiers that might interfere (especially for Ctrl+Alt+G)
  await keyboard.releaseKey(Key.LeftAlt);
  await keyboard.releaseKey(Key.RightAlt);
  await keyboard.releaseKey(Key.LeftShift);
  await keyboard.releaseKey(Key.RightShift);
  await keyboard.releaseKey(Key.LeftControl);
  await keyboard.releaseKey(Key.RightControl);

  await keyboard.pressKey(Key.LeftControl);
  await keyboard.pressKey(Key.C);
  await keyboard.releaseKey(Key.C);
  await keyboard.releaseKey(Key.LeftControl);

  await new Promise((r) => setTimeout(r, 150));

  const selected = clipboard.readText();
  clipboard.writeText(original);

  return selected;
}

async function restoreFocusToLastWindow(): Promise<boolean> {
  if (lastActiveWindowId) {
    const targetWindow = windowManager
      .getWindows()
      .find((w) => w.id === lastActiveWindowId);

    if (targetWindow) {
      targetWindow.bringToTop();
      await new Promise((r) => setTimeout(r, 100));
      return true;
    }
  }
  return false;
}

export async function pasteToLastWindow(text: string): Promise<void> {
  const originalClipboard = clipboard.readText();

  try {
    await restoreFocusToLastWindow();

    // Write text to clipboard
    clipboard.writeText(text);
    await new Promise((r) => setTimeout(r, 50));

    // Paste
    await keyboard.pressKey(Key.LeftControl);
    await keyboard.pressKey(Key.V);
    await new Promise((r) => setTimeout(r, 30));
    await keyboard.releaseKey(Key.V);
    await keyboard.releaseKey(Key.LeftControl);

    await new Promise((r) => setTimeout(r, 100));

    console.log("Pasted to previous window");
  } finally {
    clipboard.writeText(originalClipboard);
  }
}

// QWERTY keyboard proximity map for realistic typos
const QWERTY_NEIGHBORS: { [key: string]: string } = {
  'a': 'qwsz', 'b': 'vghn', 'c': 'xdfv', 'd': 'erfcxs', 'e': 'wrsdf',
  'f': 'rtgvcd', 'g': 'tyhbvf', 'h': 'yujnbg', 'i': 'uojkl', 'j': 'uikmnh',
  'k': 'iolmj', 'l': 'opk', 'm': 'njk', 'n': 'bhjm', 'o': 'iplk',
  'p': 'ol', 'q': 'wa', 'r': 'etdf', 's': 'weadzx', 't': 'ryfg',
  'u': 'yihj', 'v': 'cfgb', 'w': 'qeas', 'x': 'zsdc', 'y': 'tugh',
  'z': 'asx', '1': '2q', '2': '13qw', '3': '24we', '4': '35er',
  '5': '46rt', '6': '57ty', '7': '68yu', '8': '79ui', '9': '80io', '0': '9p'
};

// Human typing configuration
interface HumanTypingConfig {
  errorRate: number;           // Probability of making a typo (0.0 - 1.0)
  minDelay: number;            // Minimum delay between keystrokes (ms)
  maxDelay: number;            // Maximum delay between keystrokes (ms)
  punctuationPauseMin: number; // Additional pause after punctuation (ms)
  punctuationPauseMax: number;
  spacePauseMin: number;       // Additional pause after space (ms)
  spacePauseMax: number;
  correctionPauseMin: number;  // Pause before correction (ms)
  correctionPauseMax: number;
  postCorrectionPauseMin: number; // Pause after backspace (ms)
  postCorrectionPauseMax: number;
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
  postCorrectionPauseMax: 200
};

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomNeighborChar(char: string): string {
  const lowerChar = char.toLowerCase();
  const neighbors = QWERTY_NEIGHBORS[lowerChar];
  if (!neighbors) return char;

  const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
  // Preserve case
  return char === char.toUpperCase() ? randomNeighbor.toUpperCase() : randomNeighbor;
}

function shouldMakeTypo(char: string, errorRate: number): boolean {
  // Only make typos on alphanumeric characters
  return /[a-zA-Z0-9]/.test(char) && Math.random() < errorRate;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Simple typewriter for basic editors like Notepad (no auto-indent reset)
export async function typeSimpleToLastWindow(
  text: string,
  config: Partial<HumanTypingConfig> = {}
): Promise<void> {
  isTypingCancelled = false;
  await restoreFocusToLastWindow();

  const cfg: HumanTypingConfig = { ...DEFAULT_HUMAN_CONFIG, ...config };

  for (const char of text) {
    // Handle newlines with physical Enter key press
    if (char === '\n') {
      await keyboard.pressKey(Key.Enter);
      await keyboard.releaseKey(Key.Enter);
      await sleep(randomInRange(50, 150));
      continue;
    }

    // Handle carriage return (part of Windows line endings \r\n)
    if (char === '\r') {
      continue; // Skip \r, the \n will handle the newline
    }

    // Decide if we make a typo
    if (shouldMakeTypo(char, cfg.errorRate)) {
      const typoChar = getRandomNeighborChar(char);

      // Type the wrong character
      await keyboard.type(typoChar);

      // Human-like pause before realizing the mistake
      await sleep(randomInRange(cfg.correctionPauseMin, cfg.correctionPauseMax));

      // Backspace to correct
      await keyboard.pressKey(Key.Backspace);
      await keyboard.releaseKey(Key.Backspace);

      // Small pause after correction
      await sleep(randomInRange(cfg.postCorrectionPauseMin, cfg.postCorrectionPauseMax));
    }

    // Type the correct character
    await keyboard.type(char);

    // Calculate variable delay (jitter)
    let delay = randomInRange(cfg.minDelay, cfg.maxDelay);

    // Add thinking pause after punctuation
    if (/[.,!?;:]/.test(char)) {
      delay += randomInRange(cfg.punctuationPauseMin, cfg.punctuationPauseMax);
    }

    // Add slight pause after space (word boundary)
    if (char === ' ') {
      delay += randomInRange(cfg.spacePauseMin, cfg.spacePauseMax);
    }

    await sleep(delay);

    if (isTypingCancelled) return;
  }

  console.log("Typed to previous window (simple typewriter)");
}

// LeetCode typewriter with auto-indent reset for code editors
export async function typeLeetCodeToLastWindow(
  text: string,
  config: Partial<HumanTypingConfig> = {}
): Promise<void> {
  isTypingCancelled = false;
  await restoreFocusToLastWindow();

  const cfg: HumanTypingConfig = { ...DEFAULT_HUMAN_CONFIG, ...config };

  // Split into lines for proper indentation handling
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, ''); // Remove trailing \r if present

    // 1. Trigger Newline (only if not the first line)
    if (i > 0) {
      await keyboard.pressKey(Key.Enter);
      await keyboard.releaseKey(Key.Enter);
      await sleep(randomInRange(50, 150)); // Wait for auto-indent

      // 2. HARD RESET: Move to start of line and delete any auto-indented content
      // Press Home to go to the beginning of the line
      await keyboard.pressKey(Key.Home);
      await keyboard.releaseKey(Key.Home);
      await sleep(randomInRange(20, 50));

      // Select any auto-indented whitespace with Shift+End
      await keyboard.pressKey(Key.LeftShift, Key.End);
      await keyboard.releaseKey(Key.LeftShift, Key.End);
      await sleep(randomInRange(20, 50));

      // Delete the selected content with Backspace
      await keyboard.pressKey(Key.Backspace);
      await keyboard.releaseKey(Key.Backspace);
      await sleep(randomInRange(20, 50));
    }

    // 3. Type the FULL line (including original leading spaces)
    // This ensures the indentation is exactly what the source code has
    for (const char of line) {
      // Decide if we make a typo (only on alphanumeric chars for realism)
      if (shouldMakeTypo(char, cfg.errorRate)) {
        const typoChar = getRandomNeighborChar(char);

        // Type the wrong character
        await keyboard.type(typoChar);

        // Human-like pause before realizing the mistake
        await sleep(randomInRange(cfg.correctionPauseMin, cfg.correctionPauseMax));

        // Backspace to correct
        await keyboard.pressKey(Key.Backspace);
        await keyboard.releaseKey(Key.Backspace);

        // Small pause after correction
        await sleep(randomInRange(cfg.postCorrectionPauseMin, cfg.postCorrectionPauseMax));
      }

      // Type the correct character
      await keyboard.type(char);

      // Calculate variable delay (jitter)
      let delay = randomInRange(cfg.minDelay, cfg.maxDelay);

      // Add thinking pause after punctuation
      if (/[.,!?;:]/.test(char)) {
        delay += randomInRange(cfg.punctuationPauseMin, cfg.punctuationPauseMax);
      }

      // Add slight pause after space (word boundary)
      if (char === ' ') {
        delay += randomInRange(cfg.spacePauseMin, cfg.spacePauseMax);
      }

      await sleep(delay);

      if (isTypingCancelled) return;
    }
    if (isTypingCancelled) return;
  }

  console.log("Typed to previous window (LeetCode mode with proper indentation)");
}

export type TextOutputMode = "paste" | "typewriter" | "typewriter-leetcode";

export async function sendTextToLastWindow(
  text: string,
  mode: TextOutputMode = "paste"
): Promise<void> {
  if (mode === "typewriter") {
    await typeSimpleToLastWindow(text);
  } else if (mode === "typewriter-leetcode") {
    await typeLeetCodeToLastWindow(text);
  } else {
    await pasteToLastWindow(text);
  }
}
