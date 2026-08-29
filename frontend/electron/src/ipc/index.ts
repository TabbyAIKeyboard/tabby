import { registerAuthHandlers } from './auth-handlers'
import { registerTextHandlers } from './text-handlers'
import { registerSettingsHandlers } from './settings-handlers'
import { registerWindowHandlers } from './window-handlers'
import { registerCaptureHandlers } from './capture-handlers'
import { registerOnboardingHandlers } from './onboarding-handlers'
import { registerDbHandlers } from './db-handlers'
import { registerFileStorageHandlers } from '../services/local-file-storage'

export const registerAllIpcHandlers = (): void => {
  registerAuthHandlers()
  registerTextHandlers()
  registerSettingsHandlers()
  registerWindowHandlers()
  registerCaptureHandlers()
  registerOnboardingHandlers()
  registerDbHandlers()
  registerFileStorageHandlers()
}

export { registerAuthHandlers } from './auth-handlers'
export { registerTextHandlers } from './text-handlers'
export { registerSettingsHandlers } from './settings-handlers'
export { registerWindowHandlers } from './window-handlers'
export { registerCaptureHandlers } from './capture-handlers'
export { registerOnboardingHandlers } from './onboarding-handlers'
export { registerDbHandlers } from './db-handlers'
