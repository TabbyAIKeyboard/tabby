import { ipcMain } from "electron";
import { getVoiceAgentPanel } from "../services/voice-agent-panel";
import { AppState } from "../app-state";
import { is } from "@electron-toolkit/utils";

export const registerVoiceAgentHandlers = (): void => {
  ipcMain.handle("get-voice-agent-active", () => {
    return getVoiceAgentPanel().isActive();
  });

  ipcMain.on("voice-agent-session-started", () => {
    const panel = getVoiceAgentPanel();
    panel.setSessionActive(true);
    panel.updateState("listening");
    console.log("[VoiceAgent IPC] Session started");
  });

  ipcMain.on("voice-agent-session-stopped", () => {
    const panel = getVoiceAgentPanel();
    panel.setSessionActive(false);
    panel.updateState("idle");
    console.log("[VoiceAgent IPC] Session stopped");
  });

  ipcMain.on("voice-agent-state-change", (_, state: string) => {
    const panel = getVoiceAgentPanel();
    panel.updateState(state as "idle" | "connecting" | "listening" | "thinking" | "speaking");
  });

  ipcMain.on("voice-agent-hide", () => {
    const panel = getVoiceAgentPanel();
    panel.hide();
    panel.setSessionActive(false);
    console.log("[VoiceAgent IPC] Panel hidden");
  });
};

export const toggleVoiceAgentPanel = (): void => {
  const panel = getVoiceAgentPanel();
  panel.setPort(is.dev ? 3000 : AppState.nextJSPort || 3000);

  if (panel.isActive()) {
    // Stop the session
    panel.sendStopSession();
    setTimeout(() => {
      panel.hide();
    }, 500);
  } else {
    // Start the session
    panel.show();
    setTimeout(() => {
      panel.sendStartSession();
    }, 300);
  }
};
