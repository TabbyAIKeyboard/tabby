import { is } from "@electron-toolkit/utils";
import { BrowserWindow, screen } from "electron";
import { join } from "path";
import { AppState } from "../app-state";
import { getOrStartNextJSServer } from "./main-window";

export const createSuggestionWindow = (initialContext: string): BrowserWindow => {
  if (AppState.suggestionWindow && !AppState.suggestionWindow.isDestroyed()) {
    return AppState.suggestionWindow;
  }

  const cursorPoint = screen.getCursorScreenPoint();

  AppState.suggestionWindow = new BrowserWindow({
    width: 420,
    height: 150,
    maxHeight: 300,
    x: cursorPoint.x + 10,
    y: cursorPoint.y + 10,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    movable: true,
    show: false,
    focusable: true,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      nodeIntegration: true,
    },
  });

  // Make window invisible to screen recorders/sharing (uses WDA_EXCLUDEFROMCAPTURE on Windows)
  AppState.suggestionWindow.setContentProtection(true);

  if (is.dev) {
    AppState.suggestionWindow.loadURL("http://localhost:3000/suggestion");
  } else {
    getOrStartNextJSServer().then((port) => {
      AppState.suggestionWindow?.loadURL(`http://localhost:${port}/suggestion`);
    });
  }

  AppState.suggestionWindow.on("closed", () => {
    AppState.suggestionWindow = null;
  });

  return AppState.suggestionWindow;
};

export const showSuggestionForContext = async (context: string): Promise<void> => {
  const window = createSuggestionWindow(context);

  const cursorPoint = screen.getCursorScreenPoint();
  window.setPosition(cursorPoint.x + 10, cursorPoint.y + 10);

  if (!window.webContents.isLoading()) {
    window.webContents.send("show-suggestion", { context });
    window.show();
  } else {
    window.webContents.once("did-finish-load", async () => {
      await new Promise((r) => setTimeout(r, 100));
      window.webContents.send("show-suggestion", { context });
      window.show();
    });
  }
};
