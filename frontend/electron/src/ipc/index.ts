import { registerTextHandlers } from "./text-handlers";
import { registerSettingsHandlers } from "./settings-handlers";
import { registerWindowHandlers } from "./window-handlers";
import { registerCaptureHandlers } from "./capture-handlers";
import { registerTranscribeHandlers } from "./transcribe-handlers";
import { registerVoiceAgentHandlers } from "./voice-agent-handlers";
import { registerOnboardingHandlers } from "./onboarding-handlers";
import { registerDbHandlers } from "./db-handlers";
import { registerFileStorageHandlers } from "../services/local-file-storage";

export const registerAllIpcHandlers = (): void => {
  registerTextHandlers();
  registerSettingsHandlers();
  registerWindowHandlers();
  registerCaptureHandlers();
  registerTranscribeHandlers();
  registerVoiceAgentHandlers();
  registerOnboardingHandlers();
  registerDbHandlers();
  registerFileStorageHandlers();
};

export { registerTextHandlers } from "./text-handlers";
export { registerSettingsHandlers } from "./settings-handlers";
export { registerWindowHandlers } from "./window-handlers";
export { registerCaptureHandlers } from "./capture-handlers";
export { registerTranscribeHandlers } from "./transcribe-handlers";
export { registerVoiceAgentHandlers, toggleVoiceAgentPanel } from "./voice-agent-handlers";
export { registerOnboardingHandlers } from "./onboarding-handlers";
export { registerDbHandlers } from "./db-handlers";

