import { BrowserWindow, ipcMain } from 'electron'
import {
  changePassword,
  getCurrentUser,
  hasAnyUser,
  registerUser,
  signInUser,
  signOutUser,
  updateDisplayName,
  type AuthResult,
} from '../services/local-auth'

/**
 * Every window keeps its own copy of the user in React Query, so a signin in
 * the settings window has to tell the others to refetch.
 */
export const broadcastAuthChanged = (): void => {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send('auth-changed')
    }
  }
}

export const registerAuthHandlers = (): void => {
  ipcMain.handle(
    'auth:register',
    (_event, data: { email: string; password: string; displayName?: string }): AuthResult => {
      const result = registerUser(data.email, data.password, data.displayName)
      if (result.ok) broadcastAuthChanged()
      return result
    }
  )

  ipcMain.handle(
    'auth:signin',
    (_event, data: { email: string; password: string }): AuthResult => {
      const result = signInUser(data.email, data.password)
      if (result.ok) broadcastAuthChanged()
      return result
    }
  )

  ipcMain.handle('auth:signout', () => {
    signOutUser()
    broadcastAuthChanged()
  })

  ipcMain.handle('auth:get-current-user', () => getCurrentUser())

  ipcMain.handle('auth:has-any-user', () => hasAnyUser())

  ipcMain.handle('auth:update-display-name', (_event, displayName: string) => {
    const result = updateDisplayName(displayName)
    if (result.ok) broadcastAuthChanged()
    return result
  })

  ipcMain.handle(
    'auth:change-password',
    (_event, data: { currentPassword: string; newPassword: string }) =>
      changePassword(data.currentPassword, data.newPassword)
  )
}
