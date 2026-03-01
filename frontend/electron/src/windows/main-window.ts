import { is } from "@electron-toolkit/utils";
import { app, BrowserWindow } from "electron";
import { readFileSync } from "fs";
import { getPort } from "get-port-please";
import { startServer } from "next/dist/server/lib/start-server";
import { join } from "path";
import { AppState } from "../app-state";

export const getOrStartNextJSServer = async (): Promise<number> => {
  if (AppState.nextJSPort) return AppState.nextJSPort;

  try {
    AppState.nextJSPort = await getPort({ portRange: [30_011, 50_000] });
    const webDir = join(app.getAppPath(), "app");

    const configFilePath = join(webDir, ".next", "required-server-files.json");
    const configFile = JSON.parse(readFileSync(configFilePath, "utf-8"));
    const nextConfig = configFile.config;
    process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig);

    await startServer({
      dir: webDir,
      isDev: false,
      hostname: "localhost",
      port: AppState.nextJSPort,
      customServer: true,
      allowRetry: false,
      keepAliveTimeout: 5000,
      minimalMode: true,
    });

    return AppState.nextJSPort;
  } catch (error) {
    console.error("Error starting Next.js server:", error);
    throw error;
  }
};

export const createMainWindow = (): BrowserWindow => {
  AppState.mainWindow = new BrowserWindow({
    width: 600,
    height: 700,
    minWidth: 400,
    minHeight: 400,
    maxWidth: 800,
    maxHeight: 800,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    show: false,
    focusable: true,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      nodeIntegration: true,
    },
  });

  // Make window invisible to screen recorders/sharing (uses WDA_EXCLUDEFROMCAPTURE on Windows)
  AppState.mainWindow.setContentProtection(true);

  const loadURL = async () => {
    if (is.dev) {
      AppState.mainWindow?.loadURL("http://localhost:3000");
    } else {
      try {
        const port = await getOrStartNextJSServer();
        console.log("Next.js server started on port:", port);
        AppState.mainWindow?.loadURL(`http://localhost:${port}`);
      } catch (error) {
        console.error("Error starting Next.js server:", error);
      }
    }
  };

  loadURL();
  return AppState.mainWindow;
};
