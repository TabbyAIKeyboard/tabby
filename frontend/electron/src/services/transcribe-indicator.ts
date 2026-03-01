import { BrowserWindow, screen } from "electron";
import { join } from "path";
import { is } from "@electron-toolkit/utils";
import type { VoiceMode } from "../app-state";

export type TranscribeState = "idle" | "recording" | "processing";

export class TranscribeIndicatorWindow {
  private window: BrowserWindow | null = null;
  private port: number = 3000;

  setPort(port: number): void {
    this.port = port;
  }

  create(): void {
    if (this.window && !this.window.isDestroyed()) {
      return;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;

    const overlayWidth = 260;
    const overlayHeight = 44;

    const x = Math.round((screenWidth - overlayWidth) / 2);
    const y = 60;

    this.window = new BrowserWindow({
      x,
      y,
      width: overlayWidth,
      height: overlayHeight,
      transparent: true,
      backgroundColor: "#00000000",
      frame: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      focusable: false,
      hasShadow: false,
      resizable: false,
      movable: false,
      show: false,
      webPreferences: {
        preload: join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    this.window.setIgnoreMouseEvents(true, { forward: true });
    this.window.setAlwaysOnTop(true, "screen-saver", 1);
    this.window.setVisibleOnAllWorkspaces(true);

    const port = is.dev ? 3000 : this.port || 3000;
    this.window.loadURL(`http://localhost:${port}/transcribe-indicator`);
    console.log(`[TranscribeIndicator] Loading from http://localhost:${port}/transcribe-indicator`);
  }

  show(state: TranscribeState = "recording", mode?: VoiceMode): void {
    if (!this.window || this.window.isDestroyed()) {
      this.create();
    }

    this.window?.webContents.send("transcribe-indicator-state", { state, mode });
    this.window?.showInactive();
    console.log("[TranscribeIndicator] Shown with state:", state, "mode:", mode);
  }

  updateState(state: TranscribeState): void {
    this.window?.webContents.send("transcribe-indicator-state", { state });
  }

  updateMode(mode: VoiceMode): void {
    this.window?.webContents.send("voice-mode-change", { mode });
  }

  hide(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.hide();
    }
    console.log("[TranscribeIndicator] Hidden");
  }

  destroy(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
    this.window = null;
  }
}

let indicatorWindow: TranscribeIndicatorWindow | null = null;

export const getTranscribeIndicator = (): TranscribeIndicatorWindow => {
  if (!indicatorWindow) {
    indicatorWindow = new TranscribeIndicatorWindow();
  }
  return indicatorWindow;
};
