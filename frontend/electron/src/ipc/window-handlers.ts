import { ipcMain, screen, shell } from "electron";
import { AppState } from "../app-state";
import { createBrainPanelWindow } from "../windows/brain-panel-window";
import { createSettingsWindow } from "../windows/settings-window";

export const registerWindowHandlers = (): void => {
  ipcMain.on("toggle-brain-panel", () => {
    if (AppState.brainPanelWindow?.isVisible()) {
      AppState.brainPanelWindow.hide();
    } else {
      const window = createBrainPanelWindow();
      window.show();
    }
  });

  ipcMain.on("set-brain-panel-collapsed", (_, collapsed: boolean) => {
    if (AppState.brainPanelWindow) {
      const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
      if (collapsed) {
        AppState.brainPanelWindow.setBounds({ width: 60, height: 60, x: screenWidth - 80, y: 20 });
      } else {
        AppState.brainPanelWindow.setBounds({ width: 320, height: 400, x: screenWidth - 340, y: 20 });
      }
    }
  });

  ipcMain.on("open-settings", () => {
    createSettingsWindow();
  });

  ipcMain.on("open-external", (_, url: string) => {
    shell.openExternal(url);
  });

  ipcMain.on("close-menu", () => {
    AppState.mainWindow?.hide();
  });

  ipcMain.on("resize-window", (_, { width, height }: { width?: number; height?: number }) => {
    if (!AppState.mainWindow) return;
    const currentBounds = AppState.mainWindow.getBounds();
    AppState.mainWindow.setBounds({
      x: currentBounds.x,
      y: currentBounds.y,
      width: width ?? currentBounds.width,
      height: height ?? currentBounds.height,
    });
  });

  ipcMain.on("move-window", (_, { x, y }: { x: number; y: number }) => {
    if (!AppState.mainWindow) return;
    const currentBounds = AppState.mainWindow.getBounds();
    AppState.mainWindow.setBounds({
      x: currentBounds.x + x,
      y: currentBounds.y + y,
      width: currentBounds.width,
      height: currentBounds.height,
    });
  });

  ipcMain.on("ping", () => console.log("pong"));
};
