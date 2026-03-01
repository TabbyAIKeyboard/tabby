import { experimental_generateSpeech as generateSpeech } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(req: Request) {
  try {
    const { text, voice = 'alloy' } = await req.json()

    if (!text) {
      return Response.json({ error: 'No text provided' }, { status: 400 })
    }

    const result = await generateSpeech({
      model: openai.speech('tts-1'),
      text,
      voice,
    })

    const dataUrl = `data:audio/${result.audio.format};base64,${result.audio.base64}`

    return Response.json({ audio: dataUrl })
  } catch (error) {
    console.error('Speech generation error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Speech generation failed' },
      { status: 500 }
    )
  }
}
