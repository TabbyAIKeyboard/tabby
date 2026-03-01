import { is } from "@electron-toolkit/utils";
import { clipboard } from "electron";
import { AppState } from "../app-state";
import { getApiUrl } from "../utils/api-url";
import { ContextCaptureService } from "./context-capture";
import { GhostTextOverlay } from "./ghost-overlay";
import { InterviewGhostService } from "./interview-ghost";
import { KeyboardMonitor } from "./keyboard-monitor";
import { KeystrokeListener } from "./keystroke-listener";
import { showSuggestionForContext } from "../windows/suggestion-window";
import { TranscribeService } from "./transcribe-service";

export const createKeyboardMonitor = (): KeyboardMonitor => {
  return new KeyboardMonitor({
    debounceMs: 500,
    minContextLength: 10,
    onSuggestionReady: async (suggestion) => {
      console.log('[GhostText] Suggestion ready:', suggestion.slice(0, 30));
      await AppState.ghostOverlay?.showSuggestion(suggestion);
    },
    onClear: () => {
      AppState.ghostOverlay?.hide();
    },
    getSuggestion: async (context, signal) => {
      try {
        const response = await fetch(getApiUrl('/api/suggest-inline'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context,
            userId: AppState.currentUserId,
            cachedMemories: AppState.cachedMemories,
          }),
          signal,
        });
        const data = await response.json();
        return data.suggestion || '';
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('[GhostText] API error:', error);
        }
        return '';
      }
    },
  });
};

export const startKeystrokeListening = (): void => {
  if (AppState.keystrokeListener?.isRunning()) return;

  if (!AppState.keystrokeListener) {
    AppState.keystrokeListener = new KeystrokeListener();
  }

  AppState.keystrokeListener.onKeystroke((char, isBackspace) => {
    AppState.keyboardMonitor?.appendCharacter(char, isBackspace);
  });

  AppState.keystrokeListener.start();
  console.log('[GhostText] Keystroke listening started for auto-trigger');
};

export const stopKeystrokeListening = (): void => {
  if (AppState.keystrokeListener) {
    AppState.keystrokeListener.stop();
    console.log('[GhostText] Keystroke listening stopped');
  }
};

export const initializeGhostText = (): void => {
  if (!AppState.ghostOverlay) {
    AppState.ghostOverlay = new GhostTextOverlay();
    AppState.ghostOverlay.setPort(is.dev ? 3000 : (AppState.nextJSPort || 3000));
    AppState.ghostOverlay.create();
  }
  AppState.ghostOverlay.setEnabled(true);

  if (!AppState.keyboardMonitor) {
    AppState.keyboardMonitor = createKeyboardMonitor();
  }
};

export const cleanupGhostText = (): void => {
  stopKeystrokeListening();
  if (AppState.ghostOverlay) {
    AppState.ghostOverlay.destroy();
    AppState.ghostOverlay = null;
  }
  if (AppState.keyboardMonitor) {
    AppState.keyboardMonitor.clearBuffer();
    AppState.keyboardMonitor = null;
  }
};

export const startClipboardWatcher = (): void => {
  if (AppState.clipboardWatcher) return;

  AppState.lastClipboardContent = clipboard.readText();

  AppState.clipboardWatcher = setInterval(() => {
    if (AppState.isInternalClipboardOp) return;

    const currentContent = clipboard.readText();

    if (currentContent !== AppState.lastClipboardContent && currentContent.length >= 5) {
      AppState.lastClipboardContent = currentContent;
      console.log("[Auto-suggest] Clipboard changed:", currentContent.slice(0, 50));
      showSuggestionForContext(currentContent);
    }
  }, 500);

  console.log("[Auto-suggest] Clipboard watcher started");
};

export const stopClipboardWatcher = (): void => {
  if (AppState.clipboardWatcher) {
    clearInterval(AppState.clipboardWatcher);
    AppState.clipboardWatcher = null;
    console.log("[Auto-suggest] Clipboard watcher stopped");
  }
};

export const initializeContextCapture = (): void => {
  AppState.contextCaptureService = new ContextCaptureService();
  AppState.contextCaptureService.onMemoryStored((memory) => {
    if (AppState.brainPanelWindow && !AppState.brainPanelWindow.isDestroyed()) {
      AppState.brainPanelWindow.webContents.send("memory-stored", memory);
    }
  });
};

export const initializeInterviewGhost = (): void => {
  if (!AppState.interviewGhostService) {
    AppState.interviewGhostService = new InterviewGhostService({
      onSuggestionReady: async (code) => {
        console.log('[InterviewGhost] Code suggestion ready, showing ghost text');
        await AppState.ghostOverlay?.showSuggestion(code);
      },
      onLoading: (loading) => {
        if (loading) {
          AppState.ghostOverlay?.showLoading();
        } else {
          AppState.ghostOverlay?.hideLoading();
        }
      },
      onError: (error) => {
        console.error('[InterviewGhost] Error:', error);
        AppState.ghostOverlay?.hideLoading();
        AppState.ghostOverlay?.hide();
      },
    });
    console.log('[InterviewGhost] Service initialized');
  }
};



// Re-export types and classes from service files
export { ContextCaptureService } from "./context-capture";
export { GhostTextOverlay } from "./ghost-overlay";
export { InterviewGhostService } from "./interview-ghost";
export { KeyboardMonitor } from "./keyboard-monitor";
export { KeystrokeListener } from "./keystroke-listener";
export { getTranscribeService } from "./transcribe-service";
export { getTranscribeIndicator } from "./transcribe-indicator";
export { getVoiceAgentPanel } from "./voice-agent-panel";
export { getCaretPosition, startCaretTracking } from "./caret-tracker";
export type { CaretPosition } from "./caret-tracker";
export type { TextOutputMode } from "./text-handler";
export {
  captureLastActiveWindow,
  captureSelectedText,
  sendTextToLastWindow,
  pasteToLastWindow,
  cancelTyping,
} from "./text-handler";

