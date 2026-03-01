import { BrowserWindow, Tray } from "electron";
import Store from "electron-store";
import type { ContextCaptureService } from "./services/context-capture";
import type { GhostTextOverlay } from "./services/ghost-overlay";
import type { InterviewGhostService } from "./services/interview-ghost";
import type { KeyboardMonitor } from "./services/keyboard-monitor";
import type { KeystrokeListener } from "./services/keystroke-listener";
import type { TextOutputMode } from "./services/text-handler";

export type VoiceMode = "transcribe" | "command" | "generate";

const store = new Store();

export interface AppStateType {
  mainWindow: BrowserWindow | null;
  settingsWindow: BrowserWindow | null;
  suggestionWindow: BrowserWindow | null;
  brainPanelWindow: BrowserWindow | null;
  tray: Tray | null;
  nextJSPort: number | null;

  contextCaptureService: ContextCaptureService | null;
  ghostOverlay: GhostTextOverlay | null;
  interviewGhostService: InterviewGhostService | null;
  keyboardMonitor: KeyboardMonitor | null;
  keystrokeListener: KeystrokeListener | null;

  suggestionMode: "hotkey" | "auto";
  textOutputMode: TextOutputMode;
  ghostTextEnabled: boolean;
  ghostTextAutoTrigger: boolean;
  ghostTextAutoTriggerDelay: number;
  contentProtectionEnabled: boolean;

  defaultModel: string;
  defaultFastModel: string;

  clipboardWatcher: NodeJS.Timeout | null;
  lastClipboardContent: string;
  isInternalClipboardOp: boolean;

  currentUserId: string | null;
  cachedMemories: string[];
  currentVoiceMode: VoiceMode;
  onboardingComplete: boolean;
}

export const AppState: AppStateType = {
  mainWindow: null,
  settingsWindow: null,
  suggestionWindow: null,
  brainPanelWindow: null,
  tray: null,
  nextJSPort: null,

  contextCaptureService: null,
  ghostOverlay: null,
  interviewGhostService: null,
  keyboardMonitor: null,
  keystrokeListener: null,

  suggestionMode: "hotkey",
  textOutputMode: "paste",
  ghostTextEnabled: false,
  ghostTextAutoTrigger: false,
  ghostTextAutoTriggerDelay: 3000,
  contentProtectionEnabled: true,

  defaultModel: (store.get("defaultModel") as string) || "gpt-4.1-mini",
  defaultFastModel: (store.get("defaultFastModel") as string) || "gpt-4.1-mini",

  clipboardWatcher: null,
  lastClipboardContent: "",
  isInternalClipboardOp: false,

  currentUserId: store.get("userId") as string | null,
  cachedMemories: (store.get("cachedMemories") as string[]) || [],
  currentVoiceMode: "transcribe",
  onboardingComplete: store.get("onboardingComplete") as boolean || false,
};

export const getStore = () => store;

export const getPort = (): number => {
  const { is } = require("@electron-toolkit/utils");
  return is.dev ? 3000 : (AppState.nextJSPort || 3000);
};
