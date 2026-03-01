import { is } from "@electron-toolkit/utils";
import { BrowserWindow, screen } from "electron";
import { join } from "path";
import { AppState } from "../app-state";
import { getOrStartNextJSServer } from "./main-window";

export const createBrainPanelWindow = (): BrowserWindow => {
  if (AppState.brainPanelWindow && !AppState.brainPanelWindow.isDestroyed()) {
    return AppState.brainPanelWindow;
  }

  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;

  AppState.brainPanelWindow = new BrowserWindow({
    width: 320,
    height: 400,
    x: screenWidth - 340,
    y: 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    show: false,
    focusable: true,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      nodeIntegration: true,
    },
  });

  // Make window invisible to screen recorders/sharing (uses WDA_EXCLUDEFROMCAPTURE on Windows)
  AppState.brainPanelWindow.setContentProtection(true);

  if (is.dev) {
    AppState.brainPanelWindow.loadURL("http://localhost:3000/brain-panel");
  } else {
    getOrStartNextJSServer().then((port) => {
      AppState.brainPanelWindow?.loadURL(`http://localhost:${port}/brain-panel`);
    });
  }

  AppState.brainPanelWindow.webContents.once("did-finish-load", () => {
    AppState.contextCaptureService?.setRendererWindow(AppState.brainPanelWindow!);
  });

  AppState.brainPanelWindow.on("closed", () => {
    AppState.brainPanelWindow = null;
  });

  return AppState.brainPanelWindow;
};
