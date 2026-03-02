import type { FileUIPart } from 'ai'

export async function uploadChatAttachment(projectId: string, file: File): Promise<FileUIPart> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const electron = (window as any).electron
  if (!electron?.fileStorage) {
    throw new Error('Electron file storage API not available')
  }

  // Convert File to ArrayBuffer then to Buffer-compatible format
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const result = await electron.fileStorage.saveChatAttachment(
    projectId,
    buffer,
    file.name,
    file.type
  )

  return {
    type: 'file',
    url: result.url,
    filename: result.filename,
    mediaType: result.mediaType,
  }
}

export async function uploadChatAttachments(
  projectId: string,
  files: File[]
): Promise<FileUIPart[]> {
  return Promise.all(files.map((file) => uploadChatAttachment(projectId, file)))
}

