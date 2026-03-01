import { desktopCapturer, ipcMain } from "electron";

export const registerCaptureHandlers = (): void => {
  ipcMain.handle("capture-screen", async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 1280, height: 720 },
      });

      if (sources.length === 0) {
        console.log("[IPC] No screen sources found");
        return null;
      }

      return sources[0].thumbnail.toDataURL();
    } catch (error) {
      console.error("[IPC] Screenshot capture failed:", error);
      return null;
    }
  });
};
