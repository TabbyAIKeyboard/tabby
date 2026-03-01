import { uIOhook, UiohookKey, UiohookKeyboardEvent } from 'uiohook-napi';

export type KeystrokeCallback = (key: string, isBackspace: boolean) => void;

export class KeystrokeListener {
  private callback: KeystrokeCallback | null = null;
  private isListening = false;
  private isPaused = false;
  private lastKeyTime = 0;
  
  // Map uiohook key codes to characters
  private static readonly KEY_MAP: Record<number, string> = {
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
    // Numbers
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
    // Letters
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
  };

  // Map for shifted keys (US keyboard layout)
  private static readonly SHIFT_KEY_MAP: Record<number, string> = {
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
  };

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  start(): void {
    if (this.isListening) return;
    
    uIOhook.on('keydown', this.handleKeyDown);
    uIOhook.start();
    this.isListening = true;
    console.log('[KeystrokeListener] Started global keystroke capture');
  }

  stop(): void {
    if (!this.isListening) return;
    
    uIOhook.off('keydown', this.handleKeyDown);
    uIOhook.stop();
    this.isListening = false;
    console.log('[KeystrokeListener] Stopped global keystroke capture');
  }

  onKeystroke(callback: KeystrokeCallback): void {
    this.callback = callback;
  }

  isRunning(): boolean {
    return this.isListening;
  }

  getTimeSinceLastKey(): number {
    return Date.now() - this.lastKeyTime;
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  private handleKeyDown(event: UiohookKeyboardEvent): void {
    // Ignore keystrokes when paused (e.g., during suggestion acceptance)
    if (this.isPaused) return;
    
    this.lastKeyTime = Date.now();
    
    // Check for backspace
    if (event.keycode === UiohookKey.Backspace) {
      this.callback?.('', true);
      return;
    }
    
    // Check for enter/return - treat as word boundary
    if (event.keycode === UiohookKey.Enter) {
      this.callback?.('\n', false);
      return;
    }
    
    // Check for shifted special characters first
    if (event.shiftKey) {
      const shiftChar = KeystrokeListener.SHIFT_KEY_MAP[event.keycode];
      if (shiftChar) {
        this.callback?.(shiftChar, false);
        return;
      }
    }
    
    // Map keycode to character
    let char = KeystrokeListener.KEY_MAP[event.keycode];
    
    if (char) {
      // Handle shift for uppercase letters
      if (event.shiftKey && char.length === 1 && /[a-z]/.test(char)) {
        char = char.toUpperCase();
      }
      
      this.callback?.(char, false);
    }
  }

  destroy(): void {
    this.stop();
    this.callback = null;
  }
}
