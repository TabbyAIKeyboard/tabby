import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

contextBridge.exposeInMainWorld("electron", {
  onShowMenu: (callback: (text: string) => void) => {
    const handler = (_: IpcRendererEvent, text: string) => callback(text);
    ipcRenderer.on("show-menu", handler);
    return () => ipcRenderer.removeListener("show-menu", handler);
  },
  replaceText: (text: string) => ipcRenderer.send("replace-text", text),
  closeMenu: () => ipcRenderer.send("close-menu"),
  resizeWindow: (size: { width?: number; height?: number }) =>
    ipcRenderer.send("resize-window", size),
  moveWindow: (delta: { x: number; y: number }) =>
    ipcRenderer.send("move-window", delta),
  openSettings: () => ipcRenderer.send("open-settings"),

  onShowSuggestion: (callback: (data: { context: string }) => void) => {
    const handler = (_: IpcRendererEvent, data: { context: string }) => callback(data);
    ipcRenderer.on("show-suggestion", handler);
    return () => ipcRenderer.removeListener("show-suggestion", handler);
  },
  acceptSuggestion: (text: string) => ipcRenderer.send("accept-suggestion", text),
  dismissSuggestion: () => ipcRenderer.send("dismiss-suggestion"),

  getSuggestionMode: () => ipcRenderer.invoke("get-suggestion-mode"),
  setSuggestionMode: (mode: "hotkey" | "auto") => ipcRenderer.send("set-suggestion-mode", mode),

  getTextOutputMode: () => ipcRenderer.invoke("get-text-output-mode"),
  setTextOutputMode: (mode: "paste" | "typewriter" | "typewriter-leetcode") => ipcRenderer.send("set-text-output-mode", mode),

  toggleBrainPanel: () => ipcRenderer.send("toggle-brain-panel"),
  setBrainPanelCollapsed: (collapsed: boolean) =>
    ipcRenderer.send("set-brain-panel-collapsed", collapsed),

  onMemoryStored: (callback: (memory: string) => void) => {
    const handler = (_: IpcRendererEvent, memory: string) => callback(memory);
    ipcRenderer.on("memory-stored", handler);
    return () => ipcRenderer.removeListener("memory-stored", handler);
  },

  onCaptureStatusChanged: (callback: (enabled: boolean) => void) => {
    const handler = (_: IpcRendererEvent, enabled: boolean) => callback(enabled);
    ipcRenderer.on("capture-status-changed", handler);
    return () => ipcRenderer.removeListener("capture-status-changed", handler);
  },

  getContextCaptureEnabled: () => ipcRenderer.invoke("get-context-capture-enabled"),
  setContextCaptureEnabled: (enabled: boolean) =>
    ipcRenderer.send("set-context-capture-enabled", enabled),

  captureScreen: () => ipcRenderer.invoke("capture-screen"),

  onAnalyzeScreenshot: (callback: (data: { dataUrl: string; timestamp: string }) => void) => {
    const handler = (_: IpcRendererEvent, data: { dataUrl: string; timestamp: string }) => callback(data);
    ipcRenderer.on("analyze-screenshot", handler);
    return () => ipcRenderer.removeListener("analyze-screenshot", handler);
  },
  openExternal: (url: string) => ipcRenderer.send("open-external", url),
  notifyAnalysisComplete: (success: boolean) =>
    ipcRenderer.send("analysis-complete", success),

  // Ghost Text Overlay
  on: (channel: string, callback: (event: IpcRendererEvent, ...args: unknown[]) => void) => {
    ipcRenderer.on(channel, callback);
  },
  removeListener: (channel: string, callback: (event: IpcRendererEvent, ...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },
  getGhostTextEnabled: () => ipcRenderer.invoke("get-ghost-text-enabled"),
  setGhostTextEnabled: (enabled: boolean) => ipcRenderer.send("set-ghost-text-enabled", enabled),

  // Ghost Text Auto-Trigger
  getGhostTextAutoTrigger: () => ipcRenderer.invoke("get-ghost-text-auto-trigger"),
  setGhostTextAutoTrigger: (enabled: boolean) => ipcRenderer.send("set-ghost-text-auto-trigger", enabled),
  getGhostTextAutoTriggerDelay: () => ipcRenderer.invoke("get-ghost-text-auto-trigger-delay"),
  setGhostTextAutoTriggerDelay: (delayMs: number) => ipcRenderer.send("set-ghost-text-auto-trigger-delay", delayMs),

  // User ID Persistence
  setUserId: (userId: string) => ipcRenderer.send("set-user-id", userId),
  getUserId: () => ipcRenderer.invoke("get-user-id"),

  // Cached Memories for Inline Suggestions
  setCachedMemories: (memories: string[]) => ipcRenderer.send("set-cached-memories", memories),
  getCachedMemories: () => ipcRenderer.invoke("get-cached-memories"),

  // Content Protection (Invisibility)
  getContentProtectionEnabled: () => ipcRenderer.invoke("get-content-protection-enabled"),
  setContentProtectionEnabled: (enabled: boolean) => ipcRenderer.send("set-content-protection-enabled", enabled),

  // Voice Agent Panel
  onVoiceAgentStart: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on("voice-agent-start", handler);
    return () => ipcRenderer.removeListener("voice-agent-start", handler);
  },
  onVoiceAgentStop: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on("voice-agent-stop", handler);
    return () => ipcRenderer.removeListener("voice-agent-stop", handler);
  },
  onVoiceAgentState: (callback: (data: { state: string }) => void) => {
    const handler = (_: IpcRendererEvent, data: { state: string }) => callback(data);
    ipcRenderer.on("voice-agent-state", handler);
    return () => ipcRenderer.removeListener("voice-agent-state", handler);
  },
  onVoiceAgentReset: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on("voice-agent-reset", handler);
    return () => ipcRenderer.removeListener("voice-agent-reset", handler);
  },
  onVoiceAgentTranscript: (callback: (data: { role: string; text: string }) => void) => {
    const handler = (_: IpcRendererEvent, data: { role: string; text: string }) => callback(data);
    ipcRenderer.on("voice-agent-transcript", handler);
    return () => ipcRenderer.removeListener("voice-agent-transcript", handler);
  },
  voiceAgentSessionStarted: () => ipcRenderer.send("voice-agent-session-started"),
  voiceAgentSessionStopped: () => ipcRenderer.send("voice-agent-session-stopped"),
  voiceAgentStateChange: (state: string) => ipcRenderer.send("voice-agent-state-change", state),
  voiceAgentHide: () => ipcRenderer.send("voice-agent-hide"),
  getVoiceAgentActive: () => ipcRenderer.invoke("get-voice-agent-active"),

  // Transcribe Mode
  onTranscribeStart: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on("transcribe-start", handler);
    return () => ipcRenderer.removeListener("transcribe-start", handler);
  },
  onTranscribeStop: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on("transcribe-stop", handler);
    return () => ipcRenderer.removeListener("transcribe-stop", handler);
  },
  onTranscribeState: (callback: (data: { state: string }) => void) => {
    const handler = (_: IpcRendererEvent, data: { state: string }) => callback(data);
    ipcRenderer.on("transcribe-state", handler);
    return () => ipcRenderer.removeListener("transcribe-state", handler);
  },
  onTranscribeAudioLevel: (callback: (data: { level: number }) => void) => {
    const handler = (_: IpcRendererEvent, data: { level: number }) => callback(data);
    ipcRenderer.on("transcribe-audio-level", handler);
    return () => ipcRenderer.removeListener("transcribe-audio-level", handler);
  },
  sendTranscribeAudio: (audioBase64: string) => ipcRenderer.send("transcribe-audio-data", audioBase64),
  getTranscribeState: () => ipcRenderer.invoke("get-transcribe-state"),

  // Model Settings
  getDefaultModel: () => ipcRenderer.invoke("get-default-model"),
  setDefaultModel: (model: string) => ipcRenderer.send("set-default-model", model),
  getDefaultFastModel: () => ipcRenderer.invoke("get-default-fast-model"),
  setDefaultFastModel: (model: string) => ipcRenderer.send("set-default-fast-model", model),

  // Onboarding
  getOnboardingComplete: () => ipcRenderer.invoke("get-onboarding-complete"),
  setOnboardingComplete: (complete: boolean) => ipcRenderer.send("set-onboarding-complete", complete),

  // Local Database
  db: {
    getConversations: (type?: string) => ipcRenderer.invoke("db:getConversations", type),
    getConversationById: (id: string) => ipcRenderer.invoke("db:getConversationById", id),
    createConversation: (data: { id: string; title: string; type?: string; userId?: string }) =>
      ipcRenderer.invoke("db:createConversation", data),
    renameConversation: (id: string, title: string) =>
      ipcRenderer.invoke("db:renameConversation", id, title),
    deleteConversation: (id: string) => ipcRenderer.invoke("db:deleteConversation", id),
    getMessages: (conversationId: string) => ipcRenderer.invoke("db:getMessages", conversationId),
    saveMessages: (
      messages: Array<{
        id: string;
        conversation_id: string;
        role: string;
        parts: unknown;
        metadata?: unknown;
      }>
    ) => ipcRenderer.invoke("db:saveMessages", messages),
  },

  // Local File Storage
  fileStorage: {
    saveScreenshot: (imageDataUrl: string, userId: string) =>
      ipcRenderer.invoke("fileStorage:saveScreenshot", imageDataUrl, userId),
    saveChatAttachment: (
      projectId: string,
      fileBuffer: Buffer,
      fileName: string,
      mimeType: string
    ) =>
      ipcRenderer.invoke(
        "fileStorage:saveChatAttachment",
        projectId,
        fileBuffer,
        fileName,
        mimeType
      ),
    deleteFile: (filePath: string) => ipcRenderer.invoke("fileStorage:deleteFile", filePath),
    cleanupOldScreenshots: (userId: string, maxAgeHours?: number) =>
      ipcRenderer.invoke("fileStorage:cleanupOldScreenshots", userId, maxAgeHours),
  },
});
