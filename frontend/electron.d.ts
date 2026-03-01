declare global {
  interface Window {
    electron: {
      onShowMenu: (callback: (text: string) => void) => () => void;
      replaceText: (text: string) => void;
      closeMenu: () => void;
      resizeWindow: (size: { width?: number; height?: number }) => void;
      moveWindow: (delta: { x: number; y: number }) => void;
      openSettings: () => void;
      onShowSuggestion: (callback: (data: { context: string }) => void) => () => void;
      acceptSuggestion: (text: string) => void;
      dismissSuggestion: () => void;
      getSuggestionMode: () => Promise<"hotkey" | "auto">;
      setSuggestionMode: (mode: "hotkey" | "auto") => void;
      getTextOutputMode: () => Promise<"paste" | "typewriter" | "typewriter-leetcode">;
      setTextOutputMode: (mode: "paste" | "typewriter" | "typewriter-leetcode") => void;
      toggleBrainPanel: () => void;
      setBrainPanelCollapsed: (collapsed: boolean) => void;
      onMemoryStored: (callback: (memory: string) => void) => () => void;
      onCaptureStatusChanged: (callback: (enabled: boolean) => void) => () => void;
      getContextCaptureEnabled: () => Promise<boolean>;
      setContextCaptureEnabled: (enabled: boolean) => void;
      onAnalyzeScreenshot: (callback: (data: { dataUrl: string; timestamp: string }) => void) => () => void;
      captureScreen: () => Promise<string | null>;
      openExternal: (url: string) => void;
      notifyAnalysisComplete: (success: boolean) => void;
      // Ghost Text Overlay
      on: (channel: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (channel: string, callback: (...args: unknown[]) => void) => void;
      getGhostTextEnabled: () => Promise<boolean>;
      setGhostTextEnabled: (enabled: boolean) => void;
      // Ghost Text Auto-Trigger
      getGhostTextAutoTrigger: () => Promise<boolean>;
      setGhostTextAutoTrigger: (enabled: boolean) => void;
      getGhostTextAutoTriggerDelay: () => Promise<number>;
      setGhostTextAutoTriggerDelay: (delayMs: number) => void;
      // User ID Persistence
      setUserId: (userId: string) => void;
      getUserId: () => Promise<string | null>;
      // Cached Memories for Inline Suggestions
      setCachedMemories: (memories: string[]) => void;
      getCachedMemories: () => Promise<string[]>;
      // Content Protection (Invisibility)
      getContentProtectionEnabled: () => Promise<boolean>;
      setContentProtectionEnabled: (enabled: boolean) => void;
      // Voice Agent Panel
      onVoiceAgentStart: (callback: () => void) => () => void;
      onVoiceAgentStop: (callback: () => void) => () => void;
      onVoiceAgentState: (callback: (data: { state: string }) => void) => () => void;
      onVoiceAgentReset: (callback: () => void) => () => void;
      onVoiceAgentTranscript: (callback: (data: { role: string; text: string }) => void) => () => void;
      voiceAgentSessionStarted: () => void;
      voiceAgentSessionStopped: () => void;
      voiceAgentStateChange: (state: string) => void;
      voiceAgentHide: () => void;
      getVoiceAgentActive: () => Promise<boolean>;
      // Transcribe Mode
      onTranscribeStart: (callback: () => void) => () => void;
      onTranscribeStop: (callback: () => void) => () => void;
      onTranscribeState: (callback: (data: { state: string }) => void) => () => void;
      onTranscribeAudioLevel: (callback: (data: { level: number }) => void) => () => void;
      sendTranscribeAudio: (audioBase64: string) => void;
      getTranscribeState: () => Promise<{ state: string }>;
      // Model Settings
      getDefaultModel: () => Promise<string>;
      setDefaultModel: (model: string) => void;
      getDefaultFastModel: () => Promise<string>;
      setDefaultFastModel: (model: string) => void;
      // Onboarding
      getOnboardingComplete: () => Promise<boolean>;
      setOnboardingComplete: (complete: boolean) => void;
    };
  }
}

export { };

