import { ipcMain, app } from "electron";
import path from "path";
import fs from "fs";

const ATTACHMENTS_DIR = "attachments";

function getAttachmentsDir(): string {
  const dir = path.join(app.getPath("userData"), ATTACHMENTS_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Save a base64 data URL (image/png) to local filesystem.
 * Returns the local file:// URL.
 */
export function saveScreenshotLocally(
  imageDataUrl: string,
  userId: string
): { url: string; path: string } {
  const dir = getAttachmentsDir();
  const userDir = path.join(dir, userId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  const timestamp = Date.now();
  const uuid = crypto.randomUUID();
  const filename = `capture-${timestamp}-${uuid}.png`;
  const filePath = path.join(userDir, filename);

  // Strip data URL prefix
  const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, "");
  fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));

  const fileUrl = `file://${filePath.replace(/\\/g, "/")}`;
  return { url: fileUrl, path: filePath };
}

/**
 * Save an arbitrary file (chat attachment) to local filesystem.
 * Returns file metadata compatible with FileUIPart.
 */
export function saveChatAttachmentLocally(
  projectId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): { url: string; filename: string; mediaType: string } {
  const dir = getAttachmentsDir();
  const projectDir = path.join(dir, projectId, "chat-attachments");
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  const uuid = crypto.randomUUID();
  const safeFileName = `${uuid}-${fileName}`;
  const filePath = path.join(projectDir, safeFileName);

  fs.writeFileSync(filePath, fileBuffer);

  const fileUrl = `file://${filePath.replace(/\\/g, "/")}`;
  return { url: fileUrl, filename: fileName, mediaType: mimeType };
}

/**
 * Delete a file from local filesystem.
 */
export function deleteLocalFile(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * Clean up old screenshots older than maxAgeHours.
 */
export function cleanupOldScreenshots(
  userId: string,
  maxAgeHours: number = 24
): void {
  const dir = path.join(getAttachmentsDir(), userId);
  if (!fs.existsSync(dir)) return;

  const cutoffTime = Date.now() - maxAgeHours * 60 * 60 * 1000;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const match = file.match(/capture-(\d+)/);
    if (match && parseInt(match[1]) < cutoffTime) {
      const filePath = path.join(dir, file);
      fs.unlinkSync(filePath);
    }
  }
}

export function registerFileStorageHandlers(): void {
  ipcMain.handle(
    "fileStorage:saveScreenshot",
    (_event, imageDataUrl: string, userId: string) => {
      return saveScreenshotLocally(imageDataUrl, userId);
    }
  );

  ipcMain.handle(
    "fileStorage:saveChatAttachment",
    (
      _event,
      projectId: string,
      fileBuffer: Buffer,
      fileName: string,
      mimeType: string
    ) => {
      return saveChatAttachmentLocally(
        projectId,
        fileBuffer,
        fileName,
        mimeType
      );
    }
  );

  ipcMain.handle("fileStorage:deleteFile", (_event, filePath: string) => {
    deleteLocalFile(filePath);
  });

  ipcMain.handle(
    "fileStorage:cleanupOldScreenshots",
    (_event, userId: string, maxAgeHours?: number) => {
      cleanupOldScreenshots(userId, maxAgeHours);
    }
  );

  console.log("[IPC] File storage handlers registered");
}
