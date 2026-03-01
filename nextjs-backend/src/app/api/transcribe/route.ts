import { experimental_transcribe as transcribe } from 'ai'
import { createGroq } from '@ai-sdk/groq'

export async function POST(req: Request) {
  try {
    const { audio } = await req.json()

    if (!audio) {
      return Response.json({ error: 'No audio data provided' }, { status: 400 })
    }

    // Parse data URL to extract base64 and mime type
    // Format: "data:audio/webm;base64,XXXXX"
    let audioData: Uint8Array

    if (audio.startsWith('data:')) {
      // Extract the base64 part from data URL
      const [header, base64Data] = audio.split(',')
      const mimeType = header.match(/data:([^;]+)/)?.[1] || 'audio/webm'
      console.log('[Transcribe API] Audio format:', mimeType, 'Base64 length:', base64Data?.length)

      // Convert base64 to Uint8Array
      const binaryString = atob(base64Data)
      audioData = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        audioData[i] = binaryString.charCodeAt(i)
      }
    } else {
      // Already base64, convert directly
      const binaryString = atob(audio)
      audioData = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        audioData[i] = binaryString.charCodeAt(i)
      }
    }

    console.log('[Transcribe API] Audio bytes:', audioData.length)

    const groq = createGroq({
      apiKey: process.env.GROQ_API_KEY,
    })

    const result = await transcribe({
      model: groq.transcription('whisper-large-v3'),
      audio: audioData,
    })

    console.log('[Transcribe API] Result:', result.text?.slice(0, 50))

    return Response.json({
      text: result.text,
      language: result.language,
      duration: result.durationInSeconds,
    })
  } catch (error) {
    console.error('Transcription error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Transcription failed' },
      { status: 500 }
    )
  }
}
