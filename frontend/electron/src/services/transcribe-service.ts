import { AppState, VoiceMode } from "../app-state";
import { sendTextToLastWindow, captureLastActiveWindow } from "./text-handler";
import { getApiUrl } from "../utils/api-url";

interface TranscribeResult {
  text: string;
  language?: string;
  duration?: number;
}

interface VoiceCommandResult {
  transcription: string;
  action: string;
  result: string;
}

interface VoiceGenerateResult {
  transcription: string;
  generated: string;
}

export class TranscribeService {
  private isRecording = false;
  private abortController: AbortController | null = null;

  async startRecording(): Promise<void> {
    if (this.isRecording) {
      console.log("[Transcribe] Already recording");
      return;
    }

    console.log("[Transcribe] Starting recording...");
    this.isRecording = true;
    await captureLastActiveWindow();
  }

  async processAudio(audioBase64: string): Promise<string | null> {
    if (!this.isRecording) {
      console.log("[Transcribe] Not recording, ignoring audio");
      return null;
    }

    this.isRecording = false;
    const mode = AppState.currentVoiceMode;
    console.log(`[Transcribe] Processing audio in ${mode} mode, length:`, audioBase64.length);

    try {
      this.abortController = new AbortController();
      const result = await this.processWithMode(audioBase64, mode);
      return result;
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        console.log("[Transcribe] Request aborted");
      } else {
        console.error("[Transcribe] Error:", error);
      }
      return null;
    }
  }

  private async processWithMode(audioBase64: string, mode: VoiceMode): Promise<string | null> {
    const endpoints: Record<VoiceMode, string> = {
      transcribe: "/api/transcribe",
      command: "/api/voice-command",
      generate: "/api/voice-generate",
    };

    const body: Record<string, unknown> = { audio: audioBase64 };
    if (mode === "generate") {
      if (AppState.currentUserId) {
        body.userId = AppState.currentUserId;
      }
      if (AppState.cachedMemories && AppState.cachedMemories.length > 0) {
        body.cachedMemories = AppState.cachedMemories;
      }
    }

    const response = await fetch(getApiUrl(endpoints[mode]), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Processing failed");
    }

    return this.handleModeResponse(mode, response);
  }

  private async handleModeResponse(mode: VoiceMode, response: Response): Promise<string | null> {
    switch (mode) {
      case "transcribe":
        return this.handleTranscribeResponse(response);
      case "command":
        return this.handleCommandResponse(response);
      case "generate":
        return this.handleGenerateResponse(response);
    }
  }

  private async handleTranscribeResponse(response: Response): Promise<string | null> {
    const data: TranscribeResult = await response.json();
    const text = data.text;

    if (!text || text.length === 0) {
      console.log("[Transcribe] Empty transcription");
      return null;
    }

    console.log("[Transcribe] Result:", text.slice(0, 50), "...");
    await sendTextToLastWindow(text, AppState.textOutputMode);
    console.log("[Transcribe] Text sent to window");
    return text;
  }

  private async handleCommandResponse(response: Response): Promise<string | null> {
    const data: VoiceCommandResult = await response.json();
    console.log("[VoiceCommand] Transcription:", data.transcription);
    console.log("[VoiceCommand] Action:", data.action);
    console.log("[VoiceCommand] Result:", data.result);
    return data.transcription;
  }

  private async handleGenerateResponse(response: Response): Promise<string | null> {
    const data: VoiceGenerateResult = await response.json();
    const generated = data.generated;

    if (!generated || generated.length === 0) {
      console.log("[VoiceGenerate] No content generated");
      return null;
    }

    console.log("[VoiceGenerate] Transcription:", data.transcription);
    console.log("[VoiceGenerate] Generated:", generated.slice(0, 50), "...");
    await sendTextToLastWindow(generated, AppState.textOutputMode);
    console.log("[VoiceGenerate] Content sent to window");
    return generated;
  }

  stopRecording(): void {
    this.isRecording = false;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  isActive(): boolean {
    return this.isRecording;
  }
}

let transcribeService: TranscribeService | null = null;

export const getTranscribeService = (): TranscribeService => {
  if (!transcribeService) {
    transcribeService = new TranscribeService();
  }
  return transcribeService;
};
