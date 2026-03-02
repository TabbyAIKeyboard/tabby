export interface ScreenshotUploadResult {
  url: string
  path: string
}

export async function uploadScreenshot(
  imageDataUrl: string,
  userId: string
): Promise<ScreenshotUploadResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const electron = (window as any).electron
  if (!electron?.fileStorage) {
    throw new Error('Electron file storage API not available')
  }

  console.log('[uploadScreenshot] Saving locally for user:', userId)
  const result = await electron.fileStorage.saveScreenshot(imageDataUrl, userId)
  console.log('[uploadScreenshot] Saved at:', result.url)
  return result
}

export async function deleteScreenshot(filePath: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const electron = (window as any).electron
  if (electron?.fileStorage) {
    await electron.fileStorage.deleteFile(filePath)
  }
}

export async function cleanupOldScreenshots(
  userId: string,
  maxAgeHours: number = 24
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const electron = (window as any).electron
  if (electron?.fileStorage) {
    await electron.fileStorage.cleanupOldScreenshots(userId, maxAgeHours)
  }
}

