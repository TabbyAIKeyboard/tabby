import { clipboard, ipcMain } from "electron";
import { AppState } from "../app-state";
import { sendTextToLastWindow } from "../services";

export const registerTextHandlers = (): void => {
  ipcMain.on("replace-text", async (_, text: string) => {
    try {
      console.log("Replace text requested:", text.slice(0, 50));
      AppState.mainWindow?.hide();

      AppState.isInternalClipboardOp = true;
      await new Promise((r) => setTimeout(r, 100));
      await sendTextToLastWindow(text, AppState.textOutputMode);
      AppState.lastClipboardContent = clipboard.readText();
      AppState.isInternalClipboardOp = false;

      console.log("Paste completed");
    } catch (error) {
      AppState.isInternalClipboardOp = false;
      console.error("Error replacing text:", error);
    }
  });

  ipcMain.on("accept-suggestion", async (_, text: string) => {
    try {
      console.log("Accept suggestion:", text.slice(0, 50));
      AppState.suggestionWindow?.hide();

      AppState.isInternalClipboardOp = true;
      await new Promise((r) => setTimeout(r, 100));
      await sendTextToLastWindow(text, AppState.textOutputMode);
      AppState.lastClipboardContent = clipboard.readText();
      AppState.isInternalClipboardOp = false;

      console.log("Suggestion pasted");
    } catch (error) {
      AppState.isInternalClipboardOp = false;
      console.error("Error accepting suggestion:", error);
    }
  });

  ipcMain.on("dismiss-suggestion", () => {
    AppState.suggestionWindow?.hide();
  });
};
