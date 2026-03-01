import { ipcMain } from "electron";
import { getTranscribeService } from "../services/transcribe-service";

export const registerTranscribeHandlers = (): void => {
  // Handle audio data from renderer (main window does the recording)
  ipcMain.on("transcribe-audio-data", async (_, audioBase64: string) => {
    console.log("[Transcribe] Received audio data, length:", audioBase64.length);
    
    const service = getTranscribeService();
    await service.processAudio(audioBase64);
  });
};
