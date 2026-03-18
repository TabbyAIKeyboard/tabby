import { Menu, nativeImage, Tray } from 'electron'
import { join } from 'path'
import { AppState } from '../app-state'
import { createBrainPanelWindow } from '../windows/brain-panel-window'
import { createSettingsWindow } from '../windows/settings-window'
import { app } from 'electron'

export const createTray = (): Tray => {
  const iconPath = join(
    __dirname,
    '..',
    'public',
    'icons',
    process.platform === 'win32' ? 'icon.ico' : 'icon.png'
  )
  const trayIcon = nativeImage.createFromPath(iconPath)

  AppState.tray = new Tray(trayIcon)
  AppState.tray.setToolTip('Tabby')

  updateTrayMenu()

  AppState.tray.on('click', () => {
    if (AppState.mainWindow) {
      if (AppState.mainWindow.isVisible()) {
        AppState.mainWindow.hide()
      } else {
        AppState.mainWindow.show()
        AppState.mainWindow.focus()
      }
    }
  })

  return AppState.tray
}

export const updateTrayMenu = (): void => {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Actions Menu',
      click: () => {
        if (AppState.mainWindow) {
          AppState.mainWindow.show()
          AppState.mainWindow.focus()
        }
      },
    },
    {
      label: 'Brain Panel',
      click: () => {
        if (!AppState.brainPanelWindow || AppState.brainPanelWindow.isDestroyed()) {
          const window = createBrainPanelWindow()
          window.show()
        } else if (AppState.brainPanelWindow.isVisible()) {
          AppState.brainPanelWindow.focus()
        } else {
          AppState.brainPanelWindow.show()
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        createSettingsWindow()
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      },
    },
  ])
  AppState.tray?.setContextMenu(contextMenu)
}

export const destroyTray = (): void => {
  AppState.tray?.destroy()
  AppState.tray = null
}
