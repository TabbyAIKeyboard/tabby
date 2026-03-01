import { createSupabaseBrowser } from '@/lib/supabase/client'

const BUCKET_NAME = 'context-captures'

export interface ScreenshotUploadResult {
  url: string
  path: string
}

function base64ToBlob(base64: string): Blob {
  const base64Data = base64.replace(/^data:image\/png;base64,/, '')
  const binaryString = atob(base64Data)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return new Blob([bytes], { type: 'image/png' })
}

async function waitForFileAvailability(
  url: string,
  maxRetries: number = 10,
  initialDelayMs: number = 500
): Promise<boolean> {
  let delay = initialDelayMs
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[waitForFileAvailability] Attempt ${attempt}/${maxRetries}, checking URL...`)
      
      const response = await fetch(url, { method: 'HEAD' })
      
      if (response.ok) {
        console.log(`[waitForFileAvailability] File is available after ${attempt} attempt(s)`)
        return true
      }
      
      console.log(`[waitForFileAvailability] Got status ${response.status}, retrying...`)
    } catch (error) {
      console.log(`[waitForFileAvailability] Fetch error on attempt ${attempt}:`, error)
    }
    
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, delay))
      delay = Math.min(delay * 1.5, 3000)
    }
  }
  
  console.warn('[waitForFileAvailability] File not available after all retries')
  return false
}

export async function uploadScreenshot(
  imageDataUrl: string,
  userId: string
): Promise<ScreenshotUploadResult> {
  const supabase = createSupabaseBrowser()
  const blob = base64ToBlob(imageDataUrl)
  const timestamp = Date.now()
  const uuid = crypto.randomUUID()
  const filename = `${userId}/capture-${timestamp}-${uuid}.png`

  console.log('[uploadScreenshot] Uploading:', filename, 'size:', blob.size, 'bytes')

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filename, blob, {
      contentType: 'image/png',
      upsert: false,
    })

  if (error) {
    console.error('[uploadScreenshot] Upload error:', error)
    throw new Error(`Upload failed: ${error.message}`)
  }

  console.log('[uploadScreenshot] Upload success, path:', data.path)

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path)

  console.log('[uploadScreenshot] Public URL:', publicUrl)

  // Wait for the file to be accessible before returning
  const isAvailable = await waitForFileAvailability(publicUrl)
  if (!isAvailable) {
    throw new Error('File upload succeeded but URL is not accessible after retries')
  }

  return { url: publicUrl, path: data.path }
}

export async function deleteScreenshot(path: string): Promise<void> {
  const supabase = createSupabaseBrowser()
  await supabase.storage.from(BUCKET_NAME).remove([path])
}

export async function cleanupOldScreenshots(
  userId: string,
  maxAgeHours: number = 24
): Promise<void> {
  const supabase = createSupabaseBrowser()
  const cutoffTime = Date.now() - maxAgeHours * 60 * 60 * 1000

  const { data: files } = await supabase.storage.from(BUCKET_NAME).list(userId)
  if (!files) return

  const oldFiles = files.filter((file) => {
    const match = file.name.match(/capture-(\d+)\.png/)
    return match && parseInt(match[1]) < cutoffTime
  })

  if (oldFiles.length > 0) {
    const paths = oldFiles.map((f) => `${userId}/${f.name}`)
    await supabase.storage.from(BUCKET_NAME).remove(paths)
  }
}
