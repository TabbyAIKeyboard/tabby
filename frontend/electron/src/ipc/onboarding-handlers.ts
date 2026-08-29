import { ipcMain } from 'electron'
import { isOnboardingComplete, setOnboardingComplete } from '../services/local-auth'
import { broadcastAuthChanged } from './auth-handlers'

export const registerOnboardingHandlers = (): void => {
  // Onboarding is tracked per local user, not per machine.
  ipcMain.handle('get-onboarding-complete', () => isOnboardingComplete())

  // invoke (not send) so the renderer can await it before navigating.
  ipcMain.handle('set-onboarding-complete', (_, complete: boolean) => {
    setOnboardingComplete(complete)
    broadcastAuthChanged()
  })
}
