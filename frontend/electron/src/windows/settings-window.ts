import { is } from "@electron-toolkit/utils";
import { BrowserWindow, screen } from "electron";
import { join } from "path";
import { AppState } from "../app-state";
import { getOrStartNextJSServer } from "./main-window";

export const createSettingsWindow = (initialRoute: string = "/settings"): BrowserWindow => {
  if (AppState.settingsWindow) {
    AppState.settingsWindow.focus();
    return AppState.settingsWindow;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const windowWidth = Math.round(screenWidth * 0.7);
  const windowHeight = Math.round(screenHeight * 0.8);

  const x = Math.round((screenWidth - windowWidth) / 2);
  const y = Math.round((screenHeight - windowHeight) / 2);

  AppState.settingsWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: Math.round(screenWidth * 0.4),
    minHeight: Math.round(screenHeight * 0.5),
    x,
    y,
    frame: true,
    autoHideMenuBar: true,
    resizable: true,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      nodeIntegration: true,
    },
  });

  // Make window invisible to screen recorders/sharing (uses WDA_EXCLUDEFROMCAPTURE on Windows)
  AppState.settingsWindow.setContentProtection(true);

  if (is.dev) {
    AppState.settingsWindow.loadURL(`http://localhost:3000${initialRoute}`);
  } else {
    getOrStartNextJSServer().then((port) => {
      AppState.settingsWindow?.loadURL(`http://localhost:${port}${initialRoute}`);
    });
  }

  AppState.settingsWindow.on("closed", () => {
    AppState.settingsWindow = null;
  });

  return AppState.settingsWindow;
};
