import { NextResponse } from 'next/server'
import { generateText, UIMessage } from 'ai'
import { myProvider } from '@/lib/ai'
import { getTitleGenerationModel } from '@/lib/ai/provider'

// POST /api/generate-title - Generate a title from user message
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message, model } = body as { message: UIMessage; model: string }

    if (!message) {
      return NextResponse.json({ data: 'New Chat' })
    }

    const textPart = message.parts?.find((p) => p.type === 'text')
    const text = textPart?.type === 'text' ? textPart.text : ''

    if (!text) {
      return NextResponse.json({ data: 'New Chat' })
    }

    const { text: title } = await generateText({
      model: myProvider.languageModel(getTitleGenerationModel(model)),
      system: `Generate a very short title (max 5 words) for this chat based on the user's first message. 
               Return ONLY the title, no quotes or punctuation.`,
      prompt: text.slice(0, 500),
    })

    return NextResponse.json({ data: title.trim() || 'New Chat' })
  } catch (error) {
    console.error('Error generating title:', error)
    return NextResponse.json({ data: 'New Chat' })
  }
}
