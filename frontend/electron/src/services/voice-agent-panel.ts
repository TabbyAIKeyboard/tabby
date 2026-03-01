import { BrowserWindow, screen } from "electron";
import { join } from "path";
import { is } from "@electron-toolkit/utils";

export type VoiceAgentState = "idle" | "connecting" | "listening" | "thinking" | "speaking";

export interface VoiceAgentTranscript {
  role: "user" | "assistant";
  text: string;
}

export class VoiceAgentPanel {
  private window: BrowserWindow | null = null;
  private port: number = 3000;
  private isSessionActive: boolean = false;

  setPort(port: number): void {
    this.port = port;
  }

  create(): void {
    if (this.window && !this.window.isDestroyed()) {
      return;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;

    const panelWidth = 420;
    const panelHeight = 100;

    const x = Math.round((screenWidth - panelWidth) / 2);
    const y = 60;

    this.window = new BrowserWindow({
      x,
      y,
      width: panelWidth,
      height: panelHeight,
      transparent: true,
      backgroundColor: "#00000000",
      frame: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      focusable: true,
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

    // Allow mouse events for the close button
    this.window.setAlwaysOnTop(true, "screen-saver", 1);
    this.window.setVisibleOnAllWorkspaces(true);

    const port = is.dev ? 3000 : this.port || 3000;
    this.window.loadURL(`http://localhost:${port}/voice-agent-panel`);
    console.log(`[VoiceAgentPanel] Loading from http://localhost:${port}/voice-agent-panel`);
  }

  show(): void {
    if (!this.window || this.window.isDestroyed()) {
      this.create();
    }
    this.window?.showInactive();
    console.log("[VoiceAgentPanel] Shown");
  }

  hide(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.hide();
    }
    this.isSessionActive = false;
    console.log("[VoiceAgentPanel] Hidden");
  }

  reset(): void {
    this.window?.webContents.send("voice-agent-reset");
    this.isSessionActive = false;
    console.log("[VoiceAgentPanel] Reset sent");
  }

  toggle(): boolean {
    if (!this.window || this.window.isDestroyed()) {
      this.show();
      return true;
    }

    if (this.window.isVisible()) {
      this.hide();
      return false;
    } else {
      this.show();
      return true;
    }
  }

  isVisible(): boolean {
    return this.window?.isVisible() ?? false;
  }

  isActive(): boolean {
    return this.isSessionActive;
  }

  setSessionActive(active: boolean): void {
    this.isSessionActive = active;
  }

  updateState(state: VoiceAgentState): void {
    this.window?.webContents.send("voice-agent-state", { state });
    console.log("[VoiceAgentPanel] State updated:", state);
  }

  updateTranscript(transcript: VoiceAgentTranscript): void {
    this.window?.webContents.send("voice-agent-transcript", transcript);
    console.log("[VoiceAgentPanel] Transcript:", transcript.role, transcript.text.slice(0, 30));
  }

  sendStartSession(): void {
    this.reset();
    setTimeout(() => {
      this.window?.webContents.send("voice-agent-start");
      this.isSessionActive = true;
      console.log("[VoiceAgentPanel] Start session sent");
    }, 100);
  }

  sendStopSession(): void {
    this.window?.webContents.send("voice-agent-stop");
    this.isSessionActive = false;
    console.log("[VoiceAgentPanel] Stop session sent");
  }

  destroy(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
    this.window = null;
    this.isSessionActive = false;
  }
}

let voiceAgentPanel: VoiceAgentPanel | null = null;

export const getVoiceAgentPanel = (): VoiceAgentPanel => {
  if (!voiceAgentPanel) {
    voiceAgentPanel = new VoiceAgentPanel();
  }
  return voiceAgentPanel;
};
